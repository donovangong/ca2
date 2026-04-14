const express = require("express");
const { Pool } = require("pg");
const defaultFetch = require("node-fetch");

function checkAdmin(req, res, next) {
  const adminUser = process.env.ADMIN_USER || "admin";
  const adminPassword = process.env.ADMIN_PASSWORD || "admin";

  if (req.headers["x-admin-user"] !== adminUser || req.headers["x-admin-password"] !== adminPassword) {
    return res.status(401).json({ error: "Invalid username or password" });
  }

  next();
}

function createPool() {
  return new Pool({
    host: process.env.DB_HOST || "postgres",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "postgres",
    database: process.env.DB_NAME || "orders_db",
    port: 5432
  });
}

function createApp(options = {}) {
  const app = express();
  const pool = options.pool || createPool();
  const fetch = options.fetch || defaultFetch;
  const productServiceUrl = options.productServiceUrl || process.env.PRODUCT_SERVICE_URL;

  if (!productServiceUrl) {
    throw new Error("PRODUCT_SERVICE_URL is required");
  }

  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Content-Type, x-admin-user, x-admin-password");
    res.header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
    next();
  });

  app.use(express.json());

  app.get("/health", async (req, res) => {
    try {
      await pool.query("SELECT 1");
      res.json({ status: "ok", service: "order-service" });
    } catch (error) {
      console.error("Health check failed:", error.message);
      res.status(500).json({ status: "error" });
    }
  });

  app.post(["/orders", "/api/orders"], async (req, res) => {
    const { product_id, quantity } = req.body;

    if (!product_id || !quantity || quantity < 1) {
      return res.status(400).json({ error: "product_id and valid quantity are required" });
    }

    try {
      console.log("POST /orders", req.body);

      const productResponse = await fetch(`${productServiceUrl}/products/${product_id}`);
      const product = await productResponse.json();

      if (!productResponse.ok) {
        return res.status(productResponse.status).json({ error: product.error || "Product lookup failed" });
      }

      if (quantity > product.stock) {
        return res.status(400).json({ error: "Not enough stock" });
      }

      const totalPrice = Number(product.price) * Number(quantity);
      const client = await pool.connect();

      try {
        await client.query("BEGIN");

        const orderResult = await client.query(
          `INSERT INTO orders (product_id, quantity, total_price)
           VALUES ($1, $2, $3)
           RETURNING id, product_id, quantity, total_price, created_at`,
          [product_id, quantity, totalPrice]
        );

        await client.query("UPDATE products SET stock = stock - $1 WHERE id = $2", [quantity, product_id]);
        await client.query("COMMIT");

        res.status(201).json(orderResult.rows[0]);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Error creating order:", error.message);
      res.status(500).json({ error: "Failed to create order" });
    }
  });

  app.get(["/orders", "/api/orders"], async (req, res) => {
    try {
      console.log("GET /orders");
      const result = await pool.query(
        "SELECT id, product_id, quantity, total_price, created_at FROM orders ORDER BY id DESC"
      );
      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching orders:", error.message);
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  app.get(["/orders/:id", "/api/orders/:id"], async (req, res) => {
    try {
      console.log("GET /orders/:id", req.params.id);
      const result = await pool.query(
        "SELECT id, product_id, quantity, total_price, created_at FROM orders WHERE id = $1",
        [req.params.id]
      );

      if (!result.rows.length) {
        return res.status(404).json({ error: "Order not found" });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error("Error fetching order:", error.message);
      res.status(500).json({ error: "Failed to fetch order" });
    }
  });

  app.delete(["/orders/:id", "/api/orders/:id"], checkAdmin, async (req, res) => {
    try {
      console.log("DELETE /orders/:id", req.params.id);
      const result = await pool.query(
        "DELETE FROM orders WHERE id = $1 RETURNING id",
        [req.params.id]
      );

      if (!result.rows.length) {
        return res.status(404).json({ error: "Order not found" });
      }

      res.json({ deleted: true, id: result.rows[0].id });
    } catch (error) {
      console.error("Error deleting order:", error.message);
      res.status(500).json({ error: "Failed to delete order" });
    }
  });

  return app;
}

module.exports = {
  createApp,
  createPool
};
