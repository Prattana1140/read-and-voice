const { verifyToken, allowRoles } = require("./auth");

// Compatibility layer for older imports.
// Prefer importing verifyToken/allowRoles from ./auth in new code.
module.exports = {
  authMiddleware: verifyToken,
  adminOnly: allowRoles("admin", "superadmin"),
};
