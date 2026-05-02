/**
 * Converts Google Drive URLs to direct image URLs that can be displayed in img tags
 * @param {string} url - The original Google Drive URL or direct image URL
 * @returns {string} - The direct URL that can be used in img src
 */
export const getDirectImageUrl = (url) => {
  if (!url) return '';
  
  // Check if it's a Google Drive URL
  if (url.includes('drive.google.com')) {
    // Extract file ID from various Google Drive URL formats
    let fileId = '';
    
    // Format 1: https://drive.google.com/file/d/FILE_ID/view?usp=sharing
    const fileMatch1 = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    // Format 2: https://drive.google.com/uc?export=view&id=FILE_ID
    const fileMatch2 = url.match(/id=([a-zA-Z0-9_-]+)/);
    // Format 3: https://docs.google.com/uc?export=download&id=FILE_ID
    const fileMatch3 = url.match(/id=([a-zA-Z0-9_-]+)/);
    
    if (fileMatch1) {
      fileId = fileMatch1[1];
    } else if (fileMatch2) {
      fileId = fileMatch2[1];
    } else if (fileMatch3) {
      fileId = fileMatch3[1];
    }
    
    if (fileId) {
      // Convert to direct download URL
      return `https://drive.google.com/uc?export=view&id=${fileId}`;
    }
  }
  
  // Return original URL if it's not a Google Drive URL
  return url;
};

/**
 * Validates if a URL is a valid image URL (either direct or gdrive)
 * @param {string} url - The URL to validate
 * @returns {boolean} - True if valid
 */
export const isValidImageUrl = (url) => {
  if (!url) return false;
  
  // Check for common image extensions
  const imageExtensions = /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?.*)?$/i;
  if (imageExtensions.test(url)) return true;
  
  // Check for Google Drive URLs
  if (url.includes('drive.google.com')) return true;
  
  // Check for other known image hosting services
  const imageHosts = [
    'imgur.com',
    'cloudinary.com',
    'unsplash.com',
    'pexels.com',
    'pixabay.com',
    'images.unsplash.com',
    'lh3.googleusercontent.com'
  ];
  
  return imageHosts.some(host => url.includes(host));
};
