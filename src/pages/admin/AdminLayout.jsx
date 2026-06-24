import { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation, Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Warehouse,
  Users,
  DollarSign,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  LogOut,
  Crown,
  Bell,
  Settings,
  AlertTriangle,
  Activity,
  Truck,
  Clock,
  TrendingUp,
  Zap,
  Sparkles,
  Gift,
  Star,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import GlobalSearch from '../../components/admin/GlobalSearch';
import { db } from '../../services/firebase';
import { collection, query, orderBy, limit, onSnapshot, doc, updateDoc, writeBatch } from 'firebase/firestore';

const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true, roles: ['super_admin', 'admin', 'content_manager', 'inventory_manager', 'marketing_manager', 'customer_support', 'viewer'] },
    ],
  },
  {
    label: 'Operations',
    items: [
      { to: '/admin/orders', label: 'Orders', icon: ShoppingBag, roles: ['super_admin', 'admin', 'customer_support'] },
      { to: '/admin/fulfillment', label: 'Fulfillment', icon: Zap, roles: ['super_admin', 'admin', 'inventory_manager', 'customer_support'] },
      { to: '/admin/shipping', label: 'Shipping', icon: Truck, roles: ['super_admin', 'admin', 'inventory_manager', 'customer_support'] },
      { to: '/admin/delayed', label: 'Delayed Orders', icon: Clock, alert: true, roles: ['super_admin', 'admin', 'inventory_manager', 'customer_support'] },
      { to: '/admin/inventory', label: 'Inventory', icon: Warehouse, roles: ['super_admin', 'admin', 'inventory_manager'] },
    ],
  },
  {
    label: 'Catalog',
    items: [
      { to: '/admin/products', label: 'Products', icon: Package, roles: ['super_admin', 'admin', 'content_manager', 'inventory_manager'] },
      { to: '/admin/collections', label: 'Collections & Filters', icon: Sparkles, roles: ['super_admin', 'admin', 'content_manager'] },
    ],
  },
  {
    label: 'Builders',
    items: [
      { to: '/admin/homepage', label: 'Homepage Builder', icon: LayoutDashboard, roles: ['super_admin', 'admin', 'content_manager'] },
      { to: '/admin/landing-pages', label: 'Landing Pages', icon: Crown, roles: ['super_admin', 'admin', 'content_manager', 'marketing_manager'] },
      { to: '/admin/offers', label: 'Offers & Coupons', icon: Gift, roles: ['super_admin', 'admin', 'marketing_manager'] },
      { to: '/admin/reviews', label: 'Review Moderation', icon: Star, roles: ['super_admin', 'admin', 'content_manager', 'customer_support'] },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { to: '/admin/customers', label: 'Customers', icon: Users, roles: ['super_admin', 'admin', 'customer_support'] },
      { to: '/admin/order-analytics', label: 'Order Analytics', icon: TrendingUp, roles: ['super_admin', 'admin', 'viewer'] },
      { to: '/admin/revenue', label: 'Revenue', icon: DollarSign, roles: ['super_admin', 'admin', 'viewer'] },
      { to: '/admin/reports', label: 'Reports', icon: BarChart3, roles: ['super_admin', 'admin', 'viewer'] },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/admin/settings', label: 'CMS & Payments', icon: Settings, roles: ['super_admin', 'admin'] },
      { to: '/admin/roles', label: 'User Roles', icon: Users, roles: ['super_admin'] },
      { to: '/admin/logs', label: 'Activity Logs', icon: Activity, roles: ['super_admin', 'admin'] },
    ],
  },
];

function SidebarNavItem({ item, collapsed }) {
  const location = useLocation();
  const isActive = item.exact
    ? location.pathname === item.to
    : location.pathname.startsWith(item.to);

  return (
    <NavLink
      to={item.to}
      title={collapsed ? item.label : undefined}
      className={`
        group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
        transition-all duration-200 select-none
        ${isActive
          ? 'bg-gold-500/15 text-gold-700 shadow-sm border border-gold-200/60'
          : 'text-luxury-600 hover:bg-luxury-100 hover:text-luxury-900'
        }
      `}
    >
      <div className="relative flex-shrink-0">
        <item.icon
          className={`w-5 h-5 transition-colors ${isActive ? 'text-gold-600' : 'text-luxury-500 group-hover:text-luxury-700'}`}
        />
        {item.alert && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500 border-2 border-white" />
        )}
      </div>
      {!collapsed && (
        <span className="truncate flex-1">{item.label}</span>
      )}
      {isActive && !collapsed && (
        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-gold-500" />
      )}
      {collapsed && (
        <div className="
          absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2 py-1 bg-luxury-900 text-white
          text-xs rounded-lg whitespace-nowrap opacity-0 pointer-events-none
          group-hover:opacity-100 transition-opacity duration-150 z-50
          shadow-xl
        ">
          {item.label}
          <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-luxury-900" />
        </div>
      )}
    </NavLink>
  );
}


export default function AdminLayout({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout, hasPermission, role, userData } = useAuth();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const popoverRef = useRef(null);

  // Click outside dropdown handler
  useEffect(() => {
    function handleClickOutside(event) {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Listen to admin notifications real-time
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'admin_notifications'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = [];
      snapshot.forEach((doc) => {
        notifs.push({ id: doc.id, ...doc.data() });
      });
      setNotifications(notifs);
    }, (error) => {
      console.error('Error fetching admin notifications:', error);
    });
    return () => unsubscribe();
  }, [user]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleNotificationClick = async (notif) => {
    setDropdownOpen(false);
    if (!notif.read) {
      try {
        await updateDoc(doc(db, 'admin_notifications', notif.id), { read: true });
      } catch (err) {
        console.error('Failed to mark notification as read:', err);
      }
    }
    if (notif.type === 'order') {
      navigate('/admin/orders');
    } else if (notif.type === 'inventory') {
      navigate('/admin/inventory');
    }
  };

  const markAllAsRead = async () => {
    try {
      const batch = writeBatch(db);
      notifications.filter(n => !n.read).forEach(n => {
        const ref = doc(db, 'admin_notifications', n.id);
        batch.update(ref, { read: true });
      });
      await batch.commit();
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  };

  const formatRelativeTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const SidebarContent = ({ onClose }) => (
    <div className="flex flex-col h-full">
      {/* Brand Header */}
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-luxury-200/60 ${collapsed ? 'justify-center' : ''}`}>
        <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-gold-500 to-gold-700 flex items-center justify-center shadow-lg">
          <Crown className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-xs font-bold text-gold-700 uppercase tracking-widest leading-none">Panstellia</p>
            <p className="text-xs text-luxury-500 mt-0.5 leading-none">Administration</p>
          </div>
        )}
        {onClose && (
          <button onClick={onClose} className="ml-auto p-1 rounded-lg text-luxury-400 hover:text-luxury-700 hover:bg-luxury-100">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5 scrollbar-hide">
        {NAV_GROUPS.map((group) => {
          const visibleItems = group.items.filter(item => hasPermission(item.roles));
          if (visibleItems.length === 0) return null;
          return (
            <div key={group.label}>
              {!collapsed && (
                <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-widest text-luxury-400">
                  {group.label}
                </p>
              )}
              {collapsed && <div className="my-2 border-t border-luxury-200/60" />}
              <div className="space-y-0.5">
                {visibleItems.map((item) => (
                  <SidebarNavItem key={item.to} item={item} collapsed={collapsed} />
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      {/* User Footer */}
      <div className={`border-t border-luxury-200/60 p-3 ${collapsed ? 'flex flex-col items-center gap-2' : ''}`}>
        {!collapsed && (
          <div className="flex items-center gap-2.5 px-2 py-2 mb-2 rounded-xl bg-luxury-50">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
              {(userData?.name?.[0] || user?.email?.[0] || 'A').toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 mb-0.5">
                <p className="text-xs font-semibold text-luxury-900 truncate">{userData?.name || 'Admin'}</p>
                <span className="flex-shrink-0 px-1.5 py-0.5 bg-gold-100 border border-gold-200 rounded text-[9px] font-bold text-gold-700 uppercase tracking-wider">{String(role || 'admin').replace('_', ' ')}</span>
              </div>
              <p className="text-xs text-luxury-500 truncate">{user?.email}</p>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          title="Logout"
          className={`flex items-center gap-2 w-full px-3 py-2 rounded-xl text-sm text-luxury-600 hover:text-red-600 hover:bg-red-50 transition-all ${collapsed ? 'justify-center' : ''}`}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="h-screen bg-luxury-50 flex overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className={`
        hidden lg:flex flex-col flex-shrink-0 bg-white border-r border-luxury-200
        shadow-sm transition-all duration-300 ease-in-out h-screen overflow-hidden
        ${collapsed ? 'w-16' : 'w-60'}
      `}>
        <SidebarContent />
        {/* Collapse Toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute left-0 bottom-24 translate-x-[calc(100%+0.75rem)] lg:translate-x-0 lg:left-auto lg:bottom-auto lg:top-1/2 lg:-translate-y-1/2 lg:right-0 lg:translate-x-1/2
            z-10 w-6 h-6 rounded-full bg-white border border-luxury-200 shadow-md flex items-center justify-center
            text-luxury-500 hover:text-luxury-800 hover:border-luxury-300 transition-all
            hidden lg:flex
          "
          style={{ position: 'fixed', left: collapsed ? '52px' : '228px', top: '50%', transform: 'translateY(-50%)' }}
        >
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-[60] flex">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="relative z-50 flex flex-col w-72 bg-white shadow-2xl">
            <SidebarContent onClose={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden h-screen">
        {/* Top Header Bar */}
        <header className="h-14 bg-white border-b border-luxury-200 flex items-center gap-4 px-4 lg:px-6 flex-shrink-0 shadow-sm">
          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden p-2 rounded-lg text-luxury-500 hover:text-luxury-800 hover:bg-luxury-100"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Page identity */}
          <div className="flex items-center gap-2">
            <Crown className="w-4 h-4 text-gold-500 hidden sm:block" />
            <span className="text-sm font-semibold text-luxury-700 hidden sm:block">Panstellia Admin Panel</span>
          </div>

          {/* Global Search */}
          <div className="flex-1 flex justify-center max-w-sm mx-auto">
            <GlobalSearch />
          </div>

          {/* Right side actions */}
          <div className="ml-auto flex items-center gap-2">
            {/* Notification Bell & Dropdown */}
            <div className="relative" ref={popoverRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                title="Notifications"
                className="relative p-2 rounded-xl text-luxury-500 hover:text-luxury-800 hover:bg-luxury-100 transition-colors"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-1 ring-white">
                    {unreadCount}
                  </span>
                )}
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2.5 w-80 sm:w-96 bg-white border border-luxury-200 rounded-2xl shadow-xl z-50 overflow-hidden">
                  {/* Popover Header */}
                  <div className="flex items-center justify-between px-4 py-3 bg-luxury-50/50 border-b border-luxury-200">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-luxury-800 text-sm">Notifications</span>
                      {unreadCount > 0 && (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold bg-gold-100 border border-gold-200 text-gold-700 rounded-full">
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-xs font-semibold text-gold-600 hover:text-gold-700 transition-colors"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>

                  {/* Popover List */}
                  <div className="max-h-[360px] overflow-y-auto divide-y divide-luxury-100">
                    {notifications.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                        <div className="w-10 h-10 rounded-full bg-luxury-50 flex items-center justify-center mb-2 text-luxury-400">
                          <Bell className="w-5 h-5" />
                        </div>
                        <p className="text-xs font-medium text-luxury-600">No notifications yet</p>
                        <p className="text-[11px] text-luxury-400 mt-0.5">Alerts for orders & stock levels appear here.</p>
                      </div>
                    ) : (
                      notifications.map((notif) => {
                        const Icon = notif.type === 'order' ? ShoppingBag : notif.type === 'inventory' ? AlertTriangle : Bell;
                        const iconColor = notif.type === 'order' ? 'text-gold-600 bg-gold-50' : notif.type === 'inventory' ? 'text-amber-600 bg-amber-50' : 'text-luxury-500 bg-luxury-50';
                        
                        return (
                          <div
                            key={notif.id}
                            onClick={() => handleNotificationClick(notif)}
                            className={`flex gap-3 px-4 py-3 hover:bg-luxury-50/50 cursor-pointer transition-colors ${
                              !notif.read ? 'bg-gold-50/20 border-l-2 border-gold-500' : ''
                            }`}
                          >
                            <div className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center ${iconColor}`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1.5">
                                <p className={`text-xs truncate ${!notif.read ? 'font-bold text-luxury-900' : 'font-semibold text-luxury-800'}`}>
                                  {notif.title}
                                </p>
                                <span className="text-[10px] text-luxury-400 flex-shrink-0">
                                  {formatRelativeTime(notif.createdAt)}
                                </span>
                              </div>
                              <p className="text-[11px] text-luxury-500 mt-0.5 line-clamp-2 leading-relaxed">
                                {notif.message}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
            <Link
              to="/"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-luxury-600 border border-luxury-200 hover:bg-luxury-50 transition-colors"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Official Platform
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6" style={{ scrollBehavior: 'smooth' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
