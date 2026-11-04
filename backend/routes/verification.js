const express = require("express");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");
const pool = require("../config/db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

// --- File upload setup -------------------------------------------------
// Demo storage: saves to disk under /uploads with a random filename so the
// original name never leaks personal info. In production this should go to
// encrypted, access-controlled storage (e.g. S3 + KMS) behind a compliant
// identity-verification provider, not a local folder.
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, "..", "uploads")),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "application/pdf"]);

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_TYPES.has(file.mimetype)) {
      return cb(new Error("Only JPG, PNG or PDF files are accepted."));
    }
    cb(null, true);
  },
});

function hashIdNumber(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

// POST /api/verification  (multipart/form-data)
// fields: fullName, phone, idNumber, idProofType, rentalDueDate, bookingId?
// file:   idProofFile
// Wrap multer so file errors return a clean 400 instead of a 500.
function handleUpload(req, res, next) {
  upload.single("idProofFile")(req, res, (err) => {
    if (!err) return next();
    const msg = err.code === "LIMIT_FILE_SIZE" ? "File too large (max 5MB)." : err.message;
    res.status(400).json({ error: msg });
  });
}

router.post("/", handleUpload, async (req, res) => {
  try {
    const { fullName, phone, idNumber, idProofType, rentalDueDate, bookingId } = req.body;

    if (!fullName || !phone || !idNumber || !idProofType || !rentalDueDate) {
      return res.status(400).json({ error: "All verification fields are required." });
    }
    if (!req.file) {
      return res.status(400).json({ error: "ID proof file is required." });
    }
    if (!/^\d{12}$/.test(idNumber)) {
      return res.status(400).json({ error: "ID number must be 12 digits." });
    }

    const idNumberHash = hashIdNumber(idNumber);
    const idNumberLast4 = idNumber.slice(-4);

    const [result] = await pool.query(
      `INSERT INTO verifications
        (user_id, booking_id, full_name, phone, id_number_hash, id_number_last4, id_proof_type, id_proof_file_path, rental_due_date, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending Review')`,
      [
        req.user.id,
        bookingId || null,
        fullName,
        phone,
        idNumberHash,
        idNumberLast4,
        idProofType,
        req.file.filename,
        rentalDueDate,
      ]
    );

    if (bookingId) {
      await pool.query(
        "UPDATE bookings SET status = 'Confirmed' WHERE id = ? AND user_id = ?",
        [bookingId, req.user.id]
      );
    }

    res.status(201).json({
      id: result.insertId,
      status: "Pending Review",
      idNumberLast4,
    });
  } catch (err) {
    console.error(err);
    if (err.message && err.message.includes("Only JPG")) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: "Could not submit verification." });
  }
});

// GET /api/verification/me -> the logged-in user's verification requests
// Never returns the raw ID number, only the last 4 digits.
router.get("/me", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, booking_id, full_name, id_proof_type, id_number_last4, rental_due_date, status, created_at
       FROM verifications WHERE user_id = ? ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load verification status." });
  }
});

module.exports = router;
