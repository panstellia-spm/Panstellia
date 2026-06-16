// ─────────────────────────────────────────────
// Extracts Google Drive file ID from any Drive URL format
// ─────────────────────────────────────────────
const extractDriveFileId = (url) => {
  if (!url || !url.includes('drive.google.com')) return null;

  // Format 1: /file/d/FILE_ID/view
  const m1 = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (m1) return m1[1];

  // Format 2: ?id=FILE_ID or &id=FILE_ID
  const m2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (m2) return m2[1];

  return null;
};

// ─────────────────────────────────────────────
// Converts Google Drive share URL → thumbnail URL
// Google's thumbnail endpoint still works reliably
// (unlike uc?export=view which Google blocked for hotlinking in 2023)
// ─────────────────────────────────────────────
const getDriveThumbnailUrl = (url, size = 800) => {
  const fileId = extractDriveFileId(url);
  if (!fileId) return url;
  // sz= controls max dimension in pixels
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=s${size}`;
};

// ─────────────────────────────────────────────
// Legacy name kept for backward compatibility.
// Now resolves Drive URLs to the working thumbnail endpoint
// and wraps everything in wsrv.nl for CDN + WebP + resize.
// ─────────────────────────────────────────────
export const getDirectImageUrl = (url, { width = 800, quality = 82 } = {}) => {
  if (!url) return '';

  // Already a wsrv.nl URL — don't double-proxy
  if (url.includes('wsrv.nl')) return url;

  // For Google Drive URLs, use thumbnail endpoint
  // (works reliably unlike uc?export=view which is blocked)
  const resolved = url.includes('drive.google.com')
    ? getDriveThumbnailUrl(url, width)
    : url;

  // Wrap in wsrv.nl for CDN caching + WebP + resize
  // &il = progressive/interlaced (blurry preview appears instantly)
  // &n=-1 = no hotlink referer check
  return (
    `https://wsrv.nl/?url=${encodeURIComponent(resolved)}` +
    `&w=${width}&q=${quality}&output=webp&il&n=-1`
  );
};

// ─────────────────────────────────────────────
// Primary export used by all components.
// Accepts {width, quality} for context-appropriate sizing.
// ─────────────────────────────────────────────
export const getOptimizedImageUrl = (url, { width = 800, quality = 82 } = {}) => {
  return getDirectImageUrl(url, { width, quality });
};

// ─────────────────────────────────────────────
// Returns array of optimized image URLs for a product.
// Prefers product.images array, falls back to product.image.
// ─────────────────────────────────────────────
export const getProductImageUrls = (product, { width = 600, quality = 82 } = {}) => {
  const rawImages = Array.isArray(product?.images) ? product.images : [];
  const fallback = product?.image ? [product.image] : [];
  const images = rawImages.length > 0 ? rawImages : fallback;

  return images
    .filter(Boolean)
    .map((img) => getOptimizedImageUrl(img, { width, quality }));
};

// ─────────────────────────────────────────────
// Tiny blur placeholder for progressive reveal
// ─────────────────────────────────────────────
export const getBlurPlaceholderUrl = (url) => {
  if (!url) return '';

  const resolved = url.includes('drive.google.com')
    ? getDriveThumbnailUrl(url, 40)
    : url;

  return (
    `https://wsrv.nl/?url=${encodeURIComponent(resolved)}` +
    `&w=40&q=10&output=webp&blur=3&n=-1`
  );
};

// ─────────────────────────────────────────────
// Validates if a URL is a valid image URL
// ─────────────────────────────────────────────
export const isValidImageUrl = (url) => {
  if (!url) return false;

  const imageExtensions = /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?.*)?$/i;
  if (imageExtensions.test(url)) return true;

  if (url.includes('drive.google.com')) return true;
  if (url.includes('wsrv.nl')) return true;

  const imageHosts = [
    'ibb.co',
    'i.ibb.co',
    'imgur.com',
    'cloudinary.com',
    'unsplash.com',
    'images.unsplash.com',
    'lh3.googleusercontent.com',
  ];

  return imageHosts.some((host) => url.includes(host));
};
