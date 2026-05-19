import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ProductsPage from './Products';
import SEOHelmet from '../utils/seoHelmet';
import { getCategoryLabel } from '../utils/categoryLabels';

const ElegantSparkPage = () => {
  const [, setSearchParams] = useSearchParams();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSearchParams({ category: 'Elegant Spark' });
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!ready) return null;

  return (
    <>
      <SEOHelmet
        title={`${getCategoryLabel('Elegant Spark')} | Panstellia`}
        description="Discover the Elegant Spark collection: refined, shimmering necklaces crafted for timeless elegance."
        keywords="elegant spark, necklaces, jewelry, panstellia"
        canonical={`https://panstellia.com/products?category=Elegant Spark`}
      />
      <ProductsPage />
    </>
  );
};

export default ElegantSparkPage;
