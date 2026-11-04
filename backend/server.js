require("dotenv").config();
const fs = require("fs");
const path = require("path");
const express = require("express");
const cors = require("cors");
const pool = require("./config/db");

// Fail-safe: never crash login because JWT_SECRET is missing.
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = "dev_only_insecure_secret_change_me";
  console.warn("⚠️  JWT_SECRET missing in .env — using an insecure dev secret. Set it in backend/.env!");
}

const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const authRoutes = require("./routes/auth");
const carRoutes = require("./routes/cars");
const wishlistRoutes = require("./routes/wishlist");
const bookingRoutes = require("./routes/bookings");
const verificationRoutes = require("./routes/verification");

const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN || "*" }));
app.use(express.json());

// Health also reports DB status so problems are visible immediately.
app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true, db: "connected" });
  } catch (err) {
    res.status(500).json({ ok: false, db: "error", error: err.code || err.message });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/cars", carRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/verification", verificationRoutes);

app.use("/api", (req, res) => res.status(404).json({ error: "API route not found." }));

const frontendPath = path.join(__dirname, "..", "frontend");
app.use(express.static(frontendPath));
app.get("*", (req, res) => res.sendFile(path.join(frontendPath, "index.html")));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "Something went wrong." });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  console.log(`DriveEase running on http://localhost:${PORT}`);
  try {
    await pool.query("SELECT 1");
    const [[{ n }]] = await pool.query("SELECT COUNT(*) AS n FROM cars");
    console.log(`✅ MySQL connected (${n} cars in DB)`);
  } catch (err) {
    console.error("❌ MySQL connection/schema problem:", err.code || err.message);
    console.error("   → Check DB_* values in backend/.env and run: mysql -u root -p < schema.sql");
  }
});
