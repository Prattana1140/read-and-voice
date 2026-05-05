const jwt = require("jsonwebtoken");
const db = require("../config/db");

let sessionTablesReady;

async function ensureSessionTables() {
  if (!sessionTablesReady) {
    sessionTablesReady = db
      .query(`
        CREATE TABLE IF NOT EXISTS user_session_revocations (
          user_id INT PRIMARY KEY,
          revoked_after DATETIME NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT fk_user_session_revocations_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `)
      .then(() => true);
  }

  return sessionTablesReady;
}

async function isTokenRevoked(decoded) {
  await ensureSessionTables();
  const [rows] = await db.query(
    `SELECT revoked_after
     FROM user_session_revocations
     WHERE user_id = ?
     LIMIT 1`,
    [decoded.id],
  );

  const revokedAfter = rows[0]?.revoked_after;
  if (!revokedAfter || !decoded.iat) return false;

  return decoded.iat < Math.floor(new Date(revokedAfter).getTime() / 1000);
}

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

    if (await isTokenRevoked(decoded)) {
      return res.status(401).json({ message: "session นี้ถูกออกจากระบบแล้ว" });
    }

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
    if (await isTokenRevoked(decoded)) {
      req.user = null;
      return next();
    }

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
