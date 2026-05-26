import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Heart, ShoppingBag, Truck, Shield, RefreshCw, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { useProducts } from '../context/ProductContext';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { toast } from 'react-toastify';
import { getProductImageUrls, getDirectImageUrl } from '../utils/imageUtils';
import { getCategoryLabel } from '../utils/categoryLabels';

import SEOHelmet from '../utils/seoHelmet';
import { getProductSchema } from '../utils/structuredData';


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
  const [isZooming, setIsZooming] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 50, y: 50 });

  const touchStartXRef = useRef(null);

  const MAX_GALLERY_THUMBS = 6;


  useEffect(() => {
    const foundProduct = getProductById(id);
    if (foundProduct) {
      setProduct(foundProduct);
    } else {
      navigate('/products');
    }
  }, [id, getProductById, navigate]);

  const wishlisted = product ? isInWishlist(product.id) : false;
  const discount = product?.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  const imageUrls = useMemo(() => {
    const urls = product ? getProductImageUrls(product) : [];
    return urls.slice(0, MAX_GALLERY_THUMBS);
  }, [product]);

  const safeSelectedImage = Math.min(Math.max(selectedImage, 0), Math.max(0, imageUrls.length - 1));
  const imageUrl = imageUrls[safeSelectedImage] || imageUrls[0] || '';

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-gold-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }




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

  const handleZoomMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    setZoomPosition({
      x: Math.min(100, Math.max(0, x)),
      y: Math.min(100, Math.max(0, y))
    });
  };

  return (
    <div className="min-h-screen bg-luxury-50 py-8">
      <SEOHelmet 
        title={`${product.name} | Buy at Panstellia`}
        description={product.description || `Shop ${product.name} - Premium ${getCategoryLabel(product.category)} jewelry from Panstellia. ${product.inStock ? 'In stock' : 'Out of stock'}.`}
        keywords={`${product.name}, ${getCategoryLabel(product.category)} necklace, jewelry`}
        canonical={`https://panstellia.com/product/${product.id}`}
        ogImage={imageUrl}
        preloadImages={[imageUrl]}
        structuredData={getProductSchema({
          name: product.name,
          description: product.description,
          image: imageUrl,
          price: product.price,
          inStock: product.inStock,
          rating: product.rating || 4.5,
          reviewCount: product.reviewCount || 0,
          sku: product.id
        })}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-luxury-500 mb-8">
          <Link to="/" className="hover:text-gold-600">Home</Link>
          <span>/</span>
          <Link to="/products" className="hover:text-gold-600">Shop</Link>
          <span>/</span>
          <Link to={`/products?category=${product.category}`} className="hover:text-gold-600">{getCategoryLabel(product.category)}</Link>
          <span>/</span>
          <span className="text-luxury-900">{product.name}</span>
        </nav>

{/* Product Info */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Image Gallery */}
          <div className="space-y-4 lg:relative">
            <div
              className="relative overflow-hidden rounded-xl aspect-[4/5] lg:aspect-auto lg:h-[calc(100dvh-26rem)] lg:min-h-[420px] lg:max-h-[620px] bg-white group"
              onMouseEnter={() => setIsZooming(true)}
              onMouseLeave={() => setIsZooming(false)}
              onMouseMove={handleZoomMove}
              onTouchStart={(e) => {
                touchStartXRef.current = e.touches?.[0]?.clientX ?? null;
              }}
              onTouchEnd={(e) => {
                const startX = touchStartXRef.current;
                const endX = e.changedTouches?.[0]?.clientX ?? null;
                touchStartXRef.current = null;
                if (startX == null || endX == null) return;
                const dx = endX - startX;
                const SWIPE_THRESHOLD = 50;
                if (Math.abs(dx) < SWIPE_THRESHOLD) return;

                if (dx > 0) {
                  setSelectedImage((prev) => (prev - 1 + imageUrls.length) % imageUrls.length);
                } else {
                  setSelectedImage((prev) => (prev + 1) % imageUrls.length);
                }
              }}
            >
              <AnimatePresence mode="wait">
                <motion.img
                  key={imageUrl}
                  src={imageUrl}
                  alt={product.name}
                  loading="eager"
                  decoding="async"
                  fetchPriority="high"
                  initial={{ opacity: 0, scale: 1.03 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.28, ease: 'easeOut' }}
                  className="w-full h-full object-contain transform will-change-transform group-hover:scale-[1.04] transition-transform duration-500"
                />
              </AnimatePresence>

              {discount > 0 && (
                <div className="absolute top-4 left-4 badge badge-error text-lg px-4 py-2">
                  -{discount}% OFF
                </div>
              )}

              {isZooming && (
                <div
                  className="hidden lg:block absolute z-20 w-44 h-44 -translate-x-1/2 -translate-y-1/2 border border-white/80 bg-white/35 shadow-[0_12px_40px_rgba(30,20,12,0.18)] backdrop-blur-[2px] pointer-events-none"
                  style={{
                    left: `${zoomPosition.x}%`,
                    top: `${zoomPosition.y}%`
                  }}
                />
              )}

              {/* Navigation arrows */}
              <div className="pointer-events-none absolute inset-y-0 left-0 right-0 flex items-center justify-between px-3">
                <button
                  type="button"
                  aria-label="Previous image"
                  onClick={() => setSelectedImage((prev) => (prev - 1 + imageUrls.length) % imageUrls.length)}
                  className="pointer-events-auto rounded-full bg-white/70 backdrop-blur-md border border-luxury-100/70 shadow-sm hover:shadow-md transition-all p-2 hover:bg-white/90"
                >
                  <ChevronLeft className="w-5 h-5 text-luxury-900" />
                </button>
                <button
                  type="button"
                  aria-label="Next image"
                  onClick={() => setSelectedImage((prev) => (prev + 1) % imageUrls.length)}
                  className="pointer-events-auto rounded-full bg-white/70 backdrop-blur-md border border-luxury-100/70 shadow-sm hover:shadow-md transition-all p-2 hover:bg-white/90"
                >
                  <ChevronRight className="w-5 h-5 text-luxury-900" />
                </button>
              </div>

              {/* Luxury glass highlight */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-gradient-to-tr from-gold-500/10 via-transparent to-gold-600/10" />
            </div>

            {isZooming && (
              <div
                className="hidden lg:block absolute left-[calc(100%+1.5rem)] top-0 z-30 w-[min(44vw,620px)] h-[calc(100dvh-26rem)] min-h-[420px] max-h-[620px] rounded-xl border border-luxury-100 bg-white shadow-2xl pointer-events-none"
                style={{
                  backgroundImage: `url(${imageUrl})`,
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: '240%',
                  backgroundPosition: `${zoomPosition.x}% ${zoomPosition.y}%`
                }}
              />
            )}

            <div className="flex gap-4 overflow-x-auto scrollbar-hide">
              {imageUrls.map((img, index) => {
                const isActive = safeSelectedImage === index;
                return (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0"
                    aria-label={`Select image ${index + 1}`}
                  >
                    <div
                      className={`w-full h-full rounded-lg p-[2px] transition-all duration-300 ${
                        isActive
                          ? 'bg-gradient-to-b from-gold-400/60 to-gold-500/0 shadow-[0_0_0_2px_rgba(219,145,45,0.25),0_10px_25px_rgba(219,145,45,0.18)]'
                          : 'bg-transparent border border-transparent'
                      }`}
                    >
                      <div
                        className={`w-full h-full rounded-[7px] overflow-hidden ${
                          isActive ? 'bg-white/70 backdrop-blur-md' : 'bg-white'
                        }`}
                      >
                        <img src={img} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>


          {/* Details */}
          <div>
            <span className="text-gold-600 font-medium uppercase tracking-wider text-sm">
              {getCategoryLabel(product.category)}
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

            {/* Stock Status */}
            <div className="mt-3 flex items-center gap-2">
              {product.inStock ? (
                <>
                  <Check className="w-5 h-5 text-green-500" />
                  <span className="text-green-600 font-medium">In Stock</span>
                </>
              ) : (
                <span className="text-red-600 font-medium">Out of Stock</span>
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
                <span>Free Shipping Above ₹1000</span>
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
                  className="flex-1 btn-primary relative overflow-hidden flex items-center justify-center"
                >
                  <span
                    className="absolute inset-0 translate-x-[-120%] bg-gradient-to-r from-white/0 via-white/30 to-white/0 transition-transform duration-700 pointer-events-none"
                  />
                  <ShoppingBag className="w-5 h-5 mr-2 relative" />
                  <span className="relative">{isAdding ? 'Adding...' : 'Add to Cart'}</span>
                  <span className="relative" />
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

            {/* Specifications */}
            <div className="mt-10">
              <h2 className="font-semibold text-luxury-900 text-xl mb-4">Product Specifications</h2>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                {[
                  ['Product Name', product.productName],
                  ['Product Category', product.productCategory],
                  ['Product Type', product.productType],
                  ['SKU Code', product.skuCode],
                  ['Barcode / EAN', product.barcode],
                  ['Brand Name', product.brandName],
                  ['Collection Name', product.collectionName],
                  ['Gender', product.gender],
                  ['Age Group', product.ageGroup],
                  ['Occasion', product.occasion],
                  ['Country of Origin', product.countryOfOrigin],

                  ['Base Material', product.baseMaterial],
                  ['Primary Stone', product.primaryStone],
                  ['Stone Type', product.stoneType],
                  ['Stone Color', product.stoneColor],
                  ['Plating Type', product.platingType],
                  ['Plating Thickness', product.platingThickness],
                  ['Finish Type', product.finishType],
                  ['Nickel Free', product.nickelFree != null ? (product.nickelFree ? 'Yes' : 'No') : undefined],
                  ['Hypoallergenic', product.hypoallergenic != null ? (product.hypoallergenic ? 'Yes' : 'No') : undefined],
                  ['Tarnish Resistant', product.tarnishResistant != null ? (product.tarnishResistant ? 'Yes' : 'No') : undefined],
                ]
                  .filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== '')
                  .map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-luxury-500">{label}</dt>
                      <dd className="text-luxury-900 font-medium">{String(value)}</dd>
                    </div>
                  ))}
              </dl>
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
                    <div className="relative overflow-hidden aspect-[4/3]">
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
