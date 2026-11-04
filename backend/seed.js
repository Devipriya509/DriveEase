// Runs schema.sql using the credentials in .env:  npm run seed
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    multipleStatements: true,
  });
  await conn.query(fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8"));
  console.log("✅ Database + tables + demo cars created.");
  await conn.end();
})().catch((e) => { console.error("❌ Seed failed:", e.code || e.message); process.exit(1); });
