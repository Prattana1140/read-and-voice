const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config({ quiet: true });

const authRoutes = require("./routes/auth");
const booksRoutes = require("./routes/books");
const cartRoutes = require("./routes/cart");
const categoriesRoutes = require("./routes/categories");
const libraryRoutes = require("./routes/library");
const ordersRoutes = require("./routes/orders");
const progressRoutes = require("./routes/progress");
const adminUsersRoutes = require("./routes/adminUsers");

const app = express();
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:5173",
  "http://127.0.0.1:5173",
].filter(Boolean);

app.disable("x-powered-by");

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/", (req, res) => {
  return res.status(200).json({
    message: "API is running...",
    app: "Read and Voice Backend",
    status: "ok",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/books", booksRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/categories", categoriesRoutes);
app.use("/api/library", libraryRoutes);
app.use("/api/orders", ordersRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api/admin", adminUsersRoutes);

app.use((req, res) => {
  return res.status(404).json({
    message: `ไม่พบเส้นทาง ${req.method} ${req.originalUrl}`,
  });
});

app.use((err, req, res, next) => {
  console.error("GLOBAL ERROR:", err);

  return res.status(err.status || 500).json({
    message: err.message || "เกิดข้อผิดพลาดในระบบ",
  });
});

const PORT = Number(process.env.PORT) || 3000;
const EXTRA_PORT = Number(process.env.APP_PORT || process.env.PUBLIC_PORT || 3000);
const REQUEST_TIMEOUT_MS = 30 * 60 * 1000;

const HOST = process.env.HOST || "0.0.0.0";

function configureTimeouts(server) {
  server.requestTimeout = REQUEST_TIMEOUT_MS;
  server.headersTimeout = REQUEST_TIMEOUT_MS + 5000;
}

function listen(port, label) {
  const server = app.listen(port, HOST, () => {
    console.log("==================================");
    console.log(`Server ${label} running on ${HOST}:${port}`);
    console.log(`http://localhost:${port}`);
    console.log("==================================");
  });

  configureTimeouts(server);

  server.on("error", (error) => {
    console.error(`Server ${label} failed on ${HOST}:${port}`, error.message);
  });

  return server;
}

const server = listen(PORT, "primary");

if (EXTRA_PORT && EXTRA_PORT !== PORT) {
  listen(EXTRA_PORT, "secondary");
}
