require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const authRoutes = require("./routes/auth.routes");
const databaseRoutes = require("./routes/database.routes");
const queryRoutes = require("./routes/query.routes");
const historyRoutes = require("./routes/history.routes");
const favoritesRoutes = require("./routes/favorites.routes");
const { notFound, errorHandler } = require("./middleware/errorHandler");

const app = express();

// --- Security & core middleware ---
app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== "test") {
  app.use(morgan(process.env.NODE_ENV === "development" ? "dev" : "combined"));
}

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000", 10),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100", 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests, please try again later." },
});
app.use("/api", limiter);

// --- Health check ---
app.get("/health", (req, res) => {
  res.status(200).json({ success: true, message: "AI SQL Assistant API is running", timestamp: new Date().toISOString() });
});

// --- Routes ---
app.use("/api/auth", authRoutes);
app.use("/api/connections", databaseRoutes);
app.use("/api/query", queryRoutes);
app.use("/api/history", historyRoutes);
app.use("/api/favorites", favoritesRoutes);

// --- Error handling (must be last) ---
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`AI SQL Assistant API listening on port ${PORT} [${process.env.NODE_ENV || "development"}]`);
});

module.exports = app;
