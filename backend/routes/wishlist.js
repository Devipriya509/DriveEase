const express = require("express");
const pool = require("../config/db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

// GET /api/wishlist -> full car objects the user has saved
router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT c.* FROM wishlist w JOIN cars c ON c.id = w.car_id WHERE w.user_id = ?`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load wishlist." });
  }
});

// POST /api/wishlist/:carId -> toggle add/remove, returns { saved: true/false }
router.post("/:carId", async (req, res) => {
  try {
    const carId = Number(req.params.carId);
    const [car] = await pool.query("SELECT id FROM cars WHERE id = ?", [carId]);
    if (!car.length) return res.status(404).json({ error: "Car not found." });
    const [existing] = await pool.query(
      "SELECT id FROM wishlist WHERE user_id = ? AND car_id = ?",
      [req.user.id, carId]
    );

    if (existing.length) {
      await pool.query("DELETE FROM wishlist WHERE id = ?", [existing[0].id]);
      return res.json({ saved: false });
    }

    await pool.query("INSERT INTO wishlist (user_id, car_id) VALUES (?, ?)", [
      req.user.id,
      carId,
    ]);
    res.json({ saved: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not update wishlist." });
  }
});

module.exports = router;
