/**
 * Structured Data / JSON-LD Helper Functions
 * Creates schema.org compliant structured data for better SEO
 */

/**
 * WebSite schema — enables Google Sitelinks Search Box and
 * confirms the canonical URL of the site to Google.
 * This is the single most important schema for SERP features.
 */
export const getWebSiteSchema = () => ({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Panstellia',
  url: 'https://panstellia.com',
  description: 'Luxury necklace jewelry collections — Gold, Silver, Elite Series, and more.',
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: 'https://panstellia.com/products?search={search_term_string}'
    },
    'query-input': 'required name=search_term_string'
  }
});

export const getOrganizationSchema = () => ({
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Panstellia',
  url: 'https://panstellia.com',
  logo: {
    '@type': 'ImageObject',
    url: 'https://panstellia.com/favicon.svg',
    width: 512,
    height: 512
  },
  description: 'Luxury necklace jewelry collections — handcrafted gold, silver and premium pieces for every occasion.',
  sameAs: [
    'https://facebook.com/panstellia',
    'https://instagram.com/panstellia',
    'https://twitter.com/panstellia'
  ],
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'Customer Service',
    email: 'support@panstellia.com',
    availableLanguage: 'English'
  }
});

export const getSiteNavigationSchema = () => ({
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  'name': 'Panstellia Site Navigation',
  'itemListElement': [
    {
      '@type': 'SiteNavigationElement',
      'position': 1,
      'name': 'Shop',
      'description': 'Browse our complete range of luxury necklace jewelry — Gold, Silver, Party Wear and more.',
      'url': 'https://panstellia.com/products'
    },
    {
      '@type': 'SiteNavigationElement',
      'position': 2,
      'name': 'Elite Series',
      'description': 'Discover our premium, handcrafted Elite Series (Lux Wear) luxury jewelry collection.',
      'url': 'https://panstellia.com/products?category=Lux%20Wear'
    },
    {
      '@type': 'SiteNavigationElement',
      'position': 3,
      'name': 'About Us',
      'description': 'Learn about Panstellia — our story, founder Cimeon Moses, and our brand values.',
      'url': 'https://panstellia.com/about-us'
    },
    {
      '@type': 'SiteNavigationElement',
      'position': 4,
      'name': 'Careers',
      'description': 'Join the Panstellia team. Open roles in Neyveli and remote across design, content, and operations.',
      'url': 'https://panstellia.com/careers'
    }
  ]
});

/**
 * WebPage schema — emit on individual pages so Google
 * can index each page as a distinct, named entity.
 * breadcrumbName: short label shown in sitelinks (e.g. "About Us")
 */
export const getWebPageSchema = ({ name, description, url, breadcrumbName }) => ({
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name,
  description,
  url,
  breadcrumb: {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://panstellia.com' },
      { '@type': 'ListItem', position: 2, name: breadcrumbName, item: url }
    ]
  },
  isPartOf: {
    '@type': 'WebSite',
    name: 'Panstellia',
    url: 'https://panstellia.com'
  }
});

export const getProductSchema = (product) => ({
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: product.name,
  description: product.description,
  image: product.image || product.images?.[0] || '',
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
        image: product.image || product.images?.[0] || '',
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

