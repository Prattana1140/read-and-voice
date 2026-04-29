const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config({ quiet: true });

const db = require("./config/db");
const authRoutes = require("./routes/auth");
const booksRoutes = require("./routes/books");
const cartRoutes = require("./routes/cart");
const categoriesRoutes = require("./routes/categories");
const libraryRoutes = require("./routes/library");
const ordersRoutes = require("./routes/orders");
const progressRoutes = require("./routes/progress");
const adminUsersRoutes = require("./routes/adminUsers");
const adminBooksRoutes = require("./routes/adminBooks");

const profileRoutes = require("./routes/profile");
const subscriptionsRoutes = require("./routes/subscriptions");
const writerBooksRoutes = require("./routes/writerBooks");
const readerRoutes = require("./routes/reader");
const adminStatsRoutes = require("./routes/adminStats");
const coinsRoutes = require("./routes/coins");
const pageContentRoutes = require("./routes/pageContent");
const shelvesRoutes = require("./routes/shelves");
const accountRoutes = require("./routes/account");
const wishlistRoutes = require("./routes/wishlist");
const reviewsRoutes = require("./routes/reviews");
const episodeCommentsRoutes = require("./routes/episodeComments");
const notificationsRoutes = require("./routes/notifications");
const paymentsRoutes = require("./routes/payments");
const writersRoutes = require("./routes/writers");
const { generateBookCoverPath } = require("./services/bookCover");

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

app.get("/uploads/book-covers/:filename", async (req, res, next) => {
  const filename = path.basename(req.params.filename || "");
  if (!filename || filename !== req.params.filename || !filename.endsWith(".svg")) {
    return next();
  }

  const coverPath = path.join(__dirname, "uploads", "book-covers", filename);
  if (require("fs").existsSync(coverPath)) {
    return res.sendFile(coverPath);
  }

  try {
    const relativePath = `uploads/book-covers/${filename}`;
    const [rows] = await db.query(
      `SELECT b.id, b.title, b.subtitle, b.author, b.author_name, b.description, c.name AS category_name
       FROM books b
       LEFT JOIN categories c ON c.id = b.category_id
       WHERE TRIM(LEADING '/' FROM COALESCE(b.cover_image_url, b.cover_image, '')) = ?
          OR TRIM(LEADING '/' FROM COALESCE(b.cover_image, b.cover_image_url, '')) = ?
       LIMIT 1`,
      [relativePath, relativePath],
    );

    if (rows.length === 0) return next();

    const book = rows[0];
    const generatedPath = generateBookCoverPath({
      bookId: book.id,
      title: book.title,
      subtitle: book.subtitle,
      author: book.author_name || book.author,
      seed: `${book.category_name || ""}:${book.description || ""}`,
      force: true,
    });

    if (path.basename(generatedPath) !== filename) return next();
    return res.sendFile(coverPath);
  } catch (error) {
    return next(error);
  }
});

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/", (_req, res) => {
  return res.status(200).json({
    message: "API is running...",
    app: "Read and Voice Backend",
    status: "ok",
  });
});

app.get("/api", (_req, res) => {
  return res.status(200).json({
    message: "Read and Voice API",
    status: "ok",
    endpoints: [
      "/api/books",
      "/api/books/:id",
      "/api/books/:id/content",
      "/api/ebooks",
      "/api/serials",
      "/api/best-sellers",
      "/api/new-releases",
      "/api/promotions",
      "/api/free-books",
      "/api/hall-of-fame",
      "/api/recommended",
      "/api/subscription",
      "/api/subscriptions/plans",
      "/api/subscriptions/me",
      "/api/page-content",
      "/api/page-content/subscription-hero",
      "/api/account/following",
      "/api/account/notifications",
      "/api/writers/:slug",
      "/api/writers/me/profile",
      "/api/reader/books/:bookId/content",
      "/api/reader/settings/tts",
      "/api/payments/status/:orderId",
      "/api/wishlist",
      "/api/books/:bookId/reviews",
      "/api/reviews/:reviewId",
    ],
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/books", booksRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/categories", categoriesRoutes);
app.use("/api/library", libraryRoutes);
app.use("/api/orders", ordersRoutes);
app.use("/api/payments", paymentsRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api/admin", adminUsersRoutes);
app.use("/api/admin/books", adminBooksRoutes);

app.use("/api/profile", profileRoutes);
app.use("/api/subscriptions", subscriptionsRoutes);
app.use("/api/writer/books", writerBooksRoutes);
app.use("/api/reader", readerRoutes);
app.use("/api/admin/stats", adminStatsRoutes);
app.use("/api/coins", coinsRoutes);
app.use("/api/page-content", pageContentRoutes);
app.use("/api/account", accountRoutes);
app.use("/api/account/notifications", notificationsRoutes);
app.use("/api/writers", writersRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api", reviewsRoutes);
app.use("/api", episodeCommentsRoutes);
app.use("/api", shelvesRoutes);

app.use((req, res) => {
  return res.status(404).json({
    message: `ไม่พบเส้นทาง ${req.method} ${req.originalUrl}`,
  });
});

app.use((err, _req, res, _next) => {
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

listen(PORT, "primary");

if (EXTRA_PORT && EXTRA_PORT !== PORT) {
  listen(EXTRA_PORT, "secondary");
}
