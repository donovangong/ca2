const express = require("express");

function checkAdmin(req, res, next) {
  const adminUser = process.env.ADMIN_USER || "admin";
  const adminPassword = process.env.ADMIN_PASSWORD || "admin";

  if (req.headers["x-admin-user"] !== adminUser || req.headers["x-admin-password"] !== adminPassword) {
    return res.status(401).json({ error: "Invalid username or password" });
  }

  next();
}

function configureApp(app, methods) {
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Content-Type, x-admin-user, x-admin-password");
    res.header("Access-Control-Allow-Methods", methods.join(", "));
    next();
  });

  app.use(express.json());
}

function asyncRoute(handler, logMessage, errorMessage) {
  return async (req, res) => {
    try {
      if (logMessage) {
        console.log(logMessage, req.params.id || req.body || "");
      }

      await handler(req, res);
    } catch (error) {
      console.error(`${errorMessage}:`, error.message);
      res.status(500).json({ error: errorMessage });
    }
  };
}

function healthRoute(pool, service) {
  return async (req, res) => {
    try {
      await pool.query("SELECT 1");
      res.json({ status: "ok", service });
    } catch (error) {
      console.error("Health check failed:", error.message);
      res.status(500).json({ status: "error" });
    }
  };
}

module.exports = {
  express,
  checkAdmin,
  configureApp,
  asyncRoute,
  healthRoute
};
