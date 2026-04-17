const jwt = require("jsonwebtoken");

function verifyToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "ไม่ได้ส่ง token" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: "token ไม่ถูกต้องหรือหมดอายุ" });
  }
}

function allowRoles(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "ไม่พบข้อมูลผู้ใช้งาน" });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "ไม่มีสิทธิ์ใช้งาน" });
    }

    next();
  };
}

module.exports = {
  verifyToken,
  allowRoles,
};