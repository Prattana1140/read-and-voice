function requireSuperAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: "กรุณาเข้าสู่ระบบก่อน" });
  }

  if (req.user.role !== "superadmin") {
    return res.status(403).json({ message: "เฉพาะ superadmin เท่านั้น" });
  }

  next();
}

module.exports = { requireSuperAdmin };
