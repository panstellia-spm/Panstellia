import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

import { toast } from 'react-toastify';
import SEOHelmet from '../utils/seoHelmet';

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const { resetPassword } = useAuth(); // Will be added in next step
  
  const [formData, setFormData] = useState({
    email: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      if (!formData.email) {
        throw new Error('Please enter your email address');
      }
      
      await resetPassword(formData.email);
      
      setMessage('Password reset email sent! Check your inbox.');
      toast.success('Password reset email sent!', {
        position: 'bottom-right'
      });
      
    } catch (err) {
      setError(err.message || 'Failed to send reset email. Please try again.');
      toast.error(err.message || 'Failed to send reset email', {
        position: 'bottom-right'
      });
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-luxury-50 py-12 px-4">
      <SEOHelmet 
        title="Forgot Password | Panstellia"
        description="Reset your Panstellia account password. Enter your email to receive password reset instructions."
        keywords="forgot password, reset password, account recovery"
        canonical="https://panstellia.com/forgot-password"
      />
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="font-serif text-3xl font-bold text-luxury-900">Reset Password</h1>
            <p className="mt-2 text-luxury-600">Enter your email to receive reset instructions</p>
          </div>

          {/* Back to Login */}
          <Link 
            to="/login" 
            className="inline-flex items-center text-sm text-luxury-600 hover:text-luxury-700 mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Login
          </Link>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}
            {message && (
              <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg text-sm">
                {message}
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-luxury-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-luxury-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="your@email.com"
                  className="input-field pl-12"
                  autoComplete="email"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary flex items-center justify-center"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                'Send Reset Email'
              )}
            </button>
          </form>

          {/* Login Link */}
          <p className="mt-8 text-center text-luxury-600">
            Remember your password?{' '}
            <Link to="/login" className="text-gold-600 font-medium hover:text-gold-700">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;

