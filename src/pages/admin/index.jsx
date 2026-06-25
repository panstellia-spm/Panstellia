import { Routes, Route, Navigate } from 'react-router-dom';
import { Suspense } from 'react';
import AdminLayout from './AdminLayout';
import AdminDashboard from './AdminDashboard';
import AdminOrders from './AdminOrders';
import AdminOrderDetail from './AdminOrderDetail';
import AdminFulfillment from './AdminFulfillment';
import AdminShipping from './AdminShipping';
import AdminDelayed from './AdminDelayed';
import AdminOrderAnalytics from './AdminOrderAnalytics';
import AdminProducts from './AdminProducts';
import AdminInventory from './AdminInventory';
import AdminCustomers from './AdminCustomers';
import AdminActivityLogs from './AdminActivityLogs';
import RevenueAdmin from '../RevenueAdmin';
import ReportsAdmin from '../ReportsAdmin';

// New builder pages
import AdminHomepage from './AdminHomepage';
import AdminSettings from './AdminSettings';
import AdminLandingPages from './AdminLandingPages';
import AdminOffers from './AdminOffers';
import AdminReviews from './AdminReviews';
import AdminCollections from './AdminCollections';
import AdminRoles from './AdminRoles';
import AdminShippingFee from './AdminShippingFee';

import { useAuth } from '../../context/AuthContext';

function AdminPageLoader() {
  return (
    <div className="space-y-4">
      <div className="skeleton h-8 w-48 rounded-xl" />
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-28 rounded-2xl" />)}
      </div>
      <div className="skeleton h-64 rounded-2xl" />
    </div>
  );
}

function AdminPermissionRoute({ children, allowedRoles }) {
  const { hasPermission } = useAuth();
  if (!hasPermission(allowedRoles)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 bg-white rounded-2xl shadow-md border border-luxury-100 p-8">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4 text-red-600">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="font-serif text-2xl font-bold text-luxury-900 mb-2">Access Denied</h2>
        <p className="text-xs text-luxury-500 max-w-md">
          Your account role does not have permission to view this section of the administration panel. Please contact the administrator if you believe this is in error.
        </p>
      </div>
    );
  }
  return children;
}

export default function AdminRouter() {
  return (
    <AdminLayout>
      <Suspense fallback={<AdminPageLoader />}>
        <Routes>
          {/* Dashboard */}
          <Route index element={<AdminDashboard />} />

          {/* Order Management */}
          <Route path="orders" element={
            <AdminPermissionRoute allowedRoles={['super_admin', 'admin', 'customer_support']}>
              <AdminOrders />
            </AdminPermissionRoute>
          } />
          <Route path="orders/:id" element={
            <AdminPermissionRoute allowedRoles={['super_admin', 'admin', 'customer_support']}>
              <AdminOrderDetail />
            </AdminPermissionRoute>
          } />

          {/* Fulfillment Operations */}
          <Route path="fulfillment" element={
            <AdminPermissionRoute allowedRoles={['super_admin', 'admin', 'inventory_manager', 'customer_support']}>
              <AdminFulfillment />
            </AdminPermissionRoute>
          } />
          <Route path="shipping" element={
            <AdminPermissionRoute allowedRoles={['super_admin', 'admin', 'inventory_manager', 'customer_support']}>
              <AdminShipping />
            </AdminPermissionRoute>
          } />
          <Route path="shipping-fee" element={
            <AdminPermissionRoute allowedRoles={['super_admin', 'admin']}>
              <AdminShippingFee />
            </AdminPermissionRoute>
          } />
          <Route path="delayed" element={
            <AdminPermissionRoute allowedRoles={['super_admin', 'admin', 'inventory_manager', 'customer_support']}>
              <AdminDelayed />
            </AdminPermissionRoute>
          } />

          {/* Intelligence */}
          <Route path="order-analytics" element={
            <AdminPermissionRoute allowedRoles={['super_admin', 'admin', 'viewer']}>
              <AdminOrderAnalytics />
            </AdminPermissionRoute>
          } />

          {/* Catalog */}
          <Route path="products" element={
            <AdminPermissionRoute allowedRoles={['super_admin', 'admin', 'content_manager', 'inventory_manager']}>
              <AdminProducts />
            </AdminPermissionRoute>
          } />
          <Route path="inventory" element={
            <AdminPermissionRoute allowedRoles={['super_admin', 'admin', 'inventory_manager']}>
              <AdminInventory />
            </AdminPermissionRoute>
          } />

          {/* Builders */}
          <Route path="homepage" element={
            <AdminPermissionRoute allowedRoles={['super_admin', 'admin', 'content_manager']}>
              <AdminHomepage />
            </AdminPermissionRoute>
          } />
          <Route path="landing-pages" element={
            <AdminPermissionRoute allowedRoles={['super_admin', 'admin', 'content_manager', 'marketing_manager']}>
              <AdminLandingPages />
            </AdminPermissionRoute>
          } />
          <Route path="offers" element={
            <AdminPermissionRoute allowedRoles={['super_admin', 'admin', 'marketing_manager']}>
              <AdminOffers />
            </AdminPermissionRoute>
          } />
          <Route path="reviews" element={
            <AdminPermissionRoute allowedRoles={['super_admin', 'admin', 'content_manager', 'customer_support']}>
              <AdminReviews />
            </AdminPermissionRoute>
          } />
          <Route path="collections" element={
            <AdminPermissionRoute allowedRoles={['super_admin', 'admin', 'content_manager']}>
              <AdminCollections />
            </AdminPermissionRoute>
          } />

          {/* Customers */}
          <Route path="customers" element={
            <AdminPermissionRoute allowedRoles={['super_admin', 'admin', 'customer_support']}>
              <AdminCustomers />
            </AdminPermissionRoute>
          } />

          {/* Revenue & Reports */}
          <Route path="revenue" element={
            <AdminPermissionRoute allowedRoles={['super_admin', 'admin', 'viewer']}>
              <div className="max-w-[1400px]">
                <div className="mb-6">
                  <h1 className="text-2xl font-bold text-luxury-900">Revenue</h1>
                  <p className="text-sm text-luxury-500 mt-0.5">Payment analytics and transaction records</p>
                </div>
                <RevenueAdmin />
              </div>
            </AdminPermissionRoute>
          } />
          <Route path="reports" element={
            <AdminPermissionRoute allowedRoles={['super_admin', 'admin', 'viewer']}>
              <div className="max-w-[1400px]">
                <div className="mb-6">
                  <h1 className="text-2xl font-bold text-luxury-900">Reports</h1>
                  <p className="text-sm text-luxury-500 mt-0.5">Detailed order reports with export capability</p>
                </div>
                <ReportsAdmin />
              </div>
            </AdminPermissionRoute>
          } />

          {/* System */}
          <Route path="settings" element={
            <AdminPermissionRoute allowedRoles={['super_admin', 'admin']}>
              <AdminSettings />
            </AdminPermissionRoute>
          } />
          <Route path="roles" element={
            <AdminPermissionRoute allowedRoles={['super_admin']}>
              <AdminRoles />
            </AdminPermissionRoute>
          } />
          <Route path="logs" element={
            <AdminPermissionRoute allowedRoles={['super_admin', 'admin']}>
              <AdminActivityLogs />
            </AdminPermissionRoute>
          } />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </Suspense>
    </AdminLayout>
  );
}
