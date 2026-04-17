const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const booksRoutes = require("./routes/books");
const cartRoutes = require("./routes/cart");
const categoriesRoutes = require("./routes/categories");
const libraryRoutes = require("./routes/library");
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

app.listen(PORT, () => {
  console.log("==================================");
  console.log(`Server running on port ${PORT}`);
  console.log(`http://localhost:${PORT}`);
  console.log("==================================");
});
