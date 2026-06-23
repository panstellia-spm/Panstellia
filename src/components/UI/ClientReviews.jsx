import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { motion } from 'framer-motion';

const ClientReviews = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const containerRef = useRef(null);

  const reviews = [
    {
      id: 1,
      rating: 5,
      text: '"The elegance and craftsmanship of Panstellia necklaces are unmatched! Every piece is a masterpiece that adds instant sophistication to any outfit. Absolutely stunning!"',
      avatar: '✨',
      name: 'SOPHIA MARTINEZ',
      role: 'Luxury Enthusiast'
    },
    {
      id: 2,
      rating: 5,
      text: '"I am completely mesmerized by the intricate designs and premium quality. The packaging was luxurious and the customer service team was incredibly helpful and responsive."',
      avatar: '💎',
      name: 'EMMA WILSON',
      role: 'Fashion Designer'
    },
    {
      id: 3,
      rating: 5,
      text: '"These necklaces are worth every single penny! The attention to detail is remarkable, and the materials feel authentic and precious. Perfect for special occasions!"',
      avatar: '👑',
      name: 'OLIVIA CHEN',
      role: 'Style Influencer'
    },
    {
      id: 4,
      rating: 4,
      text: '"Beautiful collection with exceptional designs. The customer experience was wonderful and delivery was prompt. My only wish is for more variety in the collection!"',
      avatar: '🌟',
      name: 'JESSICA TAYLOR',
      role: 'Jewelry Collector'
    },
    {
      id: 5,
      rating: 5,
      text: '"Panstellia necklaces have become my go-to for making a statement. The quality is premium, the designs are timeless, and I receive compliments every time I wear them!"',
      avatar: '🎀',
      name: 'RACHEL ANDERSON',
      role: 'Professional & Mother'
    }
  ];

  const itemsPerView = isMobile ? 1 : 3;
  const totalSlides = reviews.length - itemsPerView + 1;

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!autoPlay || isHovered) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % totalSlides);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [autoPlay, totalSlides, isHovered]);

  const handlePrev = () => {
    setAutoPlay(true);
    setCurrentIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
  };

  const handleNext = () => {
    setAutoPlay(true);
    setCurrentIndex((prev) => (prev + 1) % totalSlides);
  };

  const handleDotClick = (index) => {
    setAutoPlay(true);
    setCurrentIndex(index);
  };

  const handleTouchStart = (e) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = (e) => {
    setTouchEnd(e.changedTouches[0].clientX);
    handleSwipe();
  };

  const handleSwipe = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      handleNext();
    } else if (isRightSwipe) {
      handlePrev();
    }
  };

  const getVisibleReviews = () => {
    const startIdx = currentIndex * itemsPerView;
    return reviews.slice(startIdx, startIdx + itemsPerView);
  };

  return (
    <section className="py-12 sm:py-16 md:py-20 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        {/* Section Title */}
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-luxury-900 mb-4">
            Client Reviews
          </h2>
          <div className="w-20 sm:w-24 h-1 bg-gradient-to-r from-gold-500 to-gold-600 mx-auto rounded-full" />
        </div>

        {/* Reviews Carousel Container */}
        <div 
          className="flex items-stretch justify-center gap-2 sm:gap-4 md:gap-8"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Left Arrow Button */}
          <motion.button
            onClick={handlePrev}
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.95 }}
            className="hidden sm:block p-2 sm:p-3 rounded-full bg-white hover:bg-luxury-50 text-gold-600 transition-all duration-300 shadow-md hover:shadow-lg flex-shrink-0"
            aria-label="Previous reviews"
          >
            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8" />
          </motion.button>

          {/* Reviews Carousel */}
          <div 
            ref={containerRef}
            className="overflow-hidden flex-1 max-w-4xl w-full"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <motion.div
              className="flex gap-4 sm:gap-6 md:gap-8 px-2 sm:px-0"
              animate={{ x: -currentIndex * (100 / itemsPerView) + '%' }}
              transition={{ type: 'spring', stiffness: 100, damping: 20 }}
            >
              {reviews.map((review) => (
                <motion.div
                  key={review.id}
                  className={isMobile ? 'w-full flex-shrink-0' : 'w-1/3 flex-shrink-0'}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  <motion.div
                    className="bg-white rounded-xl p-4 sm:p-6 md:p-8 shadow-md hover:shadow-xl transition-all duration-300 border border-luxury-100 flex flex-col min-h-[auto] sm:h-full"
                    whileHover={{ y: -5 }}
                  >
                    {/* Star Rating */}
                    <div className="flex gap-1 mb-3 sm:mb-4">
                      {Array(review.rating).fill(0).map((_, i) => (
                        <Star
                          key={i}
                          className="w-4 h-4 sm:w-5 sm:h-5 fill-gold-500 text-gold-500"
                        />
                      ))}
                    </div>

                    {/* Review Text */}
                    <p className="text-luxury-700 text-xs sm:text-sm md:text-base leading-relaxed mb-4 sm:mb-6 flex-grow italic break-words">
                      {review.text}
                    </p>

                    {/* User Info */}
                    <div className="flex items-center gap-3 sm:gap-4 pt-4 sm:pt-6 border-t border-luxury-100">
                      {/* Avatar */}
                      <div className="w-12 sm:w-16 h-12 sm:h-16 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center text-2xl sm:text-3xl shadow-md flex-shrink-0">
                        {review.avatar}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="font-serif font-bold text-luxury-900 text-xs sm:text-sm md:text-base break-words">
                          {review.name}
                        </p>
                        <p className="text-gold-500 text-xs md:text-sm font-medium break-words">
                          {review.role}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* Right Arrow Button */}
          <motion.button
            onClick={handleNext}
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.95 }}
            className="hidden sm:block p-2 sm:p-3 rounded-full bg-white hover:bg-luxury-50 text-gold-600 transition-all duration-300 shadow-md hover:shadow-lg flex-shrink-0"
            aria-label="Next reviews"
          >
            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8" />
          </motion.button>
        </div>

        {/* Pagination Dots */}
        <div className="flex justify-center gap-2 sm:gap-3 mt-8 sm:mt-12">
          {Array.from({ length: totalSlides }).map((_, index) => (
            <motion.button
              key={index}
              onClick={() => handleDotClick(index)}
              className={`rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? 'bg-gold-500 w-6 sm:w-8 h-2 sm:h-3'
                  : 'bg-luxury-300 w-2 sm:w-3 h-2 sm:h-3 hover:bg-luxury-400'
              }`}
              whileHover={{ scale: 1.2 }}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default ClientReviews;
