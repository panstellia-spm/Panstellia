import { Helmet } from 'react-helmet-async';

/**
 * SEO Meta Tags Component
 * Manages all meta tags, Open Graph, and schema.org structured data for each page
 */
export const SEOHelmet = ({ 
  title = 'Panstellia | Luxury Necklace Jewelry',
  description = 'Discover exquisite necklace jewelry collections from Panstellia. Premium quality gold, silver, and handcrafted pieces for every occasion.',
  keywords = 'jewelry, necklaces, gold necklaces, silver necklaces, Lux Wear jewelry, luxury jewelry',
  canonical,
  ogImage = '/og-image.jpg',
  ogType = 'website',
  structuredData = null
}) => {
  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta name="author" content="Panstellia" />
      
      {/* Canonical URL */}
      {canonical && <link rel="canonical" href={canonical} />}
      
      {/* Open Graph Meta Tags */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={ogType} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:site_name" content="Panstellia" />
      
      {/* Twitter Card Meta Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      
      {/* Additional SEO Meta Tags */}
      <meta name="robots" content="index, follow" />
      <meta name="language" content="English" />
      <meta name="revisit-after" content="7 days" />
      
      {/* Structured Data / JSON-LD */}
      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}
    </Helmet>
  );
};

export default SEOHelmet;
