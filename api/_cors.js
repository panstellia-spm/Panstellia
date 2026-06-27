const defaultAllowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5174",
  "http://localhost:5175",
  "http://127.0.0.1:5175",
  "http://localhost:5176",
  "http://127.0.0.1:5176",
  "https://panstellia.vercel.app",
  "https://panstellia.com",
  "https://www.panstellia.com",
];

function getAllowedOrigins() {
  const configuredOrigins = (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return new Set([...defaultAllowedOrigins, ...configuredOrigins]);
}

function isOriginAllowed(origin) {
  if (!origin) return true;
  
  // Allow any vercel.app preview deployments dynamically
  if (origin.endsWith('.vercel.app')) return true;

  return getAllowedOrigins().has(origin);
}

export function handleCors(req, res) {
  const origin = req.headers.origin;

  if (origin && isOriginAllowed(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  }

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return true; // handled
  }

  if (origin && !isOriginAllowed(origin)) {
    res.status(403).json({ error: "CORS blocked" });
    return true; // handled
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method Not Allowed" });
    return true; // handled
  }

  return false; // not preflight/blocked, proceed to handler
}
