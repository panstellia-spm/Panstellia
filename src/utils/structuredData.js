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

export const getSiteNavigationSchema = () => ({
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  'itemListElement': [
    {
      '@type': 'SiteNavigationElement',
      'position': 1,
      'name': 'Shop All Collections',
      'description': 'Browse our complete range of exquisite necklace jewelry',
      'url': 'https://panstellia.com/products'
    },
    {
      '@type': 'SiteNavigationElement',
      'position': 2,
      'name': 'Elite Series',
      'description': 'Discover our premium, handcrafted Elite Series jewelry',
      'url': 'https://panstellia.com/products?category=Lux%20Wear'
    },
    {
      '@type': 'SiteNavigationElement',
      'position': 3,
      'name': 'About Us',
      'description': 'Learn about Panstellia’s brand, heritage, and story',
      'url': 'https://panstellia.com/about-us'
    },
    {
      '@type': 'SiteNavigationElement',
      'position': 4,
      'name': 'New Arrivals',
      'description': 'Explore our latest jewelry additions and trending pieces',
      'url': 'https://panstellia.com/products'
    },
    {
      '@type': 'SiteNavigationElement',
      'position': 5,
      'name': 'Careers',
      'description': 'Join the Panstellia team and craft brilliance with us',
      'url': 'https://panstellia.com/careers'
    }
  ]
});

export const getProductSchema = (product) => ({
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: product.name,
  description: product.description,
  image: product.image,
  brand: {
    '@type': 'Brand',
    name: product.brandName || 'Panstellia'
  },
  manufacturer: {
    '@type': 'Organization',
    name: product.countryOfOrigin || 'Panstellia'
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
  aggregateRating: product.rating
    ? {
        '@type': 'AggregateRating',
        ratingValue: product.rating,
        reviewCount: product.reviewCount || 0
      }
    : undefined,
  sku: product.sku,
  additionalProperty: [
    product.skuCode
      ? { '@type': 'PropertyValue', name: 'SKU Code', value: product.skuCode }
      : undefined,
    product.barcode
      ? {
          '@type': 'PropertyValue',
          name: 'Barcode / EAN',
          value: product.barcode
        }
      : undefined,
    product.productCategory
      ? {
          '@type': 'PropertyValue',
          name: 'Product Category',
          value: product.productCategory
        }
      : undefined,
    product.productType
      ? {
          '@type': 'PropertyValue',
          name: 'Product Type',
          value: product.productType
        }
      : undefined,
    product.brandName
      ? {
          '@type': 'PropertyValue',
          name: 'Brand Name',
          value: product.brandName
        }
      : undefined,
    product.collectionName
      ? {
          '@type': 'PropertyValue',
          name: 'Collection Name',
          value: product.collectionName
        }
      : undefined,
    product.gender
      ? {
          '@type': 'PropertyValue',
          name: 'Gender',
          value: product.gender
        }
      : undefined,
    product.ageGroup
      ? {
          '@type': 'PropertyValue',
          name: 'Age Group',
          value: product.ageGroup
        }
      : undefined,
    product.occasion
      ? {
          '@type': 'PropertyValue',
          name: 'Occasion',
          value: product.occasion
        }
      : undefined,
    product.countryOfOrigin
      ? {
          '@type': 'PropertyValue',
          name: 'Country of Origin',
          value: product.countryOfOrigin
        }
      : undefined,

    product.baseMaterial
      ? {
          '@type': 'PropertyValue',
          name: 'Base Material',
          value: product.baseMaterial
        }
      : undefined,
    product.primaryStone
      ? {
          '@type': 'PropertyValue',
          name: 'Primary Stone',
          value: product.primaryStone
        }
      : undefined,
    product.stoneType
      ? {
          '@type': 'PropertyValue',
          name: 'Stone Type',
          value: product.stoneType
        }
      : undefined,
    product.stoneColor
      ? {
          '@type': 'PropertyValue',
          name: 'Stone Color',
          value: product.stoneColor
        }
      : undefined,
    product.platingType
      ? {
          '@type': 'PropertyValue',
          name: 'Plating Type',
          value: product.platingType
        }
      : undefined,
    product.platingThickness
      ? {
          '@type': 'PropertyValue',
          name: 'Plating Thickness',
          value: product.platingThickness
        }
      : undefined,
    product.finishType
      ? {
          '@type': 'PropertyValue',
          name: 'Finish Type',
          value: product.finishType
        }
      : undefined,

    product.nickelFree != null
      ? {
          '@type': 'PropertyValue',
          name: 'Nickel Free',
          value: product.nickelFree ? 'Yes' : 'No'
        }
      : undefined,
    product.hypoallergenic != null
      ? {
          '@type': 'PropertyValue',
          name: 'Hypoallergenic',
          value: product.hypoallergenic ? 'Yes' : 'No'
        }
      : undefined,
    product.tarnishResistant != null
      ? {
          '@type': 'PropertyValue',
          name: 'Tarnish Resistant',
          value: product.tarnishResistant ? 'Yes' : 'No'
        }
      : undefined
  ].filter(Boolean)
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
  sameAs: ['https://facebook.com/panstellia', 'https://instagram.com/panstellia']
});

