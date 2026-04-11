const express = require("express");
const { Pool } = require("pg");

const app = express();
const port = 3001;

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type, x-admin-user, x-admin-password");
  res.header("Access-Control-Allow-Methods", "GET, PUT, OPTIONS");
  next();
});

app.use(express.json());

function checkAdmin(req, res, next) {
  const adminUser = process.env.ADMIN_USER || "admin";
  const adminPassword = process.env.ADMIN_PASSWORD || "admin";

  if (req.headers["x-admin-user"] !== adminUser || req.headers["x-admin-password"] !== adminPassword) {
    return res.status(401).json({ error: "Invalid username or password" });
  }

  next();
}

const pool = new Pool({
  host: process.env.DB_HOST || "postgres",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  database: process.env.DB_NAME || "orders_db",
  port: 5432
});

app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", service: "product-service" });
  } catch (error) {
    console.error("Health check failed:", error.message);
    res.status(500).json({ status: "error" });
  }
});

app.get(["/products", "/api/products"], async (req, res) => {
  try {
    console.log("GET /products");
    const result = await pool.query("SELECT id, name, price, stock FROM products ORDER BY id");
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching products:", error.message);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

app.get(["/products/:id", "/api/products/:id"], async (req, res) => {
  try {
    console.log("GET /products/:id", req.params.id);
    const result = await pool.query(
      "SELECT id, name, price, stock FROM products WHERE id = $1",
      [req.params.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching product:", error.message);
    res.status(500).json({ error: "Failed to fetch product" });
  }
});

app.put(["/products/:id", "/api/products/:id"], checkAdmin, async (req, res) => {
  const { price, stock } = req.body;

  if (price === undefined || stock === undefined || price < 0 || stock < 0) {
    return res.status(400).json({ error: "Valid price and stock are required" });
  }

  try {
    console.log("PUT /products/:id", req.params.id);
    const result = await pool.query(
      `UPDATE products
       SET price = $1, stock = $2
       WHERE id = $3
       RETURNING id, name, price, stock`,
      [price, stock, req.params.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating product:", error.message);
    res.status(500).json({ error: "Failed to update product" });
  }
});

app.listen(port, () => {
  console.log(`product-service running on port ${port}`);
});
