import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Package, CheckCircle, XCircle, Clock, ChevronLeft } from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';

import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import SEOHelmet from '../utils/seoHelmet';

const OrderDetailsPage = () => {
  const { id } = useParams();
  const { user } = useAuth();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!user || !id) return;

      setLoading(true);
      setError(null);

      try {
        const ordersRef = collection(db, 'orders');
        const q = query(
          ordersRef,
          where('userId', '==', user.uid),
          where('__name__', '==', id)
        );

        const snap = await getDocs(q);

        if (snap.empty) {
          setOrder(null);
        } else {
          const doc = snap.docs[0];
          setOrder({ id: doc.id, ...doc.data() });
        }
      } catch (e) {
        console.error('Error fetching order:', e);
        setError(e);
        setOrder(null);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [user, id]);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'cancelled':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'delivered':
        return 'badge-success';
      case 'cancelled':
        return 'badge-error';
      default:
        return 'badge-warning';
    }
  };

  const status = order?.status || 'unknown';

  return (
    <div className="min-h-screen bg-luxury-50 py-8">
      <SEOHelmet
        title={`Order Details | Panstellia`}
        description="View your order status and order information."
        keywords="order status, order details"
        canonical={`https://panstellia.com/order/${id}`}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 mb-6">
          <Link
            to="/orders"
            className="text-gold-600 hover:text-gold-700 flex items-center"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Orders
          </Link>
        </div>

        {loading ? (
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="skeleton h-6 w-40 mb-4" />
              <div className="skeleton h-10 w-64" />
            </div>
          </div>
        ) : error ? (
          <div className="bg-white rounded-xl shadow-md p-6 text-center">
            <Package className="w-12 h-12 text-luxury-300 mx-auto" />
            <h2 className="mt-4 font-serif text-xl font-bold text-luxury-900">
              Unable to load order
            </h2>
            <p className="mt-2 text-luxury-600">Please try again later.</p>
            <Link to="/orders" className="mt-4 btn-primary inline-flex">
              View Orders
            </Link>
          </div>
        ) : !order ? (
          <div className="bg-white rounded-xl shadow-md p-6 text-center">
            <Package className="w-12 h-12 text-luxury-300 mx-auto" />
            <h2 className="mt-4 font-serif text-xl font-bold text-luxury-900">
              Order not found
            </h2>
            <p className="mt-2 text-luxury-600">It may have been removed or you do not have access.</p>
            <Link to="/orders" className="mt-4 btn-primary inline-flex">
              View Orders
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-luxury-500">Order #{order.id.slice(0, 8).toUpperCase()}</p>
                <p className="text-sm text-luxury-500">
                  {order.createdAt?.toDate?.().toLocaleDateString() ||
                    new Date(order.createdAt).toLocaleDateString()}
                </p>
              </div>

              <div className={`badge ${getStatusColor(status)}`}>
                {getStatusIcon(status)}
                <span className="ml-1 capitalize">{status}</span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-luxury-200">
              <h2 className="font-semibold text-luxury-900 mb-2">Status</h2>
              <div className={`badge ${getStatusColor(status)} inline-flex items-center`}>
                {getStatusIcon(status)}
                <span className="ml-1 capitalize">{status}</span>
              </div>

              {order.items?.length > 0 && (
                <div className="mt-6">
                  <h2 className="font-semibold text-luxury-900 mb-3">Items</h2>
                  <div className="space-y-3">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-luxury-900 font-medium">{item.name}</p>
                          <p className="text-sm text-luxury-600">Qty: {item.quantity}</p>
                        </div>
                        <p className="text-luxury-900 font-semibold">
                          ₹{item.price?.toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-6 flex items-center justify-between">
                <div className="text-sm text-luxury-600">Total</div>
                <div className="font-semibold text-luxury-900">
                  ₹{order.total?.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderDetailsPage;

