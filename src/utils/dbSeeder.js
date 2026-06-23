import { db } from '../services/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export const DEFAULT_HOMEPAGE_LAYOUT = {
  marqueeText: "⭐ 4.6/5 Rating  |  2,000+ Happy Customers  |  Free Shipping on ₹999+  |  easy 3 -4 days return  |  handcrafted in korea  |  ",
  updatedAt: new Date().toISOString(),
  updatedBy: "System Seeder",
  sections: [
    {
      id: "hero_slider",
      type: "hero",
      enabled: true,
      order: 0,
      slides: [
        {
          image: "https://i.ibb.co/wFKPsvF3/file-0000000067f871faa8219b12c171e65f.png",
          title: "Wear Your Story",
          subtitle: "Handcrafted luxury necklaces for every occasion",
          ctaText: "Shop Now",
          ctaLink: "/products"
        },
        {
          image: "https://i.ibb.co/FbBwVw0x/file-000000001d907208abea67f9c539d069.png",
          title: "Timeless Elegance",
          subtitle: "Discover our premium Gold and Silver series",
          ctaText: "Explore Collections",
          ctaLink: "/products?category=Lux%20Wear"
        },
        {
          image: "https://i.ibb.co/HTxTW4Mc/file-00000000f23871fabbbf324fd6b04d95.png",
          title: "Dazzling Brilliance",
          subtitle: "Fine craftsmanship with precious stones",
          ctaText: "Shop Diamonds",
          ctaLink: "/products?category=Elegant%20Spark"
        }
      ]
    },
    {
      id: "features_bar",
      type: "features",
      enabled: true,
      order: 1,
      items: [
        { icon: "Truck", title: "Free Shipping", description: "On orders above ₹1000" },
        { icon: "Shield", title: "Secure Payment", description: "100% secure transactions" },
        { icon: "RefreshCw", title: "Easy Returns", description: "3-4 days return policy" },
        { icon: "Star", title: "Quality Guaranteed", description: "Authentic materials only" }
      ]
    },
    {
      id: "offers_grid",
      type: "offers",
      enabled: true,
      order: 2,
      title: "Today's Offers",
      description: "Quick deals for every budget and occasion",
      items: [
        { icon: "BadgePercent", title: "Starting ₹199", text: "Daily wear jewellery picks", to: "/products?maxPrice=199&sortBy=price-low", tone: "from-gold-500 to-gold-700" },
        { icon: "Gift", title: "Under ₹499", text: "Gift-ready favourites", to: "/products?maxPrice=499&sortBy=price-low", tone: "from-luxury-800 to-luxury-600" },
        { icon: "Sparkles", title: "25% OFF", text: "Lux Wear collection", to: "/products?category=Lux%20Wear", tone: "from-rose-500 to-gold-600" },
        { icon: "Star", title: "Best Rated", text: "Customer-loved pieces", to: "/products?sortBy=rating", tone: "from-emerald-700 to-gold-600" }
      ]
    },
    {
      id: "collections_grid",
      type: "collections_grid",
      enabled: true,
      order: 3,
      title: "Shop by Collection",
      description: "Find the perfect piece for every occasion",
      categories: ["Gold", "Silver", "Lux Wear", "Party Wear", "Elegant Spark"]
    },
    {
      id: "bestsellers_shelf",
      type: "bestsellers",
      enabled: true,
      order: 4,
      title: "Our Bestsellers",
      description: "Our most loved and reviewed jewelry pieces",
      limit: 4
    },
    {
      id: "reviews_carousel",
      type: "reviews",
      enabled: true,
      order: 5
    },
    {
      id: "customer_feedback",
      type: "feedback",
      enabled: true,
      order: 6
    },
    {
      id: "trending_banner",
      type: "banner",
      enabled: true,
      order: 7,
      title: "Trending Collections",
      description: "Get upto 25% off on our Premium collection. Make your special day even more memorable with our exquisite designs.",
      ctaText: "View Collection",
      ctaLink: "/products?category=Lux%20Wear",
      images: [
        "https://i.ibb.co/wFKPsvF3/file-0000000067f871faa8219b12c171e65f.png",
        "https://i.ibb.co/v6D0LrQG/file-0000000035cc71fa963321ed9c5ee32f.png",
        "https://i.ibb.co/HfHynYrb/file-00000000501871fabeb3ad48399d23bd.png",
        "https://i.ibb.co/4gRy3WYW/Use-AI-Image-May-19-2026-13-21-30.png",
        "https://i.ibb.co/DD38dQ8Q/file-000000008b207207972a2996aa7d3be3.png"
      ]
    },
    {
      id: "newsletter_signup",
      type: "newsletter",
      enabled: true,
      order: 8,
      title: "Get 10% Off Your First Order",
      description: "Join the Panstellia family for exclusive drops and styling tips."
    }
  ]
};

export const DEFAULT_PAYMENTS = {
  cod: {
    enabled: true,
    minOrderValue: 0,
    maxOrderValue: 50000
  },
  razorpay: {
    enabled: true,
    minOrderValue: 0
  },
  upi: {
    enabled: true,
    minOrderValue: 0
  },
  partial: {
    enabled: false,
    minOrderValue: 10000,
    partialPercentage: 30
  }
};

export const DEFAULT_CMS = {
  navigation: [
    { to: '/', label: 'Home', icon: 'Home' },
    { to: '/products', label: 'Shop', icon: 'Store' },
    { to: '/products?category=Gold', label: 'Gold Collection', icon: 'Gem', category: 'Gold' },
    { to: '/products?category=Silver', label: 'Silver Collection', icon: 'CircleDot', category: 'Silver' },
    { to: '/products?category=Lux Wear', label: 'Lux Wear', icon: 'Crown', category: 'Lux Wear' },
    { to: '/category/elegant-spark', label: 'Elegant Spark', icon: 'Sparkles', category: 'Elegant Spark' },
    { to: '/products?category=Piercings', label: 'Piercings', icon: 'Diamond', category: 'Piercings' }
  ],
  contact: {
    email: "support@panstellia.com",
    phone: "+91 78100 32622, +91 90802 32622",
    address: "9A, Indhira Nagar, Neyveli, Cuddalore, TamilNadu, India",
    instagram: "https://www.instagram.com/panstellia",
    facebook: "https://www.facebook.com/people/Panstellia-PS/61581753914404/"
  },
  about: {
    title: "About Panstellia",
    story: "Handcrafted luxury necklaces for every occasion. We curate and craft jewelry inspired by timeless heritage and modern fashion, featuring intricate designs, delicate chains, and beautiful details.",
    mission: "Our mission is to bring premium Korean craftsmanship and luxury jewelry styles directly to jewelry lovers everywhere, without the traditional markup."
  },
  faqs: [
    { question: "How long does shipping take?", answer: "Orders are shipped within 24-48 hours and typically arrive in 3-5 business days." },
    { question: "What is your return policy?", answer: "We offer an easy 3-4 days return policy on unused items in original packaging." },
    { question: "Are these items real gold and silver?", answer: "We offer both premium 925 sterling silver products, plated luxury items, and special wear collections as detailed in the specifications of each product." }
  ],
  policies: {
    shipping: "We ship nationwide across India. Shipping is free on orders above ₹1000. Under ₹1000, a flat shipping charge of ₹80 applies. Cash on delivery is available for eligible addresses.",
    privacy: "Your privacy is important to us. We store customer details like name, shipping addresses, and emails strictly for order processing and newsletter services. We do not sell or lease your data.",
    terms: "By ordering from Panstellia, you agree to our terms of service. Prices listed are inclusive of tax. Payments are processed securely. Cancellations are accepted only before shipment."
  }
};

export const DEFAULT_FILTERS = {
  list: [
    {
      id: "material",
      name: "Material",
      options: ["Gold", "Silver", "Lux Wear", "Party Wear", "Elegant Spark"],
      enabled: true,
      order: 0,
      categories: ["All"]
    },
    {
      id: "platingType",
      name: "Plating Type",
      options: ["Gold Plated", "Rhodium Plated", "Rose Gold Plated", "None"],
      enabled: true,
      order: 1,
      categories: ["All", "Gold", "Silver"]
    },
    {
      id: "stoneType",
      name: "Stone Type",
      options: ["VVS Diamond", "Cubic Zirconia", "Emerald", "Ruby", "None"],
      enabled: true,
      order: 2,
      categories: ["All", "Elegant Spark"]
    },
    {
      id: "gender",
      name: "Gender",
      options: ["Women", "Unisex", "Men"],
      enabled: true,
      order: 3,
      categories: ["All"]
    }
  ]
};

export const DEFAULT_REVIEWS = [
  {
    rating: 5,
    text: '"The elegance and craftsmanship of Panstellia necklaces are unmatched! Every piece is a masterpiece that adds instant sophistication to any outfit. Absolutely stunning!"',
    avatar: '✨',
    name: 'SOPHIA MARTINEZ',
    role: 'Luxury Enthusiast',
    status: 'approved',
    featured: true,
    pinned: true,
    createdAt: new Date().toISOString()
  },
  {
    rating: 5,
    text: '"I am completely mesmerized by the intricate designs and premium quality. The packaging was luxurious and the customer service team was incredibly helpful and responsive."',
    avatar: '💎',
    name: 'EMMA WILSON',
    role: 'Fashion Designer',
    status: 'approved',
    featured: true,
    pinned: false,
    createdAt: new Date().toISOString()
  },
  {
    rating: 5,
    text: '"These necklaces are worth every single penny! The attention to detail is remarkable, and the materials feel authentic and precious. Perfect for special occasions!"',
    avatar: '👑',
    name: 'OLIVIA CHEN',
    role: 'Style Influencer',
    status: 'approved',
    featured: true,
    pinned: false,
    createdAt: new Date().toISOString()
  }
];

export const DEFAULT_OFFERS = [
  {
    code: 'TEST50',
    type: 'flat',
    value: 50,
    minOrderValue: 200,
    enabled: true,
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    usageCount: 0,
    maxUses: 100
  },
  {
    code: 'BUY2GET1',
    type: 'buy_x_get_y',
    buyQty: 2,
    getQty: 1,
    enabled: true,
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    usageCount: 0,
    maxUses: 100
  }
];

export async function initializeDatabase() {
  try {
    // Check and seed Payments
    const payRef = doc(db, 'system_settings', 'payments');
    const paySnap = await getDoc(payRef);
    if (!paySnap.exists()) {
      await setDoc(payRef, DEFAULT_PAYMENTS);
      console.log('Seeded system_settings/payments');
    }

    // Check and seed CMS
    const cmsRef = doc(db, 'system_settings', 'cms');
    const cmsSnap = await getDoc(cmsRef);
    if (!cmsSnap.exists()) {
      await setDoc(cmsRef, DEFAULT_CMS);
      console.log('Seeded system_settings/cms');
    }

    // Check and seed Filters
    const filtRef = doc(db, 'system_settings', 'filters');
    const filtSnap = await getDoc(filtRef);
    if (!filtSnap.exists()) {
      await setDoc(filtRef, DEFAULT_FILTERS);
      console.log('Seeded system_settings/filters');
    }

    // Check and seed Homepage layout
    const homeRef = doc(db, 'homepage_layout', 'active');
    const homeSnap = await getDoc(homeRef);
    if (!homeSnap.exists()) {
      await setDoc(homeRef, DEFAULT_HOMEPAGE_LAYOUT);
      console.log('Seeded homepage_layout/active');
    }

    // Seed default reviews if reviews collection is empty
    const { collection, getDocs, addDoc } = await import('firebase/firestore');
    const revSnap = await getDocs(collection(db, 'reviews'));
    if (revSnap.empty) {
      for (const rev of DEFAULT_REVIEWS) {
        await addDoc(collection(db, 'reviews'), rev);
      }
      console.log('Seeded reviews collection');
    }

    // Seed default offers
    for (const offer of DEFAULT_OFFERS) {
      const offerRef = doc(db, 'offers', offer.code);
      const offerSnap = await getDoc(offerRef);
      if (!offerSnap.exists()) {
        await setDoc(offerRef, offer);
        console.log(`Seeded offer ${offer.code}`);
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Database seeding failed:', error);
    return { success: false, error: error.message };
  }
}
