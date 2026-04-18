const jwt = require("jsonwebtoken");
const db = require("../config/db");

async function verifyToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

    if (!token) {
      return res.status(401).json({ message: "ไม่พบ token" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const [rows] = await db.query(
      `SELECT id, name, email, role, status
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [decoded.id]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: "ไม่พบผู้ใช้งาน" });
    }

    const user = rows[0];

    if (user.status && user.status !== "active") {
      return res.status(403).json({ message: "บัญชีนี้ถูกระงับการใช้งาน" });
    }

    req.user = user;
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Token ไม่ถูกต้องหรือหมดอายุ" });
  }
}

async function optionalVerifyToken(req, _res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const [rows] = await db.query(
      `SELECT id, name, email, role, status
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [decoded.id]
    );

    const user = rows[0] || null;
    req.user = user && (!user.status || user.status === "active") ? user : null;
  } catch (_) {
    req.user = null;
  }

  return next();
}

function allowRoles(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "กรุณาเข้าสู่ระบบก่อน" });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "คุณไม่มีสิทธิ์ใช้งานส่วนนี้" });
    }

    return next();
  };
}

module.exports = {
  verifyToken,
  optionalVerifyToken,
  allowRoles,
};
