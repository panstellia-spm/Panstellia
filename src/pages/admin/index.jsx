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

export default function AdminRouter() {
  return (
    <AdminLayout>
      <Suspense fallback={<AdminPageLoader />}>
        <Routes>
          {/* Dashboard */}
          <Route index element={<AdminDashboard />} />

          {/* Order Management */}
          <Route path="orders" element={<AdminOrders />} />
          <Route path="orders/:id" element={<AdminOrderDetail />} />

          {/* Fulfillment Operations */}
          <Route path="fulfillment" element={<AdminFulfillment />} />
          <Route path="shipping" element={<AdminShipping />} />
          <Route path="delayed" element={<AdminDelayed />} />

          {/* Intelligence */}
          <Route path="order-analytics" element={<AdminOrderAnalytics />} />

          {/* Catalog */}
          <Route path="products" element={<AdminProducts />} />
          <Route path="inventory" element={<AdminInventory />} />

          {/* Customers */}
          <Route path="customers" element={<AdminCustomers />} />

          {/* Revenue & Reports */}
          <Route path="revenue" element={
            <div className="max-w-[1400px]">
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-luxury-900">Revenue</h1>
                <p className="text-sm text-luxury-500 mt-0.5">Payment analytics and transaction records</p>
              </div>
              <RevenueAdmin />
            </div>
          } />
          <Route path="reports" element={
            <div className="max-w-[1400px]">
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-luxury-900">Reports</h1>
                <p className="text-sm text-luxury-500 mt-0.5">Detailed order reports with export capability</p>
              </div>
              <ReportsAdmin />
            </div>
          } />

          {/* System */}
          <Route path="logs" element={<AdminActivityLogs />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </Suspense>
    </AdminLayout>
  );
}
