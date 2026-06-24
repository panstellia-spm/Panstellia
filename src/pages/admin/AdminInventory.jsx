import { useState, useEffect, useMemo } from 'react';
import {
  Warehouse, DollarSign, TrendingUp, AlertTriangle, CheckCircle2,
  XCircle, RefreshCw, Download, Upload, Search, Edit2, Check, X,
  SlidersHorizontal, FileText, ArrowRight, Activity, Percent, Calendar
} from 'lucide-react';
import { db } from '../../services/firebase';
import {
  collection, doc, onSnapshot, runTransaction, writeBatch, query, orderBy, limit, getDocs
} from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { triggerRestockNotifications } from '../../services/restockNotifications';
import { getCategoryLabel } from '../../utils/categoryLabels';
import { getDirectImageUrl } from '../../utils/imageUtils';
import { toast } from 'react-toastify';
import Papa from 'papaparse';


// Luxury Gold Palette matching Panstellia branding
const COLORS = ['#d4af37', '#aa7c11', '#db912d', '#f3e5ab', '#8a7322', '#c5a059'];

export default function AdminInventory() {
  const { isAdmin, user } = useAuth();
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Tab State: 'dashboard', 'controller', 'bulk', 'logs'
  const [activeTab, setActiveTab] = useState('dashboard');

  // Stock Controller Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [metalFilter, setMetalFilter] = useState('All');
  const [stoneFilter, setStoneFilter] = useState('All');
  const [selectedIds, setSelectedIds] = useState([]);

  // Inline Editing State
  const [editingId, setEditingId] = useState(null);
  const [editStockVal, setEditStockVal] = useState(0);
  const [editReason, setEditReason] = useState('Restock');

  // CSV Import State
  const [csvData, setCsvData] = useState([]);
  const [importErrors, setImportErrors] = useState([]);

  // 1. Real-time Firestore Sync (Products, Orders, Logs)
  useEffect(() => {
    if (!isAdmin) return;

    // Realtime Products
    const unsubscribeProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      const prods = snapshot.docs.map(doc => {
        const p = doc.data();
        const stockQuantity = Number(p.stockQuantity ?? 0);
        const reservedQuantity = Number(p.reservedQuantity ?? 0);
        const availableQuantity = stockQuantity - reservedQuantity;
        const reorderThreshold = Number(p.reorderThreshold ?? 5);
        const price = Number(p.price ?? 0);

        let inventoryStatus = 'in_stock';
        if (stockQuantity <= 0) {
          inventoryStatus = 'out_of_stock';
        } else if (stockQuantity <= reorderThreshold) {
          inventoryStatus = 'low_stock';
        }

        return {
          id: doc.id,
          ...p,
          stockQuantity,
          reservedQuantity,
          availableQuantity,
          reorderThreshold,
          reorderQuantity: Number(p.reorderQuantity ?? 10),
          inventoryStatus,
          inventoryValue: price * stockQuantity,
          skuCode: p.skuCode || '',
          serialNumber: p.serialNumber || '',
          metalType: p.metalType || p.category || '',
          stoneType: p.stoneType || p.primaryStone || '',
          weight: p.weight || '',
          certificationNumber: p.certificationNumber || '',
          collectionName: p.collectionName || '',
        };
      });
      setProducts(prods);
      setLoading(false);
    }, (error) => {
      console.error("Products sync error: ", error);
      toast.error("Failed to sync products in real time");
    });

    // Realtime Orders (last 300 for sales velocity & forecasting)
    const unsubscribeOrders = onSnapshot(collection(db, 'orders'), (snapshot) => {
      const ords = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setOrders(ords);
    });

    // Realtime Inventory Logs (last 100 for Audit Logs tab)
    const qLogs = query(collection(db, 'inventory_logs'), orderBy('timestamp', 'desc'), limit(100));
    const unsubscribeLogs = onSnapshot(qLogs, (snapshot) => {
      const lgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setLogs(lgs);
    });

    return () => {
      unsubscribeProducts();
      unsubscribeOrders();
      unsubscribeLogs();
    };
  }, [isAdmin]);

  // Derived Filter Options
  const categories = useMemo(() => ['All', ...new Set(products.map(p => p.category).filter(Boolean))], [products]);
  const metals = useMemo(() => ['All', ...new Set(products.map(p => p.metalType).filter(Boolean))], [products]);
  const stones = useMemo(() => ['All', ...new Set(products.map(p => p.stoneType).filter(Boolean))], [products]);

  // 2. Dashboard KPIs & Calculations
  const stats = useMemo(() => {
    let totalValue = 0;
    let totalItems = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    products.forEach(p => {
      totalValue += p.inventoryValue || 0;
      totalItems += p.stockQuantity || 0;
      if (p.stockQuantity <= 0) {
        outOfStockCount++;
      } else if (p.stockQuantity <= p.reorderThreshold) {
        lowStockCount++;
      }
    });

    // Inventory Health Score
    // Penalty based on Out of Stock and Low Stock percentages
    let healthScore = 100;
    if (products.length > 0) {
      const oosPenalty = (outOfStockCount / products.length) * 30;
      const lowPenalty = (lowStockCount / products.length) * 15;
      healthScore = Math.max(0, Math.round(100 - (oosPenalty + lowPenalty)));
    }

    return {
      totalValue,
      totalItems,
      lowStockCount,
      outOfStockCount,
      healthScore
    };
  }, [products]);

  // 3. Reorder Recommendations Engine (Phase 12)
  const reorderSuggestions = useMemo(() => {
    const salesMap = {};
    orders.forEach(o => {
      const status = (o.status || '').toLowerCase();
      if (status !== 'cancelled' && Array.isArray(o.items)) {
        o.items.forEach(item => {
          salesMap[item.id] = (salesMap[item.id] || 0) + Number(item.quantity || 1);
        });
      }
    });

    return products
      .filter(p => p.stockQuantity <= p.reorderThreshold)
      .map(p => {
        const sold = salesMap[p.id] || 0;
        const dailyVelocity = sold / 30; // units sold per day
        const recommended = Math.max(p.reorderQuantity || 10, Math.round(dailyVelocity * 30 * 1.5));
        return {
          id: p.id,
          name: p.name,
          skuCode: p.skuCode || 'N/A',
          stockQuantity: p.stockQuantity,
          reorderThreshold: p.reorderThreshold,
          recommendedReorder: recommended,
          reason: sold > 0 ? `${sold} units sold in last 30 days` : 'Restock default threshold reached',
        };
      });
  }, [products, orders]);

  // 4. Demand Forecasting Engine (Phase 13)
  const stockForecasts = useMemo(() => {
    const salesMap = {};
    orders.forEach(o => {
      const status = (o.status || '').toLowerCase();
      if (status !== 'cancelled' && Array.isArray(o.items)) {
        o.items.forEach(item => {
          salesMap[item.id] = (salesMap[item.id] || 0) + Number(item.quantity || 1);
        });
      }
    });

    return products
      .map(p => {
        const sold = salesMap[p.id] || 0;
        const dailyVelocity = sold / 30;
        if (dailyVelocity <= 0) return null;

        const daysToOOS = p.stockQuantity / dailyVelocity;
        if (daysToOOS > 90) return null; // Only show shortages predicted within 90 days

        const shortageDate = new Date();
        shortageDate.setDate(shortageDate.getDate() + Math.ceil(daysToOOS));

        return {
          id: p.id,
          name: p.name,
          skuCode: p.skuCode || 'N/A',
          stockQuantity: p.stockQuantity,
          dailyVelocity: dailyVelocity.toFixed(2),
          daysToOOS: Math.ceil(daysToOOS),
          shortageDate: shortageDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
          risk: daysToOOS <= 7 ? 'Critical' : daysToOOS <= 14 ? 'High' : 'Medium',
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.daysToOOS - b.daysToOOS);
  }, [products, orders]);

  // 5. Fast & Slow Moving Products
  const performanceAnalysis = useMemo(() => {
    const salesMap = {};
    orders.forEach(o => {
      const status = (o.status || '').toLowerCase();
      if (status !== 'cancelled' && Array.isArray(o.items)) {
        o.items.forEach(item => {
          salesMap[item.id] = (salesMap[item.id] || 0) + Number(item.quantity || 1);
        });
      }
    });

    const productsWithSales = products.map(p => ({
      ...p,
      salesCount: salesMap[p.id] || 0,
      turnoverRate: p.stockQuantity > 0 ? (salesMap[p.id] || 0) / p.stockQuantity : 0
    }));

    const fastMoving = [...productsWithSales]
      .filter(p => p.salesCount > 0)
      .sort((a, b) => b.salesCount - a.salesCount)
      .slice(0, 5);

    const slowMoving = [...productsWithSales]
      .filter(p => p.stockQuantity > 0)
      .sort((a, b) => a.salesCount - b.salesCount || b.stockQuantity - a.stockQuantity)
      .slice(0, 5);

    return { fastMoving, slowMoving };
  }, [products, orders]);

  // 6. Chart Visualizations Data
  const chartsData = useMemo(() => {
    // Collection distribution
    const collections = {};
    products.forEach(p => {
      const cat = p.category || 'Other';
      collections[cat] = (collections[cat] || 0) + p.stockQuantity;
    });
    const pieData = Object.entries(collections).map(([name, value]) => ({ name, value }));

    // Value by collection
    const collectionValues = {};
    products.forEach(p => {
      const cat = p.category || 'Other';
      collectionValues[cat] = (collectionValues[cat] || 0) + p.inventoryValue;
    });
    const barData = Object.entries(collectionValues).map(([name, value]) => ({ name, value }));

    return { pieData, barData };
  }, [products]);

  // 7. Filtered Products for Controller Table
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesSearch =
          p.name.toLowerCase().includes(q) ||
          p.skuCode.toLowerCase().includes(q) ||
          p.serialNumber.toLowerCase().includes(q) ||
          p.certificationNumber.toLowerCase().includes(q);
        if (!matchesSearch) return false;
      }

      if (statusFilter !== 'All') {
        if (statusFilter === 'In Stock' && p.inventoryStatus === 'out_of_stock') return false;
        if (statusFilter === 'Low Stock' && p.inventoryStatus !== 'low_stock') return false;
        if (statusFilter === 'Out of Stock' && p.inventoryStatus !== 'out_of_stock') return false;
      }

      if (categoryFilter !== 'All' && p.category !== categoryFilter) return false;
      if (metalFilter !== 'All' && p.metalType !== metalFilter) return false;
      if (stoneFilter !== 'All' && p.stoneType !== stoneFilter) return false;

      return true;
    });
  }, [products, searchQuery, statusFilter, categoryFilter, metalFilter, stoneFilter]);

  // 8. Stock Controller Actions (Single edit & Bulk edits)
  const startEdit = (p) => {
    setEditingId(p.id);
    setEditStockVal(p.stockQuantity);
    setEditReason('Restock');
  };

  const handleInlineSave = async (pId) => {
    const targetVal = Number(editStockVal);
    if (isNaN(targetVal) || targetVal < 0) {
      toast.error("Invalid stock quantity");
      return;
    }

    try {
      let oldStockVal = 0;
      let productData = null;
      await runTransaction(db, async (transaction) => {
        const prodRef = doc(db, 'products', pId);
        const prodSnap = await transaction.get(prodRef);
        if (!prodSnap.exists()) throw new Error("Product not found");

        const data = prodSnap.data();
        oldStockVal = Number(data.stockQuantity ?? 0);
        productData = data;
        const oldStock = oldStockVal;
        const diff = targetVal - oldStock;
        
        const reservedQuantity = Number(data.reservedQuantity ?? 0);
        const availableQuantity = targetVal - reservedQuantity;

        let inventoryStatus = 'in_stock';
        if (targetVal <= 0) {
          inventoryStatus = 'out_of_stock';
        } else if (targetVal <= Number(data.reorderThreshold ?? 5)) {
          inventoryStatus = 'low_stock';
        }

        // Update product
        transaction.update(prodRef, {
          stockQuantity: targetVal,
          availableQuantity,
          inventoryStatus,
          lastStockUpdate: new Date().toISOString(),
          stockUpdatedBy: user?.displayName || user?.email || 'Admin',
        });

        // Write inventory activity log
        const logRef = doc(collection(db, 'inventory_logs'));
        transaction.set(logRef, {
          productId: pId,
          productName: data.name,
          skuCode: data.skuCode || '',
          action: diff > 0 ? 'Stock Increase' : 'Stock Decrease',
          change: diff,
          previousValue: oldStock,
          newValue: targetVal,
          adminId: user.uid,
          adminName: user.displayName || user.email || 'Admin',
          timestamp: new Date().toISOString(),
          reason: editReason,
        });
      });

      if (oldStockVal <= 0 && targetVal > 0 && productData) {
        triggerRestockNotifications(pId, { ...productData, stockQuantity: targetVal }).catch(err => {
          console.error("Failed to trigger restock notifications:", err);
        });
      }

      toast.success("Stock level updated successfully");
      setEditingId(null);
    } catch (err) {
      console.error(err);
      toast.error("Failed to update stock");
    }
  };

  const handleBulkStatusChange = async (newStatus) => {
    if (selectedIds.length === 0) return;
    try {
      const batch = writeBatch(db);
      selectedIds.forEach(id => {
        const prodRef = doc(db, 'products', id);
        batch.update(prodRef, {
          productStatus: newStatus,
          inStock: newStatus === 'available',
          updatedAt: new Date().toISOString(),
        });
      });
      await batch.commit();
      toast.success(`Updated status for ${selectedIds.length} products`);
      setSelectedIds([]);
    } catch {
      toast.error("Failed bulk status update");
    }
  };

  const handleOneClickReorder = async (pId, suggestedQty) => {
    try {
      let oldStockVal = 0;
      let targetVal = 0;
      let productData = null;
      await runTransaction(db, async (transaction) => {
        const prodRef = doc(db, 'products', pId);
        const prodSnap = await transaction.get(prodRef);
        if (!prodSnap.exists()) throw new Error("Product not found");

        const data = prodSnap.data();
        oldStockVal = Number(data.stockQuantity ?? 0);
        targetVal = oldStockVal + suggestedQty;
        productData = data;
        const oldStock = oldStockVal;
        const reservedQuantity = Number(data.reservedQuantity ?? 0);
        const availableQuantity = targetVal - reservedQuantity;

        let inventoryStatus = 'in_stock';
        if (targetVal <= 0) {
          inventoryStatus = 'out_of_stock';
        } else if (targetVal <= Number(data.reorderThreshold ?? 5)) {
          inventoryStatus = 'low_stock';
        }

        transaction.update(prodRef, {
          stockQuantity: targetVal,
          availableQuantity,
          inventoryStatus,
          lastStockUpdate: new Date().toISOString(),
          stockUpdatedBy: user?.displayName || user?.email || 'Admin',
        });

        // Audit Log
        const logRef = doc(collection(db, 'inventory_logs'));
        transaction.set(logRef, {
          productId: pId,
          productName: data.name,
          skuCode: data.skuCode || '',
          action: 'Stock Increase',
          change: suggestedQty,
          previousValue: oldStock,
          newValue: targetVal,
          adminId: user.uid,
          adminName: user.displayName || user.email || 'Admin',
          timestamp: new Date().toISOString(),
          reason: 'Reorder Fulfillment',
        });
      });
      
      if (oldStockVal <= 0 && targetVal > 0 && productData) {
        triggerRestockNotifications(pId, { ...productData, stockQuantity: targetVal }).catch(err => {
          console.error("Failed to trigger restock notifications:", err);
        });
      }

      toast.success("Replenished stock successfully");
    } catch {
      toast.error("Failed to fulfill reorder");
    }
  };

  // 9. CSV Bulk Import/Export
  const handleCSVImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportErrors([]);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data;
        const batch = writeBatch(db);
        const errors = [];
        const restockedProducts = [];
        let successCount = 0;

        // Perform validations and queue updates
        for (let idx = 0; idx < rows.length; idx++) {
          const row = rows[idx];
          const identifier = row.skuCode || row.id;
          const newQty = parseInt(row.stockQuantity, 10);
          const threshold = row.reorderThreshold ? parseInt(row.reorderThreshold, 10) : 5;

          if (!identifier) {
            errors.push(`Row ${idx + 1}: Missing product SKU or ID`);
            continue;
          }
          if (isNaN(newQty) || newQty < 0) {
            errors.push(`Row ${idx + 1} (${identifier}): Invalid stock quantity`);
            continue;
          }

          // Search product matching SKU or ID
          const match = products.find(p => p.skuCode === identifier || p.id === identifier);
          if (!match) {
            errors.push(`Row ${idx + 1} (${identifier}): Product not found in catalog`);
            continue;
          }

          if (match.stockQuantity <= 0 && newQty > 0) {
            restockedProducts.push({
              id: match.id,
              data: { ...match, stockQuantity: newQty }
            });
          }

          const prodRef = doc(db, 'products', match.id);
          const availableQuantity = newQty - match.reservedQuantity;
          let inventoryStatus = 'in_stock';
          if (newQty <= 0) {
            inventoryStatus = 'out_of_stock';
          } else if (newQty <= threshold) {
            inventoryStatus = 'low_stock';
          }

          batch.update(prodRef, {
            stockQuantity: newQty,
            availableQuantity,
            reorderThreshold: threshold,
            inventoryStatus,
            lastStockUpdate: new Date().toISOString(),
            stockUpdatedBy: user?.displayName || user?.email || 'Admin (Bulk CSV)',
          });

          // Queue Log
          const logRef = doc(collection(db, 'inventory_logs'));
          batch.set(logRef, {
            productId: match.id,
            productName: match.name,
            skuCode: match.skuCode,
            action: 'Stock Update',
            change: newQty - match.stockQuantity,
            previousValue: match.stockQuantity,
            newValue: newQty,
            adminId: user.uid,
            adminName: user.displayName || user.email || 'Admin (CSV)',
            timestamp: new Date().toISOString(),
            reason: 'Bulk CSV Import',
          });

          successCount++;
        }

        if (errors.length > 0) {
          setImportErrors(errors);
          toast.warning(`Import complete with ${errors.length} errors`);
        }

        if (successCount > 0) {
          await batch.commit();
          toast.success(`Successfully updated ${successCount} products`);
          
          restockedProducts.forEach(prod => {
            triggerRestockNotifications(prod.id, prod.data).catch(err => {
              console.error("Failed to trigger restock notifications from CSV import:", err);
            });
          });
        }
      }
    });
  };

  const handleCSVExport = () => {
    const rows = [
      ['ID', 'SKU', 'Name', 'Category', 'Metal Type', 'Stone Type', 'Current Stock', 'Reserved', 'Available', 'Reorder Threshold', 'Reorder Quantity', 'Status', 'Value'],
      ...filteredProducts.map(p => [
        p.id,
        p.skuCode || 'N/A',
        p.name,
        p.category || 'Other',
        p.metalType || 'N/A',
        p.stoneType || 'N/A',
        p.stockQuantity,
        p.reservedQuantity,
        p.availableQuantity,
        p.reorderThreshold,
        p.reorderQuantity,
        p.inventoryStatus,
        p.inventoryValue
      ])
    ];

    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `panstellia_inventory_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Inventory exported successfully");
  };

  if (!isAdmin) return null;

  return (
    <div className="space-y-6 max-w-[1400px] pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-luxury-900">Inventory Hub</h1>
          <p className="text-sm text-luxury-500 mt-1">Enterprise stock metrics, forecasting, and real-time controller</p>
        </div>

        {/* Tab Controls */}
        <div className="flex bg-white border border-luxury-200 p-1.5 rounded-2xl shadow-sm self-start md:self-auto">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: Warehouse },
            { id: 'controller', label: 'Controller', icon: SlidersHorizontal },
            { id: 'bulk', label: 'Bulk Operations', icon: Upload },
            { id: 'logs', label: 'Audit Logs', icon: FileText },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all select-none ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-gold-500 to-gold-600 text-white shadow-md'
                  : 'text-luxury-600 hover:text-luxury-900 hover:bg-luxury-50'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
          <RefreshCw className="w-8 h-8 text-gold-600 animate-spin" />
          <p className="text-sm text-luxury-500 font-medium">Initializing Real-time Inventory Engine...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: EXECUTIVE DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-luxury-100 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-luxury-400 uppercase tracking-wider">Catalog Value</p>
                    <p className="text-xl font-bold text-luxury-900 mt-1">₹{stats.totalValue.toLocaleString('en-IN')}</p>
                    <p className="text-[10px] text-luxury-500 mt-0.5">Asset capital</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-gold-500/10 flex items-center justify-center text-gold-700">
                    <DollarSign className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 shadow-sm border border-luxury-100 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-luxury-400 uppercase tracking-wider">Total Stock</p>
                    <p className="text-xl font-bold text-luxury-900 mt-1">{stats.totalItems.toLocaleString()}</p>
                    <p className="text-[10px] text-luxury-500 mt-0.5">Physical items</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-luxury-100 flex items-center justify-center text-luxury-700">
                    <Warehouse className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 shadow-sm border border-luxury-100 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-luxury-400 uppercase tracking-wider">Low Stock</p>
                    <p className="text-xl font-bold text-amber-600 mt-1">{stats.lowStockCount}</p>
                    <p className="text-[10px] text-amber-500 mt-0.5">Below threshold</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 shadow-sm border border-luxury-100 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-luxury-400 uppercase tracking-wider">Out of Stock</p>
                    <p className="text-xl font-bold text-red-600 mt-1">{stats.outOfStockCount}</p>
                    <p className="text-[10px] text-red-500 mt-0.5">Restock needed</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-500">
                    <XCircle className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 shadow-sm border border-luxury-100 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-luxury-400 uppercase tracking-wider">Health Score</p>
                    <p className="text-xl font-bold text-emerald-600 mt-1">{stats.healthScore}%</p>
                    <p className="text-[10px] text-emerald-500 mt-0.5">Overall status</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <Percent className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* Visualizations */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Value distribution chart */}
                <div className="bg-white rounded-2xl shadow-sm border border-luxury-100 p-5 space-y-4">
                  <div>
                    <h2 className="text-base font-bold text-luxury-900">Capital Value by Collection</h2>
                    <p className="text-xs text-luxury-500">Breakdown of inventory asset value across collections</p>
                  </div>
                  <div className="h-64 flex items-end justify-between gap-3 pt-6 pb-2">
                    {chartsData.barData.length === 0 ? (
                      <p className="text-xs text-luxury-400 w-full text-center pb-24">No data available</p>
                    ) : (
                      chartsData.barData.map((d, index) => {
                        const maxVal = Math.max(...chartsData.barData.map(item => item.value), 1);
                        const pct = (d.value / maxVal) * 100;
                        return (
                          <div key={index} className="flex-1 flex flex-col items-center group h-full justify-end relative">
                            {/* Value tooltip on hover */}
                            <div className="absolute bottom-full mb-1.5 hidden group-hover:block bg-luxury-900 text-white text-[10px] px-2.5 py-1 rounded-lg shadow-xl z-20 whitespace-nowrap transition-all">
                              ₹{d.value.toLocaleString('en-IN')}
                            </div>
                            {/* Bar column */}
                            <div 
                              className="w-full bg-gradient-to-t from-gold-600 to-gold-400 rounded-t-lg transition-all duration-300 hover:from-gold-500 hover:to-gold-300 shadow-sm"
                              style={{ height: `${Math.max(4, pct * 0.75)}%` }}
                            />
                            {/* Labels */}
                            <p className="text-[10px] text-luxury-600 truncate max-w-full mt-2 font-medium">{d.name}</p>
                            <p className="text-[9px] text-luxury-400 font-bold">₹{(d.value / 1000).toFixed(1)}k</p>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Stock distribution chart */}
                <div className="bg-white rounded-2xl shadow-sm border border-luxury-100 p-5 space-y-4">
                  <div>
                    <h2 className="text-base font-bold text-luxury-900">Stock Count Distribution</h2>
                    <p className="text-xs text-luxury-500">Share of physical products by jewelry type</p>
                  </div>
                  <div className="h-64 flex flex-col justify-center space-y-4">
                    {chartsData.pieData.length === 0 ? (
                      <p className="text-xs text-luxury-400 text-center">No data available</p>
                    ) : (
                      <>
                        {/* Segmented bar breakdown */}
                        <div className="w-full h-4 rounded-full overflow-hidden flex bg-luxury-100 shadow-inner">
                          {chartsData.pieData.map((d, index) => {
                            const totalStock = chartsData.pieData.reduce((acc, item) => acc + item.value, 0);
                            const pct = totalStock > 0 ? (d.value / totalStock) * 100 : 0;
                            if (pct <= 0) return null;
                            return (
                              <div
                                key={index}
                                className="h-full first:rounded-l-full last:rounded-r-full hover:brightness-110 transition-all cursor-help"
                                style={{
                                  width: `${pct}%`,
                                  backgroundColor: COLORS[index % COLORS.length]
                                }}
                                title={`${d.name}: ${d.value} items (${pct.toFixed(1)}%)`}
                              />
                            );
                          })}
                        </div>

                        {/* Breakdown/Legend List */}
                        <div className="grid grid-cols-2 gap-3 max-h-[160px] overflow-y-auto pr-1">
                          {chartsData.pieData.map((d, index) => {
                            const totalStock = chartsData.pieData.reduce((acc, item) => acc + item.value, 0);
                            const pct = totalStock > 0 ? (d.value / totalStock) * 100 : 0;
                            return (
                              <div key={index} className="flex items-center justify-between text-xs p-1.5 rounded-xl hover:bg-luxury-50 transition-colors border border-transparent hover:border-luxury-100">
                                <div className="flex items-center gap-2 min-w-0">
                                  <div 
                                    className="w-2.5 h-2.5 rounded-full shrink-0" 
                                    style={{ backgroundColor: COLORS[index % COLORS.length] }} 
                                  />
                                  <span className="font-semibold text-luxury-700 truncate">{d.name}</span>
                                </div>
                                <span className="font-bold text-luxury-900 shrink-0">{d.value} ({pct.toFixed(0)}%)</span>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Recommendations & Forecasting */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Reorder Suggestions */}
                <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm border border-luxury-100 p-5 space-y-4">
                  <div>
                    <h2 className="text-base font-bold text-luxury-900">Replenishment Assistant</h2>
                    <p className="text-xs text-luxury-500">Calculated suggestions based on sales velocity and thresholds</p>
                  </div>

                  {reorderSuggestions.length === 0 ? (
                    <div className="py-12 text-center border border-dashed border-luxury-200 rounded-xl">
                      <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-luxury-700">All stock levels healthy</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                      {reorderSuggestions.map(s => (
                        <div key={s.id} className="flex items-center justify-between p-3 rounded-xl border border-luxury-100 bg-luxury-50/50 hover:bg-luxury-50 transition-all">
                          <div className="min-w-0 flex-1 pr-4">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold text-luxury-900 truncate">{s.name}</p>
                              <span className="px-1.5 py-0.5 bg-luxury-200 text-luxury-700 text-[10px] font-bold rounded">SKU: {s.skuCode}</span>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-luxury-500 mt-1">
                              <span>Stock: <strong className="text-red-500">{s.stockQuantity}</strong> / {s.reorderThreshold}</span>
                              <span className="text-[10px] italic text-gold-600 font-medium">{s.reason}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className="text-[10px] uppercase font-bold text-luxury-400">Suggested Order</p>
                              <p className="text-sm font-bold text-luxury-800">+{s.recommendedReorder} units</p>
                            </div>
                            <button
                              onClick={() => handleOneClickReorder(s.id, s.recommendedReorder)}
                              className="px-3 py-1.5 bg-luxury-800 text-white rounded-lg text-xs font-semibold hover:bg-luxury-900 transition-colors shadow-sm"
                            >
                              Auto-Order
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Stock Forecasting Widget */}
                <div className="bg-white rounded-2xl shadow-sm border border-luxury-100 p-5 space-y-4">
                  <div>
                    <h2 className="text-base font-bold text-luxury-900">Demand Forecasting</h2>
                    <p className="text-xs text-luxury-500">Predicted stockout risks (within 90 days)</p>
                  </div>

                  {stockForecasts.length === 0 ? (
                    <div className="py-12 text-center border border-dashed border-luxury-200 rounded-xl">
                      <Calendar className="w-8 h-8 text-luxury-300 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-luxury-700">No imminent stockout risks</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                      {stockForecasts.map(f => (
                        <div key={f.id} className="flex gap-3 p-3 rounded-xl border border-luxury-100 hover:border-luxury-200 transition-all">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-luxury-900 truncate">{f.name}</p>
                            <p className="text-[10px] text-luxury-500 mt-0.5">Velocity: {f.dailyVelocity} units/day</p>
                            
                            <div className="flex items-center gap-2 mt-2">
                              <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded ${
                                f.risk === 'Critical' ? 'bg-red-100 text-red-700' :
                                f.risk === 'High' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                              }`}>
                                {f.risk} Risk
                              </span>
                              <span className="text-[10px] text-luxury-500">Est. Stockout: <strong>{f.shortageDate}</strong></span>
                            </div>
                          </div>
                          <div className="text-right flex flex-col justify-center flex-shrink-0">
                            <p className="text-xl font-bold text-luxury-900 leading-none">{f.daysToOOS}</p>
                            <p className="text-[9px] font-bold text-luxury-400 uppercase tracking-wider mt-0.5">Days Left</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Fast / Slow Moving Goods */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Fast Moving */}
                <div className="bg-white rounded-2xl shadow-sm border border-luxury-100 p-5 space-y-4">
                  <h2 className="text-base font-bold text-luxury-900">Fast Moving Goods</h2>
                  <div className="divide-y divide-luxury-100">
                    {performanceAnalysis.fastMoving.map(p => (
                      <div key={p.id} className="flex items-center justify-between py-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 bg-luxury-50 border border-luxury-100 rounded-lg overflow-hidden flex-shrink-0">
                            {p.image && <img src={getDirectImageUrl(p.image)} className="w-full h-full object-cover" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-luxury-900 truncate">{p.name}</p>
                            <p className="text-xs text-luxury-500">Stock: {p.stockQuantity}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-luxury-900">{p.salesCount} sold</p>
                          <p className="text-[10px] text-green-600 font-semibold uppercase tracking-wider">Fast velocity</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Slow Moving */}
                <div className="bg-white rounded-2xl shadow-sm border border-luxury-100 p-5 space-y-4">
                  <h2 className="text-base font-bold text-luxury-900">Slow Moving / Aging Stock</h2>
                  <div className="divide-y divide-luxury-100">
                    {performanceAnalysis.slowMoving.map(p => (
                      <div key={p.id} className="flex items-center justify-between py-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 bg-luxury-50 border border-luxury-100 rounded-lg overflow-hidden flex-shrink-0">
                            {p.image && <img src={getDirectImageUrl(p.image)} className="w-full h-full object-cover" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-luxury-900 truncate">{p.name}</p>
                            <p className="text-xs text-luxury-500">Stock: {p.stockQuantity}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-luxury-900">{p.salesCount} sold</p>
                          <p className="text-[10px] text-red-500 font-semibold uppercase tracking-wider">Dead Capital</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: STOCK CONTROLLER */}
          {activeTab === 'controller' && (
            <div className="space-y-4">
              {/* Filters */}
              <div className="bg-white p-5 rounded-2xl border border-luxury-100 shadow-sm space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-luxury-400" />
                    <input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="SKU, Name, Serial..."
                      className="w-full pl-9 pr-3 py-2 border border-luxury-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-gold-500"
                    />
                  </div>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-luxury-200 rounded-xl text-sm focus:outline-none"
                  >
                    <option value="All">All Statuses</option>
                    <option value="In Stock">In Stock</option>
                    <option value="Low Stock">Low Stock</option>
                    <option value="Out of Stock">Out of Stock</option>
                  </select>

                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-luxury-200 rounded-xl text-sm"
                  >
                    <option value="All">All Collections</option>
                    {categories.filter(c => c !== 'All').map(c => <option key={c} value={c}>{getCategoryLabel(c)}</option>)}
                  </select>

                  <select
                    value={metalFilter}
                    onChange={(e) => setMetalFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-luxury-200 rounded-xl text-sm"
                  >
                    <option value="All">All Metals</option>
                    {metals.filter(m => m !== 'All').map(m => <option key={m} value={m}>{m}</option>)}
                  </select>

                  <select
                    value={stoneFilter}
                    onChange={(e) => setStoneFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-luxury-200 rounded-xl text-sm"
                  >
                    <option value="All">All Stones</option>
                    {stones.filter(s => s !== 'All').map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div className="flex items-center justify-between border-t border-luxury-100 pt-3">
                  <p className="text-xs text-luxury-500">Found {filteredProducts.length} matching products</p>
                  <button onClick={handleCSVExport} className="flex items-center gap-2 px-3 py-1.5 border border-luxury-200 text-xs font-semibold rounded-xl text-luxury-700 hover:bg-luxury-50 transition-colors">
                    <Download className="w-3.5 h-3.5" /> Export CSV
                  </button>
                </div>
              </div>

              {/* Bulk Actions Header */}
              {selectedIds.length > 0 && (
                <div className="bg-luxury-800 text-white p-3 rounded-xl flex items-center justify-between shadow-md">
                  <span className="text-xs font-semibold">{selectedIds.length} items selected</span>
                  <div className="flex items-center gap-2">
                    <select
                      onChange={(e) => handleBulkStatusChange(e.target.value)}
                      className="text-xs text-luxury-900 px-3 py-1.5 rounded-lg focus:outline-none"
                    >
                      <option value="">Bulk Status Update</option>
                      <option value="available">Make Available</option>
                      <option value="unavailable">Make Unavailable</option>
                      <option value="coming_soon">Make Coming Soon</option>
                    </select>
                    <button
                      onClick={() => setSelectedIds([])}
                      className="text-xs hover:underline px-2"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              )}

              {/* Table */}
              <div className="bg-white border border-luxury-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-luxury-50 border-b border-luxury-200 text-xs font-bold text-luxury-600 uppercase">
                      <tr>
                        <th className="px-4 py-3 text-center w-10">
                          <input
                            type="checkbox"
                            checked={selectedIds.length === filteredProducts.length && filteredProducts.length > 0}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedIds(filteredProducts.map(p => p.id));
                              else setSelectedIds([]);
                            }}
                          />
                        </th>
                        <th className="px-4 py-3">Product</th>
                        <th className="px-4 py-3">SKU / Serial</th>
                        <th className="px-4 py-3">Specs</th>
                        <th className="px-4 py-3 text-center">Stock Levels</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Value</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-luxury-100 text-sm">
                      {filteredProducts.map(p => {
                        const isEditing = editingId === p.id;
                        return (
                          <tr key={p.id} className="hover:bg-luxury-50/30 transition-colors">
                            <td className="px-4 py-3 text-center">
                              <input
                                type="checkbox"
                                checked={selectedIds.includes(p.id)}
                                onChange={(e) => {
                                  if (e.target.checked) setSelectedIds(prev => [...prev, p.id]);
                                  else setSelectedIds(prev => prev.filter(id => id !== p.id));
                                }}
                              />
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg overflow-hidden bg-luxury-100 flex-shrink-0">
                                  {p.image && <img src={getDirectImageUrl(p.image)} className="w-full h-full object-cover" />}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-semibold text-luxury-900 truncate">{p.name}</p>
                                  <p className="text-xs text-luxury-400">{getCategoryLabel(p.category)}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <p className="text-xs font-bold text-luxury-800">{p.skuCode || 'N/A'}</p>
                              {p.serialNumber && <p className="text-[10px] text-luxury-400">SN: {p.serialNumber}</p>}
                            </td>
                            <td className="px-4 py-3">
                              <p className="text-xs font-semibold text-luxury-800">{p.metalType}</p>
                              {p.stoneType && <p className="text-[10px] text-luxury-500">{p.stoneType}</p>}
                            </td>
                            <td className="px-4 py-3">
                              {isEditing ? (
                                <div className="flex flex-col items-center gap-2">
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="number"
                                      value={editStockVal}
                                      onChange={(e) => setEditStockVal(e.target.value)}
                                      className="w-16 px-1.5 py-1 text-xs border border-luxury-300 rounded text-center"
                                    />
                                    <select
                                      value={editReason}
                                      onChange={(e) => setEditReason(e.target.value)}
                                      className="text-xs border border-luxury-300 rounded px-1 py-1"
                                    >
                                      <option value="Restock">Restock</option>
                                      <option value="Audit Adjustment">Audit Fix</option>
                                      <option value="Theft / Damage">Theft/Damage</option>
                                      <option value="Return / Restock">Return</option>
                                    </select>
                                  </div>
                                  <div className="flex gap-1">
                                    <button onClick={() => handleInlineSave(p.id)} className="p-1 bg-green-500 text-white rounded hover:bg-green-600 transition-colors">
                                      <Check className="w-3.5 h-3.5" />
                                    </button>
                                    <button onClick={() => setEditingId(null)} className="p-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors">
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-center">
                                  <p className="text-sm font-bold text-luxury-900">{p.stockQuantity}</p>
                                  <p className="text-[10px] text-luxury-400">Avail: {p.availableQuantity}</p>
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                                p.inventoryStatus === 'out_of_stock' ? 'bg-red-50 text-red-600 border border-red-200' :
                                p.inventoryStatus === 'low_stock' ? 'bg-amber-50 text-amber-600 border border-amber-200' :
                                'bg-green-50 text-green-600 border border-green-200'
                              }`}>
                                {p.inventoryStatus.replace(/_/g, ' ')}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <p className="text-xs font-bold text-luxury-900">₹{p.inventoryValue.toLocaleString()}</p>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                onClick={() => startEdit(p)}
                                className="p-1.5 rounded-lg border border-luxury-200 text-luxury-500 hover:text-gold-600 hover:bg-luxury-50 transition-colors"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: BULK OPERATIONS */}
          {activeTab === 'bulk' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Import CSV */}
              <div className="bg-white rounded-2xl shadow-sm border border-luxury-100 p-6 space-y-6">
                <div>
                  <h2 className="font-serif text-xl font-bold text-luxury-900">Bulk Stock Import</h2>
                  <p className="text-sm text-luxury-500">Upload a CSV file to update multiple stock levels at once.</p>
                </div>

                <div className="border-2 border-dashed border-luxury-200 rounded-xl p-8 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-12 h-12 bg-gold-500/10 rounded-xl flex items-center justify-center text-gold-700">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-luxury-800">Choose a CSV file to upload</p>
                    <p className="text-xs text-luxury-400 mt-1">Columns: skuCode or id, stockQuantity, reorderThreshold</p>
                  </div>
                  <label className="px-4 py-2 bg-luxury-900 text-white rounded-xl text-xs font-semibold uppercase tracking-wider hover:bg-luxury-800 cursor-pointer shadow-sm">
                    Select File
                    <input type="file" accept=".csv" onChange={handleCSVImport} className="hidden" />
                  </label>
                </div>

                {importErrors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 p-4 rounded-xl space-y-2 max-h-[200px] overflow-y-auto">
                    <p className="text-xs font-bold text-red-700 flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4" /> Import Errors / Warnings
                    </p>
                    <ul className="list-disc pl-4 text-xs text-red-600 space-y-1">
                      {importErrors.map((err, i) => <li key={i}>{err}</li>)}
                    </ul>
                  </div>
                )}
              </div>

              {/* Template & Guidelines */}
              <div className="bg-white rounded-2xl shadow-sm border border-luxury-100 p-6 space-y-6 flex flex-col justify-between">
                <div className="space-y-4">
                  <h2 className="font-serif text-xl font-bold text-luxury-900">Guidelines</h2>
                  <div className="space-y-2 text-xs text-luxury-600">
                    <p>1. Make sure the <strong>skuCode</strong> matches exactly the codes inside Panstellia catalog.</p>
                    <p>2. Quantities must be positive integers.</p>
                    <p>3. Uploading updates matching products instantly. A history record is added under your name.</p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    const csvContent = "skuCode,stockQuantity,reorderThreshold\nGLD-NKL-001,15,5\nSLV-RNG-002,20,3";
                    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.setAttribute('download', 'panstellia_bulk_stock_template.csv');
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="w-full py-3 border border-luxury-200 rounded-xl text-xs font-bold uppercase tracking-wider text-luxury-700 hover:bg-luxury-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" /> Download CSV Template
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: AUDIT LOGS */}
          {activeTab === 'logs' && (
            <div className="bg-white border border-luxury-100 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-4 border-b border-luxury-200 flex items-center justify-between bg-luxury-50">
                <p className="text-xs font-bold text-luxury-600 uppercase tracking-wider">Inventory Operations Logs</p>
                <div className="flex items-center gap-1 text-[10px] text-green-600 font-semibold bg-green-50 px-2 py-1 rounded border border-green-200">
                  <Activity className="w-3.5 h-3.5 animate-pulse" /> Live Audit Stream
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-luxury-50 text-xs font-bold text-luxury-600 uppercase border-b border-luxury-200">
                    <tr>
                      <th className="px-4 py-3">Timestamp</th>
                      <th className="px-4 py-3">Admin</th>
                      <th className="px-4 py-3">Product</th>
                      <th className="px-4 py-3">SKU</th>
                      <th className="px-4 py-3">Action</th>
                      <th className="px-4 py-3 text-center">Change</th>
                      <th className="px-4 py-3 text-center">Before → After</th>
                      <th className="px-4 py-3">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-luxury-100 text-xs">
                    {logs.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-luxury-400">
                          No audit activity logs recorded yet.
                        </td>
                      </tr>
                    ) : (
                      logs.map(log => {
                        const date = log.timestamp ? new Date(log.timestamp) : new Date();
                        return (
                          <tr key={log.id} className="hover:bg-luxury-50/50 transition-colors">
                            <td className="px-4 py-3 text-luxury-500">
                              {date.toLocaleDateString('en-IN')} {date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="px-4 py-3 font-semibold text-luxury-800">
                              {log.adminName}
                            </td>
                            <td className="px-4 py-3 text-luxury-900 font-medium truncate max-w-[150px]" title={log.productName}>
                              {log.productName}
                            </td>
                            <td className="px-4 py-3 font-mono text-[10px] text-luxury-600">
                              {log.skuCode || 'N/A'}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                log.action === 'Stock Increase' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {log.action}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center font-bold">
                              {log.change > 0 ? `+${log.change}` : log.change}
                            </td>
                            <td className="px-4 py-3 text-center text-luxury-500">
                              {log.previousValue} <ArrowRight className="w-3 h-3 inline mx-0.5" /> {log.newValue}
                            </td>
                            <td className="px-4 py-3 text-luxury-600 italic">
                              {log.reason}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
