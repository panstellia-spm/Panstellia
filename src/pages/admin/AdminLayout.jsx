import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
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
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import GlobalSearch from '../../components/admin/GlobalSearch';

const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    ],
  },
  {
    label: 'Operations',
    items: [
      { to: '/admin/orders', label: 'Orders', icon: ShoppingBag },
      { to: '/admin/inventory', label: 'Inventory', icon: Warehouse },
    ],
  },
  {
    label: 'Catalog',
    items: [
      { to: '/admin/products', label: 'Products', icon: Package },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { to: '/admin/customers', label: 'Customers', icon: Users },
      { to: '/admin/revenue', label: 'Revenue', icon: DollarSign },
      { to: '/admin/reports', label: 'Reports', icon: BarChart3 },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/admin/logs', label: 'Activity Logs', icon: Activity },
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
      <item.icon
        className={`flex-shrink-0 w-5 h-5 transition-colors ${isActive ? 'text-gold-600' : 'text-luxury-500 group-hover:text-luxury-700'}`}
      />
      {!collapsed && (
        <span className="truncate">{item.label}</span>
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
  const { user, logout } = useAuth();
  const navigate = useNavigate();

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
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-widest text-luxury-400">
                {group.label}
              </p>
            )}
            {collapsed && <div className="my-2 border-t border-luxury-200/60" />}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <SidebarNavItem key={item.to} item={item} collapsed={collapsed} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User Footer */}
      <div className={`border-t border-luxury-200/60 p-3 ${collapsed ? 'flex flex-col items-center gap-2' : ''}`}>
        {!collapsed && (
          <div className="flex items-center gap-2.5 px-2 py-2 mb-2 rounded-xl bg-luxury-50">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
              {(user?.email?.[0] || 'A').toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-luxury-900 truncate">Admin</p>
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
    <div className="min-h-screen bg-luxury-50 flex">
      {/* Desktop Sidebar */}
      <aside className={`
        hidden lg:flex flex-col flex-shrink-0 bg-white border-r border-luxury-200
        shadow-sm transition-all duration-300 ease-in-out
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
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
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
            <button
              title="Alerts"
              className="relative p-2 rounded-xl text-luxury-500 hover:text-luxury-800 hover:bg-luxury-100 transition-colors"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-red-500" />
            </button>
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-luxury-600 border border-luxury-200 hover:bg-luxury-50 transition-colors"
            >
              View Store
            </a>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
