import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { motion } from 'framer-motion';

const ClientReviews = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
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

  const itemsPerView = 3;
  const totalSlides = reviews.length - itemsPerView + 1;

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

  const getVisibleReviews = () => {
    const startIdx = currentIndex * itemsPerView;
    return reviews.slice(startIdx, startIdx + itemsPerView);
  };

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Title */}
        <div className="text-center mb-16">
          <h2 className="font-serif text-4xl md:text-5xl font-bold text-luxury-900 mb-4">
            CLIENTS REVIEWS
          </h2>
          <div className="w-24 h-1 bg-gradient-to-r from-gold-500 to-gold-600 mx-auto rounded-full" />
        </div>

        {/* Reviews Carousel Container */}
        <div 
          className="relative"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Navigation Buttons */}
          <motion.button
            onClick={handlePrev}
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.95 }}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-14 md:-translate-x-20 z-20 p-3 rounded-full bg-gold-500/20 hover:bg-gold-500/40 text-gold-600 transition-all duration-300 backdrop-blur-sm"
            aria-label="Previous reviews"
          >
            <ChevronLeft className="w-6 h-6 md:w-8 md:h-8" />
          </motion.button>

          <motion.button
            onClick={handleNext}
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.95 }}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-14 md:translate-x-20 z-20 p-3 rounded-full bg-gold-500/20 hover:bg-gold-500/40 text-gold-600 transition-all duration-300 backdrop-blur-sm"
            aria-label="Next reviews"
          >
            <ChevronRight className="w-6 h-6 md:w-8 md:h-8" />
          </motion.button>

          {/* Reviews Carousel */}
          <div 
            ref={containerRef}
            className="overflow-hidden"
          >
            <motion.div
              className="flex gap-8"
              animate={{ x: -currentIndex * (100 / itemsPerView) + '%' }}
              transition={{ type: 'spring', stiffness: 100, damping: 20 }}
            >
              {reviews.map((review) => (
                <motion.div
                  key={review.id}
                  className="w-1/3 flex-shrink-0"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  <motion.div
                    className="bg-white rounded-xl p-8 shadow-md hover:shadow-xl transition-all duration-300 border border-luxury-100 flex flex-col h-full"
                    whileHover={{ y: -5 }}
                  >
                    {/* Star Rating */}
                    <div className="flex gap-1 mb-4">
                      {Array(review.rating).fill(0).map((_, i) => (
                        <Star
                          key={i}
                          className="w-5 h-5 fill-gold-500 text-gold-500"
                        />
                      ))}
                    </div>

                    {/* Review Text */}
                    <p className="text-luxury-700 text-sm md:text-base leading-relaxed mb-6 flex-grow italic">
                      {review.text}
                    </p>

                    {/* User Info */}
                    <div className="flex items-center gap-4 pt-6 border-t border-luxury-100">
                      {/* Avatar */}
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center text-3xl shadow-md flex-shrink-0">
                        {review.avatar}
                      </div>

                      <div>
                        <p className="font-serif font-bold text-luxury-900 text-sm md:text-base">
                          {review.name}
                        </p>
                        <p className="text-gold-500 text-xs md:text-sm font-medium">
                          {review.role}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>

        {/* Pagination Dots */}
        <div className="flex justify-center gap-3 mt-12">
          {Array.from({ length: totalSlides }).map((_, index) => (
            <motion.button
              key={index}
              onClick={() => handleDotClick(index)}
              className={`rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? 'bg-gold-500 w-8 h-3'
                  : 'bg-luxury-300 w-3 h-3 hover:bg-luxury-400'
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
