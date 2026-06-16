import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Package, CheckCircle, XCircle, Clock, ChevronLeft, Truck } from 'lucide-react';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';

import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import SEOHelmet from '../utils/seoHelmet';
import { getOptimizedImageUrl } from '../utils/imageUtils';

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
        // 1a) Try fetching directly from `orders` collection by document ID
        const orderDocRef = doc(db, 'orders', id);
        const orderDocSnap = await getDoc(orderDocRef);

        if (orderDocSnap.exists()) {
          const data = orderDocSnap.data();
          if (data.userId === user.uid) {
            setOrder({ id: orderDocSnap.id, ...data });
            return;
          }
        }

        // 1b) Try querying `orders` collection by `orderId` field
        const ordersRef = collection(db, 'orders');
        const qOrders = query(
          ordersRef,
          where('userId', '==', user.uid),
          where('orderId', '==', id)
        );
        const snapOrders = await getDocs(qOrders);

        if (!snapOrders.empty) {
          const doc = snapOrders.docs[0];
          setOrder({ id: doc.id, ...doc.data() });
          return;
        }

        // 2a) Fallback: Try fetching directly from `payments` collection by document ID
        const paymentDocRef = doc(db, 'payments', id);
        const paymentDocSnap = await getDoc(paymentDocRef);

        if (paymentDocSnap.exists()) {
          const data = paymentDocSnap.data();
          if (data.userId === user.uid) {
            setOrder({
              id: paymentDocSnap.id,
              status: data.paymentStatus || data.status || 'paid',
              total: data.amount ? (Number(data.amount) / 100) : data.total,
              items: data.items || [],
              paymentMethod: data.paymentMethod,
              address: data.shippingAddress,
              city: data.shippingCity,
              state: data.shippingState,
              pincode: data.shippingPincode,
              shipping: data.shipping,
              tax: data.tax || data.gst,
              gst: data.gst,
              createdAt: data.createdAt,
            });
            return;
          }
        }

        // 2b) Try querying `payments` collection by `orderId` field
        const paymentsRef = collection(db, 'payments');
        const qPayments = query(
          paymentsRef,
          where('userId', '==', user.uid),
          where('orderId', '==', id)
        );
        const snapPayments = await getDocs(qPayments);

        if (!snapPayments.empty) {
          const doc = snapPayments.docs[0];
          const data = doc.data();

          setOrder({
            id: doc.id,
            status: data.paymentStatus || data.status || 'paid',
            total: data.amount ? (Number(data.amount) / 100) : data.total,
            items: data.items || [],
            paymentMethod: data.paymentMethod,
            address: data.shippingAddress,
            city: data.shippingCity,
            state: data.shippingState,
            pincode: data.shippingPincode,
            shipping: data.shipping,
            tax: data.tax || data.gst,
            gst: data.gst,
            createdAt: data.createdAt,
          });
          return;
        }

        setOrder(null);
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

  const formatAddress = (o) => {
    const parts = [o?.address, o?.city, o?.state, o?.pincode]
      .map((x) => (typeof x === 'string' ? x.trim() : '') )
      .filter(Boolean);

    return parts.length ? parts.join(', ') : 'N/A';
  };


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

              <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                  <h2 className="font-semibold text-luxury-900 mb-3">Items</h2>

                  {order.items?.length > 0 ? (
                    <div className="space-y-3">
                      {order.items.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-start justify-between gap-4"
                        >
                          <div className="flex items-start gap-4">
                            {item.image ? (
                              <img
                                src={getOptimizedImageUrl(item.image, { width: 120, quality: 60 })}
                                alt={item.name}
                                className="w-16 h-16 object-cover rounded-lg"
                              />
                            ) : (
                              <div className="w-16 h-16 rounded-lg bg-luxury-100" />
                            )}

                            <div>
                              <p className="text-luxury-900 font-medium">
                                {item.name || 'Item'}
                              </p>
                              <p className="text-sm text-luxury-600">
                                Qty: {item.quantity ?? 1}
                              </p>
                              <p className="text-sm text-luxury-600">
                                Selling Price: ₹{Number(item.price || 0).toLocaleString()}
                              </p>
                            </div>
                          </div>

                          <p className="text-luxury-900 font-semibold">
                            ₹{Number((item.price || 0) * (item.quantity || 1)).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-luxury-600">No items found.</p>
                  )}
                </div>

                <div>
                  <h2 className="font-semibold text-luxury-900 mb-3 flex items-center gap-2">
                    <Truck className="w-5 h-5 text-gold-600" />
                    Shipping & Billing
                  </h2>

                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-luxury-500">Address</p>
                      <p className="text-luxury-900 font-medium">
                        {formatAddress(order)}
                      </p>

                    </div>

                    <div className="space-y-2 border-t border-luxury-200 pt-4">
                      {(() => {
                        // Calculate fallback subtotal from items
                        const calculatedSubtotal = (order.items || []).reduce(
                          (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1),
                          0
                        );

                        // Prefer persisted values if present, otherwise use calculated values.
                        const subtotal = order.subtotal != null ? Number(order.subtotal) : calculatedSubtotal;
                        
                        const shipping = order.shipping != null 
                          ? Number(order.shipping) 
                          : (subtotal > 1000 ? 0 : 99);
                        
                        const tax = order.tax != null 
                          ? Number(order.tax) 
                          : (order.gst != null ? Number(order.gst) : subtotal * 0.05);

                        const total = order.total != null 
                          ? Number(order.total) 
                          : (subtotal + shipping + tax);

                        return (
                          <>
                            <div className="flex items-center justify-between text-sm text-luxury-600">
                              <span>Subtotal</span>
                              <span>₹{subtotal.toLocaleString()}</span>
                            </div>

                            <div className="flex items-center justify-between text-sm text-luxury-600">
                              <span>Shipping</span>
                              <span>
                                {shipping === 0 ? 'Free' : `₹${shipping.toLocaleString()}`}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-sm text-luxury-600">
                              <span>Tax (5%)</span>
                              <span>₹{tax.toLocaleString()}</span>
                            </div>

                            <div className="flex items-center justify-between text-lg font-semibold text-luxury-900 pt-2 border-t border-luxury-200">
                              <span>Total</span>
                              <span>₹{total.toLocaleString()}</span>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
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

