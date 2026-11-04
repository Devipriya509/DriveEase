const express = require("express");
const pool = require("../config/db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

const ADDON_PRICES = { None: 0, "Child seat": 300, "Extra insurance": 500, "GPS + Wi-Fi": 700 };

function daysBetween(start, end) {
  const ms = new Date(end) - new Date(start);
  return Math.max(1, Math.ceil(ms / 86400000) || 1);
}

// POST /api/calculate  { carId, days, addon, promoCode }
// Used by the price calculator widget - never trust a client-computed total.
router.post("/calculate", async (req, res) => {
  try {
    const { carId, days, addon, promoCode } = req.body;
    const [carRows] = await pool.query("SELECT * FROM cars WHERE id = ? AND is_active = 1", [carId]);
    if (!carRows.length) return res.status(404).json({ error: "Car not found." });
    const car = carRows[0];

    const addonCost = ADDON_PRICES[addon] ?? 0;
    const numDays = Math.max(1, Number(days) || 1);
    const subtotal = (car.price + addonCost) * numDays;

    let discountPercent = 0;
    if (promoCode) {
      const [promoRows] = await pool.query(
        "SELECT discount_percent FROM promo_codes WHERE code = ? AND active = 1",
        [promoCode.trim().toUpperCase()]
      );
      if (promoRows.length) discountPercent = promoRows[0].discount_percent;
    }

    const discount = Math.round((subtotal * discountPercent) / 100);
    const total = subtotal - discount;

    res.json({ days: numDays, subtotal, discountPercent, discount, total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not calculate price." });
  }
});

router.use(requireAuth);

// GET /api/bookings -> the logged-in user's bookings, most recent first
router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT b.*, c.name AS car_name, c.image AS car_image
       FROM bookings b JOIN cars c ON c.id = b.car_id
       WHERE b.user_id = ? ORDER BY b.created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load bookings." });
  }
});

// POST /api/bookings  { carId, startDate, endDate, pickupLocation, addon }
router.post("/", async (req, res) => {
  try {
    const { carId, startDate, endDate, pickupLocation, addon } = req.body;
    if (!carId || !startDate || !endDate) {
      return res.status(400).json({ error: "carId, startDate and endDate are required." });
    }

    const [carRows] = await pool.query("SELECT * FROM cars WHERE id = ? AND is_active = 1", [
      carId,
    ]);
    if (!carRows.length) return res.status(404).json({ error: "Car not found." });
    const car = carRows[0];

    const addonName = addon || "None";
    const addonCost = ADDON_PRICES[addonName] ?? 0;
    if (new Date(endDate) < new Date(startDate)) {
      return res.status(400).json({ error: "Return date can't be before pick-up date." });
    }
    const days = daysBetween(startDate, endDate);
    const total = (car.price + addonCost) * days;

    const [result] = await pool.query(
      `INSERT INTO bookings (user_id, car_id, pickup_location, start_date, end_date, addon, addon_cost, days, total, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Verification Pending')`,
      [req.user.id, carId, pickupLocation || "Chennai", startDate, endDate, addonName, addonCost, days, total]
    );

    res.status(201).json({
      id: result.insertId,
      car: car.name,
      start: startDate,
      end: endDate,
      total,
      status: "Verification Pending",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not create booking." });
  }
});

// PATCH /api/bookings/:id/cancel -> customer-initiated cancellation
router.patch("/:id/cancel", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM bookings WHERE id = ? AND user_id = ?", [
      req.params.id,
      req.user.id,
    ]);
    if (!rows.length) return res.status(404).json({ error: "Booking not found." });
    if (rows[0].status === "Completed") {
      return res.status(400).json({ error: "Completed bookings can't be cancelled." });
    }

    await pool.query("UPDATE bookings SET status = 'Cancelled' WHERE id = ?", [req.params.id]);
    res.json({ status: "Cancelled" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not cancel booking." });
  }
});

module.exports = router;
