import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Ensures the page scroll position resets to the top on route changes.
 * Prevents scenarios where navigation keeps you near the footer.
 */
const ScrollToTopOnNavigation = () => {
  const location = useLocation();

  useEffect(() => {
    // Use rAF so DOM/layout for the new route is committed.
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    });
  }, [location.pathname, location.search, location.hash]);

  return null;
};

export default ScrollToTopOnNavigation;

