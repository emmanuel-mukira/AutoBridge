import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

declare global {
  interface Window {
    HSStaticMethods: {
      autoInit: () => void;
    };
  }
}

export default function PrelineLoader() {
  const location = useLocation();

  useEffect(() => {
    const loadPreline = async () => {
      // Import preline dynamically
      await import('preline/preline');
      
      // Re-initialize Preline components on route changes
      if (window.HSStaticMethods) {
        window.HSStaticMethods.autoInit();
      }
    };

    loadPreline();
  }, [location.pathname]);

  return null;
}
