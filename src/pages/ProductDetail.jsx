import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Star, Heart, ShoppingBag, Truck, Shield, RefreshCw, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { useProducts } from '../context/ProductContext';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { toast } from 'react-toastify';
import { getDirectImageUrl } from '../utils/imageUtils';

const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getProductById, products } = useProducts();
  const { addToCart } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    const foundProduct = getProductById(id);
    if (foundProduct) {
      setProduct(foundProduct);
    } else {
      navigate('/products');
    }
  }, [id, getProductById, navigate]);

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-gold-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

const wishlisted = isInWishlist(product.id);
  const discount = product.originalPrice 
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  // Convert Google Drive URLs to direct image URLs
  const imageUrl = getDirectImageUrl(product.image);

  const relatedProducts = products
    .filter(p => p.category === product.category && p.id !== product.id)
    .slice(0, 4);

  const handleAddToCart = async () => {
    setIsAdding(true);
    try {
      await addToCart(product, quantity);
      toast.success(`${product.name} added to cart!`, {
        position: 'bottom-right'
      });
    } catch (error) {
      toast.error('Failed to add to cart', {
        position: 'bottom-right'
      });
    }
    setIsAdding(false);
  };

  const handleWishlist = () => {
    if (wishlisted) {
      removeFromWishlist(product.id);
      toast.info('Removed from wishlist', {
        position: 'bottom-right'
      });
    } else {
      addToWishlist(product);
      toast.success('Added to wishlist!', {
        position: 'bottom-right'
      });
    }
  };

  return (
    <div className="min-h-screen bg-luxury-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-luxury-500 mb-8">
          <Link to="/" className="hover:text-gold-600">Home</Link>
          <span>/</span>
          <Link to="/products" className="hover:text-gold-600">Shop</Link>
          <span>/</span>
          <Link to={`/products?category=${product.category}`} className="hover:text-gold-600">{product.category}</Link>
          <span>/</span>
          <span className="text-luxury-900">{product.name}</span>
        </nav>

{/* Product Info */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Image Gallery */}
          <div className="space-y-4">
            <div className="relative overflow-hidden rounded-xl aspect-square bg-white">
              <img
                src={imageUrl}
                alt={product.name}
                className="w-full h-full object-cover"
              />
              {discount > 0 && (
                <div className="absolute top-4 left-4 badge badge-error text-lg px-4 py-2">
                  -{discount}% OFF
                </div>
              )}
            </div>
            <div className="flex gap-4 overflow-x-auto scrollbar-hide">
              {[imageUrl].map((img, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={`w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 border-2 ${
                    selectedImage === index ? 'border-gold-500' : 'border-transparent'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Details */}
          <div>
            <span className="text-gold-600 font-medium uppercase tracking-wider text-sm">
              {product.category}
            </span>
            <h1 className="mt-2 font-serif text-3xl md:text-4xl font-bold text-luxury-900">
              {product.name}
            </h1>

            {/* Rating */}
            <div className="flex items-center mt-4">
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-5 h-5 ${
                      i < Math.floor(product.ratings || 0)
                        ? 'fill-gold-400 text-gold-400'
                        : 'fill-luxury-200 text-luxury-200'
                    }`}
                  />
                ))}
              </div>
              <span className="ml-2 text-luxury-600">
                {product.ratings} ({product.reviews} reviews)
              </span>
            </div>

            {/* Price */}
            <div className="mt-6">
              <span className="text-3xl font-bold text-luxury-900">
                ₹{product.price?.toLocaleString()}
              </span>
              {product.originalPrice && (
                <span className="ml-4 text-xl text-luxury-400 line-through">
                  ₹{product.originalPrice.toLocaleString()}
                </span>
              )}
            </div>

            {/* Description */}
            <p className="mt-6 text-luxury-600 leading-relaxed">
              {product.description}
            </p>

            {/* Features */}
            <div className="mt-8 grid grid-cols-3 gap-4">
              <div className="flex items-center gap-2 text-sm text-luxury-600">
                <Truck className="w-5 h-5 text-gold-600" />
                <span>Free Shipping</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-luxury-600">
                <Shield className="w-5 h-5 text-gold-600" />
                <span>Secure</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-luxury-600">
                <RefreshCw className="w-5 h-5 text-gold-600" />
                <span>Easy Return</span>
              </div>
            </div>

            {/* Quantity & Actions */}
            <div className="mt-8 space-y-4">
              <div className="flex items-center gap-4">
                <span className="text-luxury-700">Quantity:</span>
                <div className="flex items-center border border-luxury-200 rounded-lg">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 flex items-center justify-center text-luxury-600 hover:bg-luxury-50"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="w-12 text-center font-medium">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-10 h-10 flex items-center justify-center text-luxury-600 hover:bg-luxury-50"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={handleAddToCart}
                  disabled={isAdding}
                  className="flex-1 btn-primary flex items-center justify-center"
                >
                  <ShoppingBag className="w-5 h-5 mr-2" />
                  {isAdding ? 'Adding...' : 'Add to Cart'}
                </button>
                <button
                  onClick={handleWishlist}
                  className={` px-6 py-3 rounded-lg font-medium transition-all flex items-center justify-center ${
                    wishlisted 
                      ? 'bg-red-50 text-red-600 border-2 border-red-600' 
                      : 'border-2 border-luxury-200 text-luxury-700 hover:border-gold-500'
                  }`}
                >
                  <Heart className={`w-5 h-5 mr-2 ${wishlisted ? 'fill-current' : ''}`} />
                  {wishlisted ? 'Wishlisted' : 'Add to Wishlist'}
                </button>
              </div>
            </div>

            {/* Stock Status */}
            <div className="mt-6 flex items-center gap-2">
              <Check className="w-5 h-5 text-green-500" />
              <span className="text-green-600 font-medium">In Stock</span>
            </div>
          </div>
        </div>

{/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="mt-16">
            <h2 className="font-serif text-2xl font-bold text-luxury-900 mb-8">
              Related Products
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {relatedProducts.map(p => (
                <Link key={p.id} to={`/product/${p.id}`} className="group">
                  <div className="card">
                    <div className="relative overflow-hidden aspect-[3/4]">
                      <img
                        src={getDirectImageUrl(p.image)}
                        alt={p.name}
                        className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                      />
                    </div>
                    <div className="p-4">
                      <p className="text-xs text-gold-600 font-medium">{p.category}</p>
                      <h3 className="mt-1 text-luxury-900 font-medium line-clamp-2 group-hover:text-gold-600">
                        {p.name}
                      </h3>
                      <p className="mt-2 text-lg font-semibold text-luxury-900">
                        ₹{p.price?.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductDetailPage;
