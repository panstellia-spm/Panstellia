import { Link, useLocation } from 'react-router-dom';
import { CheckCircle, ShoppingBag, ArrowRight } from 'lucide-react';
import SEOHelmet from '../utils/seoHelmet';

const OrderSuccessPage = () => {
  const location = useLocation();
  const { orderId, items, total } = location.state || {};

  return (
    <div className="min-h-screen flex items-center justify-center bg-luxury-50 py-12 px-4">
      <SEOHelmet 
        title="Order Successful | Panstellia"
        description="Your order has been placed successfully! Track your order and check delivery status."
        keywords="order confirmation, order placed, thank you"
        canonical="https://panstellia.com/order-success"
      />
      <div className="max-w-md w-full text-center">
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle className="w-12 h-12 text-green-500" />
        </div>
        <h1 className="mt-6 font-serif text-3xl font-bold text-luxury-900">
          Order Placed Successfully!
        </h1>
        <p className="mt-4 text-luxury-600">
          Thank you for your purchase. Your order has been placed successfully.
        </p>
        
        {orderId && (
          <div className="mt-6 bg-white rounded-xl shadow-md p-4">
            <p className="text-sm text-luxury-500">Order ID</p>
            <p className="font-mono text-lg font-semibold text-luxury-900">
              {orderId}
            </p>
          </div>
        )}

        <div className="mt-6 flex flex-col sm:flex-row gap-4">
          <Link to="/orders" className="flex-1 btn-primary flex items-center justify-center">
            View Orders
            <ArrowRight className="w-5 h-5 ml-2" />
          </Link>
          <Link to="/products" className="flex-1 btn-secondary flex items-center justify-center">
            Continue Shopping
          </Link>
        </div>

        <div className="mt-8 text-left bg-white rounded-xl shadow-md p-6">
          <h2 className="font-semibold text-luxury-900 mb-4">Whats Next?</h2>
          <ul className="space-y-3 text-luxury-600">
            <li className="flex items-start">
              <CheckCircle className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
              <span>You will receive an email confirmation shortly</span>
            </li>
            <li className="flex items-start">
              <CheckCircle className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
              <span>Your order will be processed within 24 hours</span>
            </li>
            <li className="flex items-start">
              <CheckCircle className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
              <span>Free shipping on orders above ₹1000</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default OrderSuccessPage;
