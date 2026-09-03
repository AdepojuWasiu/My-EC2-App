import express from "express";
import pool from "./db.js";
import client from "./redis.js";

const router = express.Router();

// Get all users
router.get("/", async (req, res) => {
  try {
    // Try to get from Redis cache
    const cachedUsers = await client.get("all_users");
    if (cachedUsers) {
      return res.json(JSON.parse(cachedUsers));
    }

    // Get from database
    const result = await pool.query("SELECT * FROM users ORDER BY id");
    const users = result.rows;

    // Cache for 5 minutes (300 seconds)
    await client.setEx("all_users", 300, JSON.stringify(users));

    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Get user by ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Try to get from Redis cache
    const cachedUser = await client.get(`user:${id}`);
    if (cachedUser) {
      return res.json(JSON.parse(cachedUser));
    }

    // Get from database
    const result = await pool.query("SELECT * FROM users WHERE id = $1", [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = result.rows[0];

    // Cache for 5 minutes
    await client.setEx(`user:${id}`, 300, JSON.stringify(user));

    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// Create user
router.post("/", async (req, res) => {
  try {
    const { name, email, age } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: "Name and email are required" });
    }

    const result = await pool.query(
      "INSERT INTO users (name, email, age) VALUES ($1, $2, $3) RETURNING *",
      [name, email, age || null]
    );

    const user = result.rows[0];

    // Invalidate cache
    await client.del("all_users");

    res.status(201).json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create user" });
  }
});

// Update user
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, age } = req.body;

    const result = await pool.query(
      "UPDATE users SET name = COALESCE($1, name), email = COALESCE($2, email), age = COALESCE($3, age) WHERE id = $4 RETURNING *",
      [name || null, email || null, age || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = result.rows[0];

    // Invalidate cache
    await client.del("all_users");
    await client.del(`user:${id}`);

    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update user" });
  }
});

// Delete user
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "DELETE FROM users WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    // Invalidate cache
    await client.del("all_users");
    await client.del(`user:${id}`);

    res.json({ message: "User deleted", user: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete user" });
  }
});

export default router;
