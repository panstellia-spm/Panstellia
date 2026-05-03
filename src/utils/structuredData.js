/**
 * Structured Data / JSON-LD Helper Functions
 * Creates schema.org compliant structured data for better SEO
 */

export const getOrganizationSchema = () => ({
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Panstellia',
  url: 'https://panstellia.com',
  logo: 'https://panstellia.com/logo.svg',
  description: 'Luxury necklace jewelry collections',
  sameAs: [
    'https://facebook.com/panstellia',
    'https://instagram.com/panstellia',
    'https://twitter.com/panstellia'
  ],
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'Customer Service',
    email: 'support@panstellia.com'
  }
});

export const getProductSchema = (product) => ({
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: product.name,
  description: product.description,
  image: product.image,
  brand: {
    '@type': 'Brand',
    name: 'Panstellia'
  },
  manufacturer: {
    '@type': 'Organization',
    name: 'Panstellia'
  },
  offers: {
    '@type': 'Offer',
    price: product.price,
    priceCurrency: 'USD',
    availability: product.inStock ? 'InStock' : 'OutOfStock',
    seller: {
      '@type': 'Organization',
      name: 'Panstellia'
    }
  },
  aggregateRating: product.rating ? {
    '@type': 'AggregateRating',
    ratingValue: product.rating,
    reviewCount: product.reviewCount || 0
  } : undefined,
  sku: product.sku
});

export const getBreadcrumbSchema = (breadcrumbs) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: breadcrumbs.map((crumb, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: crumb.name,
    item: crumb.url
  }))
});

export const getCollectionSchema = (collectionName, products) => ({
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: collectionName,
  description: `Browse our ${collectionName} necklace collection`,
  mainEntity: {
    '@type': 'ItemList',
    itemListElement: products.map((product, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'Product',
        name: product.name,
        image: product.image,
        url: `/product/${product.id}`
      }
    }))
  }
});

export const getLocalBusinessSchema = () => ({
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  name: 'Panstellia',
  image: 'https://panstellia.com/logo.svg',
  description: 'Luxury necklace jewelry store',
  address: {
    '@type': 'PostalAddress',
    streetAddress: '',
    addressLocality: '',
    addressRegion: '',
    postalCode: '',
    addressCountry: 'US'
  },
  sameAs: [
    'https://facebook.com/panstellia',
    'https://instagram.com/panstellia'
  ]
});
