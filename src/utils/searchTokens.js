/**
 * searchTokens.js
 * Generates normalized search token arrays for Firestore documents.
 * Tokens are stored in a _searchTokens field for fast array-contains queries.
 */

/**
 * Tokenize a string into lowercase, deduplicated search tokens.
 * Splits on spaces, hyphens, underscores, and non-alphanumeric chars.
 */
function tokenize(str) {
  if (!str || typeof str !== 'string') return [];
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\u0900-\u097f\s]/g, ' ') // keep alphanumeric + Devanagari
    .split(/\s+/)
    .filter(t => t.length >= 2); // skip single-char tokens
}

/**
 * Generate all prefix sub-tokens for partial/prefix matching.
 * e.g. "gold" => ["g", "go", "gol", "gold"] (min length 2)
 */
function prefixTokens(str) {
  const tokens = tokenize(str);
  const prefixes = new Set();
  tokens.forEach(token => {
    for (let i = 2; i <= token.length; i++) {
      prefixes.add(token.slice(0, i));
    }
  });
  return Array.from(prefixes);
}

/**
 * Build _searchTokens array for a product document.
 * Combines exact tokens + prefix tokens from all searchable fields.
 */
export function buildProductTokens(product) {
  const fields = [
    product.name,
    product.skuCode,
    product.category,
    product.collectionName,
    product.baseMaterial,
    product.primaryStone,
    product.stoneType,
    product.platingType,
    product.brandName,
    product.productType,
    product.gender,
    product.occasion,
    product.productStatus,
    product.description?.slice(0, 200), // first 200 chars of description
  ];

  const tokens = new Set();

  fields.forEach(field => {
    tokenize(field).forEach(t => tokens.add(t));
    prefixTokens(field).forEach(t => tokens.add(t));
  });

  // Add price range tokens for filtering
  const price = Number(product.price || 0);
  if (price < 500) tokens.add('under500');
  else if (price < 1000) tokens.add('under1000');
  else if (price < 2000) tokens.add('under2000');
  else if (price < 5000) tokens.add('under5000');
  else tokens.add('above5000');

  // Add status tokens
  if (!product.inStock || product.productStatus === 'unavailable') tokens.add('outofstock');
  if (product.inStock && product.productStatus !== 'unavailable') tokens.add('instock');
  if (product.featured) tokens.add('featured');

  return Array.from(tokens).slice(0, 200); // Firestore array limit guard
}

/**
 * Build _searchTokens for an order document.
 */
export function buildOrderTokens(order) {
  const fields = [
    order.customerName,
    order.name,
    order.fullName,
    order.email,
    order.customerEmail,
    order.phone,
    order.mobile,
    order.city,
    order.id,
    ...(order.items || []).map(i => i.name),
  ];

  const tokens = new Set();
  fields.forEach(field => {
    tokenize(String(field || '')).forEach(t => tokens.add(t));
  });

  // Add order ID suffixes for partial ID search
  if (order.id) {
    const suffix = order.id.slice(-8).toLowerCase();
    for (let i = 2; i <= suffix.length; i++) tokens.add(suffix.slice(0, i));
  }

  return Array.from(tokens).slice(0, 200);
}

/**
 * Client-side weighted relevance scorer.
 * Returns a score 0–100 for how well a document matches a query.
 * Higher = more relevant.
 */
export function scoreMatch(query, fields) {
  if (!query) return 100;
  const q = query.toLowerCase().trim();
  if (!q) return 100;

  let score = 0;
  const tokens = q.split(/\s+/).filter(Boolean);

  fields.forEach(({ value, weight = 1 }) => {
    if (!value) return;
    const v = String(value).toLowerCase();

    tokens.forEach(token => {
      if (v === token) score += 100 * weight;           // Exact full match
      else if (v.startsWith(token)) score += 60 * weight;  // Starts with token
      else if (v.includes(token)) score += 30 * weight;    // Contains token
    });
  });

  return score;
}

/**
 * Client-side search filter.
 * Takes an array of items and a query string, returns filtered+ranked items.
 *
 * @param {Array} items - data items
 * @param {string} query - search query
 * @param {Array} fieldConfig - [{ key: 'name', weight: 2 }, ...]
 * @returns {Array} - filtered and relevance-sorted items
 */
export function clientSearch(items, query, fieldConfig) {
  if (!query || !query.trim()) return items;

  const scored = items
    .map(item => {
      const fields = fieldConfig.map(({ key, weight }) => ({
        value: key.split('.').reduce((o, k) => o?.[k], item), // supports 'a.b.c' paths
        weight,
      }));
      return { item, score: scoreMatch(query, fields) };
    })
    .filter(({ score }) => score > 0);

  return scored
    .sort((a, b) => b.score - a.score)
    .map(({ item }) => item);
}
