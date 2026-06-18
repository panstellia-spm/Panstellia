import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Ensures the page scroll position resets to the top on route changes.
 * Prevents scenarios where navigation keeps you near the footer.
 */
const ScrollToTopOnNavigation = () => {
  const location = useLocation();

  useEffect(() => {
    // Skip scroll reset if state explicitly requests it (e.g. on in-page filter changes)
    if (location.state?.preventScroll) {
      return;
    }

    // Use rAF so DOM/layout for the new route is committed.
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    });
  }, [location.pathname, location.search, location.hash, location.state]);

  return null;
};

export default ScrollToTopOnNavigation;

