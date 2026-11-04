const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

function signToken(user) {
  return jwt.sign(
    { id: user.id, name: user.name, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

// POST /api/auth/signup  { name, email, password, phone? }
router.post("/signup", async (req, res) => {
  try {
    const { name, password, phone } = req.body;
    const email = String(req.body.email || "").trim().toLowerCase();
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email and password are required." });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters." });
    }

    const [existing] = await pool.query("SELECT id FROM users WHERE email = ?", [email]);
    if (existing.length) {
      return res.status(409).json({ error: "An account with this email already exists." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      "INSERT INTO users (name, email, password_hash, phone) VALUES (?, ?, ?, ?)",
      [name, email, passwordHash, phone || null]
    );

    const user = { id: result.insertId, name, email };
    const token = signToken(user);
    res.status(201).json({ token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.code === "ER_NO_SUCH_TABLE" ? "Database not set up — run schema.sql." : err.code === "ECONNREFUSED" ? "Cannot reach MySQL — is it running?" : "Signup failed." });
  }
});

// POST /api/auth/login  { email, password }
router.post("/login", async (req, res) => {
  try {
    const password = req.body.password;
    const email = String(req.body.email || "").trim().toLowerCase();
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const [rows] = await pool.query(
      "SELECT id, name, email, password_hash FROM users WHERE email = ?",
      [email]
    );
    const dbUser = rows[0];
    if (!dbUser) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const match = await bcrypt.compare(password, dbUser.password_hash);
    if (!match) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const user = { id: dbUser.id, name: dbUser.name, email: dbUser.email };
    const token = signToken(user);
    res.json({ token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.code === "ER_NO_SUCH_TABLE" ? "Database not set up — run schema.sql." : err.code === "ECONNREFUSED" ? "Cannot reach MySQL — is it running?" : "Login failed." });
  }
});

// GET /api/auth/me  (requires token) - used to restore session on page load
router.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
