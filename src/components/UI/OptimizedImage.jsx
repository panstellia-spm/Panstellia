import { useState, useRef, useEffect, useCallback } from 'react';
import { getBlurPlaceholderUrl } from '../../utils/imageUtils';

/**
 * OptimizedImage — drop-in <img> replacement with:
 *  - IntersectionObserver lazy loading (200px rootMargin)
 *  - Shimmer skeleton while loading
 *  - Blur-up reveal: tiny placeholder fades to full image
 *  - Smart error fallback: tries lh3.googleusercontent.com for Drive
 *    images before showing branded "✦ Panstellia" box
 *  - Explicit width/height to prevent CLS
 */
const OptimizedImage = ({
  src,
  alt,
  width,
  height,
  className = '',
  imgClassName = 'object-cover',
  priority = false,
  fallbackSrc = null,
  onClick,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(src);
  const failCountRef = useRef(0);
  const imgRef = useRef(null);

  // IntersectionObserver — start loading 200px before visible
  useEffect(() => {
    if (priority) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );
    const el = imgRef.current;
    if (el) observer.observe(el);
    return () => observer.disconnect();
  }, [priority]);

  // Reset state when src changes
  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
    setCurrentSrc(src);
    failCountRef.current = 0;
  }, [src]);

  // Smart error handler — tries lh3 fallback for Drive images
  const handleError = useCallback(() => {
    failCountRef.current += 1;

    // First failure: try lh3.googleusercontent.com if it's a Drive image
    if (failCountRef.current === 1) {
      // Extract Drive file ID from the wsrv.nl proxied URL
      // The original Drive URL is encoded in the ?url= parameter
      const decodedUrl = decodeURIComponent(src || '');
      const fileIdMatch =
        decodedUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/) ||
        decodedUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);

      if (fileIdMatch?.[1]) {
        // lh3.googleusercontent.com is Google's image CDN — less restricted
        setCurrentSrc(
          `https://lh3.googleusercontent.com/d/${fileIdMatch[1]}=s600`
        );
        return;
      }
    }

    // All fallbacks exhausted
    setHasError(true);
  }, [src]);

  const blurSrc = src ? getBlurPlaceholderUrl(src) : null;

  return (
    <div
      ref={imgRef}
      className={`relative overflow-hidden bg-luxury-100 ${className}`}
      style={width && height ? { width, height } : undefined}
      onClick={onClick}
    >
      {/* ── Shimmer skeleton ── */}
      {!isLoaded && !hasError && (
        <div
          className="absolute inset-0 animate-shimmer bg-gradient-to-r
            from-luxury-100 via-luxury-50 to-luxury-100 bg-[length:200%_100%]"
          aria-hidden="true"
        />
      )}

      {/* ── Blur placeholder ── */}
      {isInView && blurSrc && !isLoaded && !hasError && (
        <img
          src={blurSrc}
          alt=""
          aria-hidden="true"
          className={`absolute inset-0 w-full h-full scale-110 blur-sm ${imgClassName}`}
        />
      )}

      {/* ── Real image ── */}
      {isInView && !hasError && (
        <img
          src={currentSrc || fallbackSrc || ''}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          fetchpriority={priority ? 'high' : 'auto'}
          width={width}
          height={height}
          onLoad={() => setIsLoaded(true)}
          onError={handleError}
          className={`w-full h-full transition-opacity duration-500 ${imgClassName}
            ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        />
      )}

      {/* ── Error fallback ── branded box when all attempts fail */}
      {hasError && (
        <div
          className="absolute inset-0 flex items-center justify-center
            bg-gradient-to-br from-luxury-100 to-luxury-200
            text-luxury-400 text-xs text-center p-2 select-none"
        >
          <span className="font-serif text-base">✦ Panstellia</span>
        </div>
      )}
    </div>
  );
};

export default OptimizedImage;
