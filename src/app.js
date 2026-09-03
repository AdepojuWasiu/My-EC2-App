import express from "express";
import dotenv from "dotenv";
import pool from "./db.js";
import client from "./redis.js";
import userRoutes from "./routes.js";

dotenv.config();

const app = express();

app.use(express.json());

// Initialize database schema
async function initializeDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        age INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("Users table initialized");
  } catch (error) {
    console.error("Error initializing database:", error);
  }
}

initializeDatabase();

app.get("/", (req, res) => {
  res.json({
    message: "Simple EC2 App API is running",
  });
});

app.get("/health", async (req, res) => {
  try {
    const dbResult = await pool.query("SELECT NOW()");
    const redisInfo = await client.ping();

    res.json({
      status: "OK",
      database: "connected",
      redis: "connected",
      time: dbResult.rows[0].now,
      redisPing: redisInfo,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      status: "ERROR",
      database: "disconnected",
    });
  }
});

// User routes
app.use("/users", userRoutes);

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});