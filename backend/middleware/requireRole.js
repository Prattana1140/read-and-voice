// backend/middleware/requireRole.js
function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    const userRole = req.user?.role;

    if (!userRole) {
      return res.status(401).json({ message: "ไม่พบข้อมูลผู้ใช้งาน" });
    }

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ message: "คุณไม่มีสิทธิ์ใช้งานส่วนนี้" });
    }

    next();
  };
}

module.exports = requireRole;