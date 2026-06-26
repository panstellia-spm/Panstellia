import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CreditCard, Lock, ChevronLeft, Truck, Plus } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { createRazorpayOrder, verifyPayment, openCheckout, markPaymentFailed } from '../services/payment';
import { db } from '../services/firebase';
import { collection, addDoc, serverTimestamp, doc, runTransaction, onSnapshot, getDoc, updateDoc } from 'firebase/firestore';
import { sendOrderNotifications, formatOrderDataForEmail } from '../services/orderNotifications';
import { calculateRates, createShiprocketOrder } from '../services/shiprocket';

import { getOptimizedImageUrl } from '../utils/imageUtils';
import SEOHelmet from '../utils/seoHelmet';

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { user, userData, addAddress, updateAddress } = useAuth();
  const { cartItems, subtotal, shipping, tax, total, clearCart } = useCart();
  
  const [loading, setLoading] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('razorpay');
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  
  const [usePartialPayment, setUsePartialPayment] = useState(false);

  // Coupon State
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponLoading, setCouponLoading] = useState(false);

  // Shiprocket & Dynamic Shipping State
  const [dynamicShipping, setDynamicShipping] = useState(shipping);
  const [shippingRateLoading, setShippingRateLoading] = useState(false);
  const [pincodeError, setPincodeError] = useState('');
  const [estDeliveryDate, setEstDeliveryDate] = useState('');
  const [courierName, setCourierName] = useState('');
  const [isDeliverable, setIsDeliverable] = useState(true);

  const finalTotal = Math.max(0, subtotal + dynamicShipping + tax - couponDiscount);

  const handleApplyCoupon = async () => {
    if (!couponCodeInput.trim()) {
      toast.error("Please enter a coupon code");
      return;
    }
    setCouponLoading(true);
    try {
      const code = couponCodeInput.trim().toUpperCase();
      const docRef = doc(db, 'offers', code);
      const snap = await getDoc(docRef);
      
      if (!snap.exists()) {
        toast.error("Invalid coupon code");
        setAppliedCoupon(null);
        setCouponDiscount(0);
        setCouponLoading(false);
        return;
      }
      
      const coupon = snap.data();
      
      if (coupon.archived) {
        toast.error("Coupon is invalid or archived");
        setAppliedCoupon(null);
        setCouponDiscount(0);
        setCouponLoading(false);
        return;
      }
      
      if (!coupon.enabled) {
        toast.error("Coupon is currently disabled");
        setAppliedCoupon(null);
        setCouponDiscount(0);
        setCouponLoading(false);
        return;
      }
      
      // Expiry check
      if (coupon.endDate && new Date(coupon.endDate) < new Date()) {
        toast.error("Coupon has expired");
        setAppliedCoupon(null);
        setCouponDiscount(0);
        setCouponLoading(false);
        return;
      }
      
      // Start date check
      if (coupon.startDate && new Date(coupon.startDate) > new Date()) {
        toast.error("Coupon is not active yet");
        setAppliedCoupon(null);
        setCouponDiscount(0);
        setCouponLoading(false);
        return;
      }
      
      // Uses limit check
      const currentUses = Number(coupon.currentUses || 0);
      const maxUses = Number(coupon.maxUses || 100);
      if (currentUses >= maxUses) {
        toast.error("Coupon usage limit has been reached");
        setAppliedCoupon(null);
        setCouponDiscount(0);
        setCouponLoading(false);
        return;
      }
      
      // Min cart value check
      if (subtotal < (coupon.minCartValue || 0)) {
        toast.error(`Minimum order amount of ₹${coupon.minCartValue} required to apply this coupon.`);
        setAppliedCoupon(null);
        setCouponDiscount(0);
        setCouponLoading(false);
        return;
      }
      
      // Calculate discount
      let discount = 0;
      if (coupon.type === 'percentage') {
        discount = Math.round((subtotal * (coupon.value || 0)) / 100);
      } else if (coupon.type === 'flat') {
        discount = Number(coupon.value || 0);
      } else if (coupon.type === 'buy_x_get_y') {
        const buyQty = Number(coupon.buyQty || 2);
        const getQty = Number(coupon.getQty || 1);
        const totalQty = cartItems.reduce((sum, item) => sum + item.quantity, 0);
        
        if (totalQty < buyQty) {
          toast.error(`Buy ${buyQty} items to get ${getQty} free. Your cart has only ${totalQty} items.`);
          setAppliedCoupon(null);
          setCouponDiscount(0);
          setCouponLoading(false);
          return;
        }
        
        const itemPrices = [];
        cartItems.forEach(item => {
          for (let i = 0; i < item.quantity; i++) {
            itemPrices.push(Number(item.price));
          }
        });
        itemPrices.sort((a, b) => a - b);
        
        const freeItemsCount = Math.min(getQty, itemPrices.length);
        for (let i = 0; i < freeItemsCount; i++) {
          discount += itemPrices[i];
        }
      }
      
      discount = Math.min(discount, subtotal);
      
      setAppliedCoupon({ ...coupon, code });
      setCouponDiscount(discount);
      toast.success(`Coupon "${code}" applied successfully!`);
    } catch (err) {
      console.error("Error applying coupon:", err);
      toast.error(err.message || "Failed to apply coupon");
    } finally {
      setCouponLoading(false);
    }
  };
  
  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponDiscount(0);
    setCouponCodeInput("");
    toast.info("Coupon removed");
  };
  const [paymentConfig, setPaymentConfig] = useState({
    cod: { enabled: true, minOrderValue: 0, maxOrderValue: 50000 },
    razorpay: { enabled: true, minOrderValue: 0 },
    upi: { enabled: true, minOrderValue: 0 },
    partial: { enabled: false, minOrderValue: 10000, partialPercentage: 30 }
  });

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'system_settings', 'payments'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setPaymentConfig(data);
        if (data.razorpay?.enabled) {
          setSelectedPaymentMethod('razorpay');
        } else if (data.cod?.enabled) {
          setSelectedPaymentMethod('cod');
        }
      }
    }, (err) => console.error("Error reading payments settings:", err));
    return () => unsub();
  }, []);
  
  const [formData, setFormData] = useState({
    name: user?.displayName || '',
    email: user?.email || '',
    phone: '',
    address: '',
    apartment: '',
    landmark: '',
    city: '',
    state: '',
    country: 'India',
    pincode: '',
    addressLabel: 'Home'
  });

  useEffect(() => {
    if (!user) {
      navigate('/login?redirect=/checkout');
    }
  }, [user, navigate]);

  // Auto-populate with default address on load
  useEffect(() => {
    if (userData?.addresses && userData.addresses.length > 0) {
      const defaultAddr = userData.addresses.find(a => a.isDefault) || userData.addresses[0];
      if (defaultAddr && !selectedAddressId) {
        setSelectedAddressId(defaultAddr._id);
        setFormData({
          name: defaultAddr.fullName || user?.displayName || '',
          email: defaultAddr.email || user?.email || '',
          phone: defaultAddr.phone || '',
          address: defaultAddr.address || '',
          apartment: defaultAddr.apartment || '',
          landmark: defaultAddr.landmark || '',
          city: defaultAddr.city || '',
          state: defaultAddr.state || '',
          country: defaultAddr.country || 'India',
          pincode: defaultAddr.pincode || '',
          addressLabel: defaultAddr.label || 'Home'
        });
      }
    }
  }, [userData, user, selectedAddressId]);

  const handleSelectAddress = (addrId) => {
    setSelectedAddressId(addrId);
    if (addrId === 'new') {
      setFormData({
        name: user?.displayName || '',
        email: user?.email || '',
        phone: '',
        address: '',
        apartment: '',
        landmark: '',
        city: '',
        state: '',
        country: 'India',
        pincode: '',
        addressLabel: 'Home'
      });
    } else {
      const selected = userData.addresses.find(a => a._id === addrId);
      if (selected) {
        setFormData({
          name: selected.fullName || '',
          email: selected.email || '',
          phone: selected.phone || '',
          address: selected.address || '',
          apartment: selected.apartment || '',
          landmark: selected.landmark || '',
          city: selected.city || '',
          state: selected.state || '',
          country: selected.country || 'India',
          pincode: selected.pincode || '',
          addressLabel: selected.label || 'Home'
        });
      }
    }
  };

  const saveOrUpdateProfileAddress = async () => {
    if (!user) return;
    try {
      const addressData = {
        label: formData.addressLabel || 'Home',
        fullName: formData.name,
        phone: formData.phone,
        email: formData.email,
        address: formData.address,
        apartment: formData.apartment || '',
        landmark: formData.landmark || '',
        city: formData.city,
        state: formData.state,
        country: formData.country || 'India',
        pincode: formData.pincode
      };

      if (selectedAddressId && selectedAddressId !== 'new') {
        await updateAddress(selectedAddressId, addressData);
      } else {
        const currentAddresses = userData?.addresses || [];
        const isDuplicate = currentAddresses.some(addr => 
          addr.address === addressData.address && 
          addr.city === addressData.city && 
          addr.pincode === addressData.pincode
        );
        if (!isDuplicate) {
          await addAddress({
            ...addressData,
            isDefault: currentAddresses.length === 0
          });
        }
      }
    } catch (err) {
      console.error('Failed to auto-save address to profile:', err);
    }
  };

  useEffect(() => {
    if (cartItems.length === 0) {
      navigate('/cart');
    }
  }, [cartItems.length, navigate]);

  // Re-run serviceability / rate calculation when pincode or parameters change
  useEffect(() => {
    const checkRates = async () => {
      const pin = formData.pincode.trim();
      if (!/^\d{6}$/.test(pin)) {
        setPincodeError('');
        setIsDeliverable(true);
        setDynamicShipping(shipping);
        setEstDeliveryDate('');
        setCourierName('');
        return;
      }

      setShippingRateLoading(true);
      setPincodeError('');

      try {
        const token = await user.getIdToken();
        const weight = cartItems.reduce((acc, item) => acc + (item.quantity * 0.1), 0);
        const isCod = selectedPaymentMethod === 'cod';

        const res = await calculateRates(pin, subtotal, weight, isCod, token);

        if (res.method === 'standard_fallback_error') {
          setDynamicShipping(res.rate);
          setIsDeliverable(true);
          setEstDeliveryDate('3-5 business days');
          setCourierName(res.courier || '');
        } else if (res.isFree) {
          setDynamicShipping(0);
          setIsDeliverable(true);
          setEstDeliveryDate('3-5 business days');
          setCourierName('');
        } else {
          setDynamicShipping(res.rate);
          setIsDeliverable(true);
          if (res.est_days) {
            setEstDeliveryDate(`${res.est_days}`);
          } else if (res.etd) {
            const formatted = new Date(res.etd).toLocaleDateString('en-IN', {
              weekday: 'long',
              month: 'short',
              day: 'numeric'
            });
            setEstDeliveryDate(formatted);
          }
          setCourierName(res.courier || '');
        }
      } catch (err) {
        console.error('Serviceability check failed:', err.message);
        setPincodeError('Pincode may not be serviceable by our delivery partners.');
        setIsDeliverable(false);
        setDynamicShipping(shipping);
      } finally {
        setShippingRateLoading(false);
      }
    };

    if (user && formData.pincode) {
      checkRates();
    }
  }, [formData.pincode, selectedPaymentMethod, subtotal, shipping, user, cartItems]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const rollbackReservations = async (items) => {
    try {
      await runTransaction(db, async (transaction) => {
        const snaps = [];
        for (const item of items) {
          const productRef = doc(db, 'products', item.id);
          const productSnap = await transaction.get(productRef);
          snaps.push({ ref: productRef, snap: productSnap, item });
        }
        
        for (const { ref, snap, item } of snaps) {
          if (snap.exists()) {
            const pData = snap.data();
            const oldStock = Number(pData.stockQuantity ?? 0);
            const oldReserved = Number(pData.reservedQuantity ?? 0);
            const newReserved = Math.max(0, oldReserved - item.quantity);
            const newAvailable = oldStock - newReserved;
            
            transaction.update(ref, {
              reservedQuantity: newReserved,
              availableQuantity: newAvailable,
              lastStockUpdate: new Date().toISOString(),
              stockUpdatedBy: 'System (Reservation Release)',
            });
          }
        }
      });
      console.log('✅ Stock reservations rolled back successfully');
    } catch (e) {
      console.error('⚠️ Failed to rollback reservations:', e);
    }
  };

  const handlePayment = async () => {
    setLoading(true);
    let hasReservedStock = false;
    const cartItemsSnapshot = cartItems.map((ci) => ({
      id: ci.id,
      name: ci.name,
      price: ci.price,
      quantity: ci.quantity,
      image: ci.image,
      category: ci.category || '',
    }));

    try {
      // Validate form
      if (!formData.name || !formData.email || !formData.phone || !formData.address || !formData.city || !formData.state || !formData.pincode) {
        throw new Error('Please fill in all required fields');
      }

      if (!isDeliverable) {
        throw new Error('Your selected pincode is not serviceable by our shipping partners.');
      }

      await saveOrUpdateProfileAddress();

      // COD flow (no gateway verification)
      if (selectedPaymentMethod === 'cod') {
        try {
          const paymentMethod = 'cod';
          const shortCode = Math.random().toString(36).slice(2, 8).toUpperCase();
          const orderId = `COD-${shortCode}`;

          // Run transaction to check/deduct stock and save order/payment
          await runTransaction(db, async (transaction) => {
            // 1. READ PHASE: Execute ALL reads concurrently before any writes
            const readPromises = [];
            
            // Read products
            for (const item of cartItems) {
              const productRef = doc(db, 'products', item.id);
              readPromises.push(
                transaction.get(productRef).then(snap => {
                  if (!snap.exists()) {
                    throw new Error(`Product "${item.name}" not found.`);
                  }
                  return { type: 'product', ref: productRef, snap, item };
                })
              );
            }

            // Read coupon
            let couponRef = null;
            if (appliedCoupon) {
              couponRef = doc(db, 'offers', appliedCoupon.code);
              readPromises.push(
                transaction.get(couponRef).then(snap => {
                  return { type: 'coupon', ref: couponRef, snap };
                })
              );
            }

            const readResults = await Promise.all(readPromises);
            
            const productDocs = readResults.filter(r => r.type === 'product');
            const couponResult = readResults.find(r => r.type === 'coupon');
            const couponSnap = couponResult ? couponResult.snap : null;

            if (couponSnap && couponSnap.exists()) {
              const cData = couponSnap.data();
              const curUses = Number(cData.currentUses || 0);
              const mUses = Number(cData.maxUses || 100);
              if (curUses >= mUses) {
                throw new Error("Coupon usage limit has been reached since you applied it.");
              }
            }

            // 2. Validate availability
            for (const { snap, item } of productDocs) {
              const pData = snap.data();
              const stockQuantity = Number(pData.stockQuantity ?? 0);
              const reservedQuantity = Number(pData.reservedQuantity ?? 0);
              const available = stockQuantity - reservedQuantity;
              if (available < item.quantity) {
                throw new Error(`Insufficient stock for "${item.name}". Only ${available} available.`);
              }
            }

            // 3. Apply updates & log stock changes
            for (const { ref, snap, item } of productDocs) {
              const pData = snap.data();
              const oldStock = Number(pData.stockQuantity ?? 0);
              const oldReserved = Number(pData.reservedQuantity ?? 0);
              const newStock = Math.max(0, oldStock - item.quantity);
              const newAvailable = newStock - oldReserved;
              
              let inventoryStatus = 'in_stock';
              if (newStock <= 0) {
                inventoryStatus = 'out_of_stock';
              } else if (newStock <= Number(pData.reorderThreshold ?? 5)) {
                inventoryStatus = 'low_stock';
              }

              transaction.update(ref, {
                stockQuantity: newStock,
                availableQuantity: newAvailable,
                inventoryStatus,
                lastStockUpdate: new Date().toISOString(),
                stockUpdatedBy: 'System (COD Purchase)',
                inventoryValue: newStock * Number(pData.price ?? 0),
              });

              // Write inventory log
              const logRef = doc(collection(db, 'inventory_logs'));
              transaction.set(logRef, {
                productId: item.id,
                productName: item.name,
                skuCode: pData.skuCode || '',
                action: 'Stock Decrease',
                change: -item.quantity,
                previousValue: oldStock,
                newValue: newStock,
                adminId: user.uid,
                adminName: user.displayName || user.email || 'Customer (COD Checkout)',
                timestamp: new Date().toISOString(),
                reason: `COD Order #${orderId}`,
              });

              // Low stock alert write inside transaction
              if (newStock <= Number(pData.reorderThreshold ?? 5)) {
                const notifRef = doc(db, 'admin_notifications', `lowstock-${item.id}-${orderId}`);
                transaction.set(notifRef, {
                  title: 'Low Stock Alert',
                  message: `Product "${item.name}" is low in stock (${newStock} left)`,
                  type: 'inventory',
                  targetId: item.id,
                  read: false,
                  createdAt: new Date().toISOString(),
                });
              }
            }

            // 4. Save order and payment records
            const orderDocRef = doc(collection(db, 'orders'));
            const paymentDocRef = doc(collection(db, 'payments'));

            const commonOrderData = {
              userId: user.uid,
              orderId,
              customerName: formData.name,
              phone: formData.phone,
              email: formData.email,
              subtotal,
              shipping: dynamicShipping,
              tax,
              couponCode: appliedCoupon?.code || null,
              couponDiscount: couponDiscount || 0,
              total: finalTotal,
              items: cartItemsSnapshot,
              status: 'processing',
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
              paymentMethod,
              paymentStatus: 'Pending',
              address: formData.address,
              apartment: formData.apartment || "",
              landmark: formData.landmark || "",
              city: formData.city,
              state: formData.state,
              country: formData.country || "India",
              pincode: formData.pincode,
              addressLabel: formData.addressLabel || "Home",
            };

            transaction.set(paymentDocRef, {
              ...commonOrderData,
              amount: finalTotal * 100, // paise
              customerOrderId: orderId,
              orderDocId: orderDocRef.id,
            });

            transaction.set(orderDocRef, commonOrderData);

            // Update coupon uses if applied
            if (appliedCoupon && couponSnap && couponSnap.exists()) {
              const cData = couponSnap.data();
              const curUses = Number(cData.currentUses || 0);
              transaction.update(couponRef, {
                currentUses: curUses + 1
              });
            }

            // Order notification write inside transaction
            const orderNotifRef = doc(db, 'admin_notifications', `order-${orderId}`);
            transaction.set(orderNotifRef, {
              title: 'New Order Placed',
              message: `Order #${orderId} was placed by ${formData.name} for ₹${finalTotal.toLocaleString()}`,
              type: 'order',
              targetId: orderDocRef.id,
              read: false,
              createdAt: new Date().toISOString(),
            });
          });

          // Send order confirmation and admin notification emails
          try {
            const emailData = formatOrderDataForEmail({
              orderId,
              customerName: formData.name,
              customerEmail: formData.email,
              customerPhone: formData.phone,
              paymentMethod,
              shippingAddress: [
                formData.address,
                formData.apartment,
                formData.landmark,
                formData.city,
                formData.state,
                formData.country,
                formData.pincode
              ].filter(Boolean).join(', '),
              shippingCity: formData.city,
              shippingState: formData.state,
              shippingPincode: formData.pincode,
              cartItems: cartItemsSnapshot,
              total: finalTotal,
              tax,
              shipping: dynamicShipping,
              couponCode: appliedCoupon?.code || null,
              couponDiscount: couponDiscount || 0,
            });

            const adminEmail = import.meta.env.VITE_ADMIN_EMAIL || 'admin@panstellia.com';
            const emailResults = await sendOrderNotifications(emailData, adminEmail);

            if (emailResults.customerEmail.sent) {
              console.log('✅ Customer confirmation email sent');
            }
            if (emailResults.adminEmail.sent) {
              console.log('✅ Admin notification email sent');
            }
          } catch (emailError) {
            console.error('⚠️ Email sending error (order still placed):', emailError);
          }

          // Create Shiprocket Order for COD
          try {
            const configSnap = await getDoc(doc(db, 'system_settings', 'shiprocket'));
            if (configSnap.exists() && configSnap.data().enabled) {
              const token = await user.getIdToken();
              console.log(`[Checkout] Creating Shiprocket order for COD doc: ${orderDocRef.id}`);
              await createShiprocketOrder(orderDocRef.id, null, token);
            }
          } catch (shiprocketErr) {
            console.error('Shiprocket automatic COD order creation failed:', shiprocketErr);
          }

          await clearCart();

          toast.success('Order placed. Cash on Delivery selected!', {
            position: 'bottom-right',
          });

          navigate('/order-success', {
            state: {
              orderId,
              items: cartItems,
              total: finalTotal,
            },
          });
        } catch (e) {
          console.error('Failed to store COD payment record in Firestore:', e);
          toast.error(e.message || 'Failed to place COD order. Please try again.', {
            position: 'bottom-right',
          });
          return;
        }

        return;
      }

      // Validate payment setup and limits first
      if (selectedPaymentMethod === 'cod') {
        if (!paymentConfig.cod?.enabled) {
          throw new Error('Cash on Delivery is currently disabled.');
        }
        if (finalTotal < (paymentConfig.cod?.minOrderValue || 0)) {
          throw new Error(`Minimum order value for Cash on Delivery is ₹${paymentConfig.cod.minOrderValue}`);
        }
        if (finalTotal > (paymentConfig.cod?.maxOrderValue || 50000)) {
          throw new Error(`Maximum order value for Cash on Delivery is ₹${paymentConfig.cod.maxOrderValue}`);
        }
      } else if (selectedPaymentMethod === 'razorpay') {
        if (!paymentConfig.razorpay?.enabled) {
          throw new Error('Razorpay payment gateway is currently disabled.');
        }
        if (finalTotal < (paymentConfig.razorpay?.minOrderValue || 0)) {
          throw new Error(`Minimum order value for Razorpay payment is ₹${paymentConfig.razorpay.minOrderValue}`);
        }
      }

      // Razorpay flow
      const isPartialEligible = paymentConfig.partial?.enabled && finalTotal >= (paymentConfig.partial?.minOrderValue || 10000);
      const isPartial = usePartialPayment && isPartialEligible;
      const actualAmount = isPartial 
        ? Math.round((finalTotal * (paymentConfig.partial.partialPercentage || 30)) / 100) 
        : finalTotal;

      const amountInPaise = Math.round(actualAmount * 100);
      const authToken = await user.getIdToken();

      if (amountInPaise < 100) {
        throw new Error('Minimum order amount is ₹1');
      }



      // 2. Create the order on the server
      const orderData = await createRazorpayOrder(amountInPaise, 'INR', {
        receipt: `order_${Date.now()}`,
        authToken,
        notes: {
          userId: user.uid,
          customerEmail: formData.email,
          customerName: formData.name,
          is_partial: isPartial ? "true" : "false",
        },
        customer: {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
        },
        items: cartItemsSnapshot,
        totals: {
          subtotal,
          shipping: dynamicShipping,
          tax,
          total: finalTotal,
          couponCode: appliedCoupon?.code || null,
          couponDiscount: couponDiscount || 0,
        },
        shippingAddress: {
          address: formData.address,
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode,
          apartment: formData.apartment || "",
          landmark: formData.landmark || "",
          country: formData.country || "India",
          addressLabel: formData.addressLabel || "Home",
        },
      });

      const { order_id, order_number, local_order_id, payment_record_id } = orderData;

      // Update coupon details client-side (to bypass Spark plan Cloud Function deploy limitation)
      if (appliedCoupon && local_order_id) {
        try {
          const orderDocRef = doc(db, 'orders', local_order_id);
          await updateDoc(orderDocRef, {
            couponCode: appliedCoupon.code,
            couponDiscount: couponDiscount,
          });
        } catch (couponDbErr) {
          console.error("Failed to update order document with coupon code:", couponDbErr);
        }
      }

      const markCurrentPaymentFailed = async (reason, paymentId) => {
        try {
          await markPaymentFailed(order_id, {
            authToken,
            paymentId,
            reason,
          });
        } catch (statusError) {
          console.error('Failed to update failed payment status:', statusError);
        }
      };

      const razorpayOptions = {
        amount: amountInPaise,
        currency: 'INR',
        name: 'Panstellia',
        description: `Panstellia jewellery order ${order_number || order_id}`,
        image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=200',
        order_id: order_id,
        prefill: {
          name: formData.name,
          email: formData.email,
          contact: formData.phone,
        },
        theme: {
          color: '#db912d',
        },
        onSuccess: async (response) => {
          try {
            // Call verifyPayment in backend to finalize the Firestore order status and deduct stock securely
            const verificationResult = await verifyPayment(
              response.razorpay_payment_id,
              response.razorpay_order_id,
              response.razorpay_signature,
              { authToken }
            );

            if (verificationResult.verified) {
              toast.success('Payment successful!', {
                position: 'bottom-right',
              });

              try {
                const orderId = verificationResult.order_number || order_number || response.razorpay_order_id;
                const emailData = formatOrderDataForEmail({
                  orderId,
                  customerName: formData.name,
                  customerEmail: formData.email,
                  customerPhone: formData.phone,
                  paymentMethod: 'razorpay',
                  shippingAddress: [
                    formData.address,
                    formData.apartment,
                    formData.landmark,
                    formData.city,
                    formData.state,
                    formData.country,
                    formData.pincode
                  ].filter(Boolean).join(', '),
                  shippingCity: formData.city,
                  shippingState: formData.state,
                  shippingPincode: formData.pincode,
                  cartItems: cartItemsSnapshot,
                  total: finalTotal,
                  tax,
                  shipping: dynamicShipping,
                  couponCode: appliedCoupon?.code || null,
                  couponDiscount: couponDiscount || 0,
                });

                const adminEmail = import.meta.env.VITE_ADMIN_EMAIL || 'admin@panstellia.com';
                const emailResults = await sendOrderNotifications(emailData, adminEmail);

                if (emailResults.customerEmail.sent) {
                  console.log('✅ Customer confirmation email sent');
                }
                if (emailResults.adminEmail.sent) {
                  console.log('✅ Admin notification email sent');
                }
              } catch (emailError) {
                console.error('⚠️ Email sending error (order still placed):', emailError);
              }

              // Create Shiprocket Order for Prepaid
              try {
                const configSnap = await getDoc(doc(db, 'system_settings', 'shiprocket'));
                if (configSnap.exists() && configSnap.data().enabled) {
                  const orderDocId = verificationResult.local_order_id || local_order_id;
                  if (orderDocId) {
                    console.log(`[Checkout] Creating Shiprocket order for Prepaid doc: ${orderDocId}`);
                    await createShiprocketOrder(orderDocId, null, authToken);
                  }
                }
              } catch (shiprocketErr) {
                console.error('Shiprocket automatic Prepaid order creation failed:', shiprocketErr);
              }

              await clearCart();

              navigate('/order-success', {
                state: {
                  orderId: verificationResult.order_number || order_number || response.razorpay_order_id,
                  items: cartItemsSnapshot,
                  total: finalTotal,
                },
              });
            } else {
              throw new Error('Payment verification failed');
            }
          } catch (error) {
            console.error('Payment verification error:', error);
            await markCurrentPaymentFailed(error.message || 'Payment verification failed', response.razorpay_payment_id);
            toast.error('Payment verification failed. Please contact support.', {
              position: 'bottom-right',
            });
          }
        },
        onFailure: async (response) => {
          const paymentId = response?.error?.metadata?.payment_id;
          const reason = response?.error?.description || response?.error?.reason || 'Payment failed';
          await markCurrentPaymentFailed(reason, paymentId);
          toast.error(reason, {
            position: 'bottom-right',
          });
        },
        onDismiss: async () => {
          await markCurrentPaymentFailed('Payment cancelled by customer');
          toast.info('Payment cancelled', {
            position: 'bottom-right',
          });
        },
      };

      await openCheckout(razorpayOptions);
    } catch (error) {
      console.error('Payment error:', error);
      toast.error(error.message || 'Payment failed', {
        position: 'bottom-right',
      });
    }

    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await handlePayment();
  };

  if (!user || cartItems.length === 0) {
    return null;
  }

  return (
    <div className="min-h-screen bg-luxury-50 py-8">
      <SEOHelmet 
        title="Secure Checkout | Panstellia"
        description="Complete your jewelry purchase securely. Fast checkout with Razorpay payment gateway."
        keywords="checkout, payment, secure payment, jewelry purchase"
        canonical="https://panstellia.com/checkout"
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16 md:mt-8">
        <Link to="/cart" className="inline-flex items-center text-luxury-600 hover:text-gold-600 mb-6 text-sm font-semibold uppercase tracking-wider">
          <ChevronLeft className="w-5 h-5 mr-1" />
          Back to Cart
        </Link>

        {/* Step Progress Indicator */}
        <div className="max-w-md mx-auto mb-10 mt-4">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-luxury-200 z-0" />
            <div className="absolute left-0 w-1/2 top-1/2 -translate-y-1/2 h-0.5 bg-gold-500 z-0" />

            {/* Step 1: Bag */}
            <div className="flex flex-col items-center z-10">
              <div className="w-8 h-8 rounded-full bg-gold-500 text-white flex items-center justify-center font-bold text-xs shadow-md">
                ✓
              </div>
              <span className="text-[10px] uppercase font-bold text-gold-600 mt-2 tracking-wider">Bag</span>
            </div>

            {/* Step 2: Shipping */}
            <div className="flex flex-col items-center z-10">
              <div className="w-8 h-8 rounded-full bg-gold-500 text-white border border-gold-500 flex items-center justify-center font-bold text-xs shadow-md">
                2
              </div>
              <span className="text-[10px] uppercase font-bold text-gold-600 mt-2 tracking-wider">Shipping</span>
            </div>

            {/* Step 3: Payment */}
            <div className="flex flex-col items-center z-10">
              <div className="w-8 h-8 rounded-full bg-white text-luxury-400 border border-luxury-200 flex items-center justify-center font-semibold text-xs shadow-sm">
                3
              </div>
              <span className="text-[10px] uppercase font-bold text-luxury-450 mt-2 tracking-wider">Payment</span>
            </div>
          </div>
        </div>

        <h1 className="font-serif text-3xl font-bold text-luxury-900 mb-8 text-center md:text-left">Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Shipping Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-md p-6 border border-luxury-100">
              <h2 className="font-serif text-xl font-bold text-luxury-900 mb-6">
                Shipping Details
              </h2>

              {/* Saved Addresses list */}
              {userData?.addresses && userData.addresses.length > 0 && (
                <div className="mb-6 pb-6 border-b border-luxury-100">
                  <label className="block text-xs font-bold text-luxury-800 uppercase tracking-wider mb-3">
                    Select Shipping Profile
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {userData.addresses.map((addr) => (
                      <button
                        key={addr._id}
                        type="button"
                        onClick={() => handleSelectAddress(addr._id)}
                        className={`p-3 rounded-xl border-2 text-left transition-all relative ${
                          selectedAddressId === addr._id
                            ? 'border-gold-500 bg-gold-50/5'
                            : 'border-luxury-100 hover:border-luxury-200 bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <input
                            type="radio"
                            name="checkout_address"
                            checked={selectedAddressId === addr._id}
                            onChange={() => {}} // handled by button click
                            className="text-gold-500 focus:ring-gold-500 h-3.5 w-3.5 cursor-pointer"
                          />
                          <span className="font-bold text-xs text-luxury-900 uppercase">
                            {addr.label}
                          </span>
                          {addr.isDefault && (
                            <span className="text-[9px] bg-gold-100 text-gold-700 px-1 py-0.2 rounded font-bold">Default</span>
                          )}
                        </div>
                        <p className="text-[11px] text-luxury-600 truncate font-semibold">{addr.fullName}</p>
                        <p className="text-[10px] text-luxury-400 truncate">{addr.address}, {addr.city}</p>
                      </button>
                    ))}
                    
                    <button
                      type="button"
                      onClick={() => handleSelectAddress('new')}
                      className={`p-3 rounded-xl border-2 border-dashed text-center flex flex-col items-center justify-center transition-all bg-white ${
                        selectedAddressId === 'new'
                          ? 'border-gold-500 bg-gold-50/5 text-gold-650'
                          : 'border-luxury-200 hover:border-luxury-300 text-luxury-500'
                      }`}
                    >
                      <Plus className="w-4 h-4 mb-1" />
                      <span className="font-bold text-xs">Add New Address</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Save Address As (Label) - only shown when adding a new address */}
                {selectedAddressId === 'new' && (
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-luxury-800 uppercase tracking-wider mb-1.5">
                      Save Address As (Label) *
                    </label>
                    <select
                      name="addressLabel"
                      value={formData.addressLabel}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 border border-luxury-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent transition-all"
                    >
                      <option value="Home">Home</option>
                      <option value="Office">Office</option>
                      <option value="Parents">Parents</option>
                      <option value="Friend">Friend</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                )}

                {/* Name */}
                <div>
                  <label className="block text-xs font-bold text-luxury-800 uppercase tracking-wider mb-1.5">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="input-field py-2.5 text-sm"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-bold text-luxury-800 uppercase tracking-wider mb-1.5">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    placeholder="+91 98765 43210"
                    className="input-field py-2.5 text-sm"
                  />
                </div>

                {/* Email (Full Width) */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-luxury-800 uppercase tracking-wider mb-1.5">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="input-field py-2.5 text-sm"
                  />
                </div>

                {/* Address Line (Full Width) */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-luxury-800 uppercase tracking-wider mb-1.5">
                    Address *
                  </label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    required
                    rows={3}
                    className="input-field py-2.5 text-sm"
                    placeholder="Flat No., Building Name, Street Name"
                  />
                </div>

                {/* Apartment / Flat */}
                <div>
                  <label className="block text-xs font-bold text-luxury-800 uppercase tracking-wider mb-1.5">
                    Apartment / Flat / Suite
                  </label>
                  <input
                    type="text"
                    name="apartment"
                    value={formData.apartment}
                    onChange={handleChange}
                    placeholder="e.g. Apt 4B, 3rd Floor"
                    className="input-field py-2.5 text-sm"
                  />
                </div>

                {/* Landmark */}
                <div>
                  <label className="block text-xs font-bold text-luxury-800 uppercase tracking-wider mb-1.5">
                    Landmark
                  </label>
                  <input
                    type="text"
                    name="landmark"
                    value={formData.landmark}
                    onChange={handleChange}
                    placeholder="e.g. Near City Mall"
                    className="input-field py-2.5 text-sm"
                  />
                </div>

                {/* City */}
                <div>
                  <label className="block text-xs font-bold text-luxury-800 uppercase tracking-wider mb-1.5">
                    City *
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    required
                    placeholder="Mumbai"
                    className="input-field py-2.5 text-sm"
                  />
                </div>

                {/* State */}
                <div>
                  <label className="block text-xs font-bold text-luxury-800 uppercase tracking-wider mb-1.5">
                    State *
                  </label>
                  <input
                    type="text"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    required
                    placeholder="Maharashtra"
                    className="input-field py-2.5 text-sm"
                  />
                </div>

                {/* Country */}
                <div>
                  <label className="block text-xs font-bold text-luxury-800 uppercase tracking-wider mb-1.5">
                    Country *
                  </label>
                  <input
                    type="text"
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                    required
                    placeholder="India"
                    className="input-field py-2.5 text-sm"
                  />
                </div>

                {/* Pincode */}
                <div>
                  <label className="block text-xs font-bold text-luxury-800 uppercase tracking-wider mb-1.5">
                    Pincode *
                  </label>
                  <input
                    type="text"
                    name="pincode"
                    value={formData.pincode}
                    onChange={handleChange}
                    required
                    placeholder="400001"
                    className="input-field py-2.5 text-sm"
                  />
                </div>
              </div>

              {/* Payment Section */}
              <div className="mt-8 pt-8 border-t border-luxury-200">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-serif text-xl font-bold text-luxury-900">
                    Payment Method
                  </h2>
                  <div className="flex items-center text-green-600 text-xs font-semibold uppercase tracking-wider">
                    <Lock className="w-3.5 h-3.5 mr-1" />
                    Secure Checkout
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Razorpay Card */}
                  {paymentConfig.razorpay?.enabled && (
                    <button
                      type="button"
                      onClick={() => setSelectedPaymentMethod('razorpay')}
                      className={`rounded-xl p-4 flex items-center border-2 transition-all text-left ${
                        selectedPaymentMethod === 'razorpay' 
                          ? 'border-gold-500 bg-gold-50/10' 
                          : 'border-luxury-100 bg-white hover:border-luxury-300'
                      }`}
                    >
                      <CreditCard className="w-8 h-8 text-gold-600 mr-3 flex-shrink-0" />
                      <div>
                        <p className="font-bold text-sm text-luxury-900">Pay with Razorpay</p>
                        <p className="text-xs text-luxury-500 mt-0.5">Pay securely with cards, UPI, wallets</p>
                        {paymentConfig.razorpay?.minOrderValue > 0 && (
                          <p className="text-[10px] text-gold-650 font-bold mt-1">Min: ₹{paymentConfig.razorpay.minOrderValue}</p>
                        )}
                      </div>
                    </button>
                  )}

                  {/* COD Card */}
                  {paymentConfig.cod?.enabled && (
                    <button
                      type="button"
                      onClick={() => setSelectedPaymentMethod('cod')}
                      className={`rounded-xl p-4 flex items-center border-2 transition-all text-left ${
                        selectedPaymentMethod === 'cod' 
                          ? 'border-gold-500 bg-gold-50/10' 
                          : 'border-luxury-100 bg-white hover:border-luxury-300'
                      }`}
                    >
                      <Truck className="w-8 h-8 text-gold-600 mr-3 flex-shrink-0" />
                      <div>
                        <p className="font-bold text-sm text-luxury-900">Cash on Delivery</p>
                        <p className="text-xs text-luxury-500 mt-0.5">Pay when your order arrives</p>
                        <div className="flex gap-2 mt-1">
                          {paymentConfig.cod?.minOrderValue > 0 && (
                            <span className="text-[10px] text-gold-650 font-bold">Min: ₹{paymentConfig.cod.minOrderValue}</span>
                          )}
                          {paymentConfig.cod?.maxOrderValue < 50000 && (
                            <span className="text-[10px] text-red-500 font-bold">Max: ₹{paymentConfig.cod.maxOrderValue}</span>
                          )}
                        </div>
                      </div>
                    </button>
                  )}

                  {!paymentConfig.razorpay?.enabled && !paymentConfig.cod?.enabled && (
                    <div className="col-span-2 p-4 bg-red-50 border border-red-200 rounded-xl text-center text-red-700 text-sm font-semibold">
                      Online checkouts are temporarily disabled. Please contact support.
                    </div>
                  )}
                </div>
                
                     {selectedPaymentMethod === 'razorpay' && paymentConfig.partial?.enabled && finalTotal >= (paymentConfig.partial?.minOrderValue || 10000) && (
                  <div className="mt-4 p-4 rounded-xl border border-gold-200 bg-gold-50/5 flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="partialPay"
                      checked={usePartialPayment}
                      onChange={(e) => setUsePartialPayment(e.target.checked)}
                      className="w-4 h-4 mt-1 accent-gold-500 cursor-pointer"
                    />
                    <label htmlFor="partialPay" className="cursor-pointer select-none">
                      <p className="text-sm font-bold text-luxury-900">Enable Partial Payment ({paymentConfig.partial.partialPercentage}% Deposit)</p>
                      <p className="text-xs text-luxury-600 mt-0.5 leading-relaxed">
                        Pay ₹{Math.round((finalTotal * paymentConfig.partial.partialPercentage) / 100).toLocaleString()} now, and the remaining ₹{Math.round(finalTotal - (finalTotal * paymentConfig.partial.partialPercentage) / 100).toLocaleString()} on delivery!
                      </p>
                    </label>
                  </div>
                )}
                
                <div className="mt-4 text-xs text-luxury-500 font-medium leading-relaxed">
                  {selectedPaymentMethod === 'cod' ? (
                    <span>COD orders will show as <span className="font-bold text-luxury-700">Pending</span> until payment is received.</span>
                  ) : (
                    <span>Secure Razorpay payment. You will be redirected to Razorpay checkout.</span>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || (!paymentConfig.razorpay?.enabled && !paymentConfig.cod?.enabled)}
                className="mt-6 w-full btn-primary py-3 flex items-center justify-center font-bold tracking-wider text-sm shadow-md"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    {selectedPaymentMethod === 'cod'
                      ? `Place COD Order ₹${finalTotal.toLocaleString()}`
                      : usePartialPayment && paymentConfig.partial?.enabled && finalTotal >= (paymentConfig.partial?.minOrderValue || 10000)
                        ? `Pay Deposit ₹${Math.round((finalTotal * paymentConfig.partial.partialPercentage) / 100).toLocaleString()}`
                        : `Pay ₹${finalTotal.toLocaleString()}`}
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Sticky Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-md p-6 sticky top-24 border border-luxury-100 flex flex-col gap-6">
              <div>
                <h2 className="font-serif text-xl font-bold text-luxury-900 mb-4">
                  Order Summary
                </h2>
                
                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                  {cartItems.map(item => (
                    <div key={item.id} className="flex gap-3">
                      <img
                        src={getOptimizedImageUrl(item.image, { width: 120, quality: 60 })}
                        alt={item.name}
                        className="w-14 h-14 object-cover rounded-lg bg-luxury-50 border border-luxury-100 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-luxury-900 truncate">
                          {item.name}
                        </p>
                        <p className="text-[11px] text-luxury-500 font-medium mt-0.5">Qty: {item.quantity}</p>
                        <p className="text-xs font-bold text-luxury-800 mt-1">
                          ₹{(item.price * item.quantity).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Promo Code Input Section */}
              <div className="pt-4 border-t border-luxury-150">
                <p className="text-xs font-bold text-luxury-800 mb-2">Have a Promo Code?</p>
                {appliedCoupon ? (
                  <div className="flex items-center justify-between bg-luxury-50 border border-luxury-200 rounded-lg p-2.5">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-luxury-900 uppercase truncate">{appliedCoupon.code}</p>
                      <p className="text-[10px] text-green-600 font-medium">₹{couponDiscount.toLocaleString()} Saved</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveCoupon}
                      className="text-xs font-bold text-red-600 hover:text-red-700 transition px-2 py-1"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Enter code (e.g. SAVE10)"
                      value={couponCodeInput}
                      onChange={(e) => setCouponCodeInput(e.target.value)}
                      className="flex-1 text-xs border border-luxury-200 rounded-lg px-3 py-2 uppercase placeholder:normal-case focus:outline-none focus:border-gold-500"
                    />
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      disabled={couponLoading}
                      className="bg-luxury-900 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-luxury-800 transition disabled:opacity-50"
                    >
                      {couponLoading ? "..." : "Apply"}
                    </button>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-luxury-150 space-y-2.5">
                <div className="flex justify-between text-xs text-luxury-600 font-medium">
                  <span>Subtotal</span>
                  <span>₹{subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs text-luxury-600 font-medium">
                  <span>Shipping</span>
                  <span>{dynamicShipping === 0 ? 'Free' : `₹${dynamicShipping}`}</span>
                </div>
                {estDeliveryDate && (
                  <div className="text-[10px] text-gold-650 font-bold -mt-2 flex items-center gap-1.5 justify-end">
                    <Truck className="w-3.5 h-3.5" />
                    Delivery by: {estDeliveryDate} {courierName && `(${courierName})`}
                  </div>
                )}
                {pincodeError && (
                  <p className="text-red-500 text-[10px] font-bold text-right -mt-2">{pincodeError}</p>
                )}
                <div className="flex justify-between text-xs text-luxury-600 font-medium">
                  <span>Tax</span>
                  <span>₹{tax.toLocaleString()}</span>
                </div>
                
                {/* Coupon discount display */}
                {appliedCoupon && (
                  <div className="flex justify-between text-xs font-semibold text-green-650 bg-green-50/50 p-2 rounded-lg border border-green-100">
                    <span className="flex items-center gap-1 text-green-700">
                      Discount ({appliedCoupon.code})
                    </span>
                    <span className="text-green-700">-₹{couponDiscount.toLocaleString()}</span>
                  </div>
                )}

                <div className="flex justify-between text-base font-bold text-luxury-900 pt-3 border-t border-luxury-150">
                  <span>Total</span>
                  <span>₹{finalTotal.toLocaleString()}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-luxury-150 flex items-center justify-center gap-2 text-[10px] font-bold text-green-600 uppercase tracking-wider bg-green-50/50 py-2 rounded-lg">
                <Lock className="w-3.5 h-3.5" />
                Payments secured by Razorpay
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
