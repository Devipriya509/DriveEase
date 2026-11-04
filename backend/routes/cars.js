const express = require("express");
const pool = require("../config/db");

const router = express.Router();

// GET /api/cars?type=suv&search=thar&sort=low
router.get("/", async (req, res) => {
  try {
    const { type, search, sort } = req.query;
    let sql = "SELECT * FROM cars WHERE is_active = 1";
    const params = [];

    if (type && type !== "all") {
      sql += " AND type = ?";
      params.push(type);
    }
    if (search) {
      sql += " AND name LIKE ?";
      params.push(`%${search}%`);
    }

    if (sort === "low") sql += " ORDER BY price ASC";
    else if (sort === "high") sql += " ORDER BY price DESC";
    else if (sort === "rating") sql += " ORDER BY rating DESC";
    else sql += " ORDER BY id ASC"; // "featured"

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load cars." });
  }
});

// GET /api/cars/:id
router.get("/:id", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM cars WHERE id = ? AND is_active = 1", [
      req.params.id,
    ]);
    if (!rows.length) return res.status(404).json({ error: "Car not found." });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load car." });
  }
});

// POST /api/cars/match  { purpose, budget, seats, transmission }
// Same rules as the frontend's Smart Match quiz, now enforced server-side.
router.post("/match", async (req, res) => {
  try {
    const { purpose, budget, seats, transmission } = req.body;
    const [cars] = await pool.query("SELECT * FROM cars WHERE is_active = 1");

    let result = cars.filter((c) => {
      const budgetOk =
        budget === "low" ? c.price <= 2000 : budget === "mid" ? c.price <= 4000 : true;
      const seatsOk = !seats || c.seats >= Number(seats);
      const transOk = !transmission || transmission === "Any" || c.transmission === transmission;
      const purposeOk =
        purpose === "adventure"
          ? c.type === "suv"
          : purpose === "business"
          ? c.type === "sedan" || c.type === "luxury"
          : purpose === "family"
          ? c.seats >= 5
          : true;
      return budgetOk && seatsOk && transOk && purposeOk;
    });

    if (!result.length) result = cars.slice(0, 3);
    res.json(result.slice(0, 3));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not compute matches." });
  }
});

module.exports = router;
