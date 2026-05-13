const cors = require("cors");

const allowedOrigins = [
  "http://localhost:5173",
  "https://panstellia.vercel.app",
  "https://panstellia-6ursnuep7-panstellia-spms-projects.vercel.app",
];

const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin
    if (!origin) {
      return callback(null, true);
    }

    // Allow known frontend origins
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Reject everything else
    return callback(new Error("Not allowed by CORS"));
  },

  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
});