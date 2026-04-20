const express = require("express");
const db = require("../config/db");
const { verifyToken } = require("../middleware/auth");
const { requireAdmin } = require("../middleware/admin");
const { requireSuperAdmin } = require("../middleware/superadmin");

const router = express.Router();

const allowedRoles = ["user", "writer", "admin", "superadmin"];
const allowedStatuses = ["active", "banned"];

async function listUsers(_req, res) {
  try {
    const [rows] = await db.query(
      `SELECT id, name, email, role, status, created_at
       FROM users
       ORDER BY created_at DESC`
    );

    return res.json(rows);
  } catch (error) {
    console.error("GET /admin/users error:", error);
    return res.status(500).json({ message: "Unable to load users" });
  }
}

async function updateUserStatus(req, res) {
  try {
    const userId = Number(req.params.id);
    const { status } = req.body;

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid user status" });
    }

    if (userId === Number(req.user.id)) {
      return res.status(400).json({ message: "You cannot change your own status" });
    }

    const [result] = await db.query(
      "UPDATE users SET status = ? WHERE id = ?",
      [status, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({
      message:
        status === "banned"
          ? "User banned successfully"
          : "User unbanned successfully",
    });
  } catch (error) {
    console.error("PUT /admin/users/:id/status error:", error);
    return res.status(500).json({ message: "Unable to update user status" });
  }
}

async function updateUserRole(req, res) {
  try {
    const userId = Number(req.params.id);
    const { role } = req.body;

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    if (userId === Number(req.user.id) && role !== req.user.role) {
      return res.status(400).json({ message: "You cannot change your own role" });
    }

    const [targetRows] = await db.query(
      "SELECT id, role FROM users WHERE id = ? LIMIT 1",
      [userId]
    );
    const targetUser = targetRows[0];

    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (targetUser.role === "superadmin" && role !== "superadmin") {
      return res.status(400).json({ message: "Superadmin role cannot be downgraded" });
    }

    const [result] = await db.query("UPDATE users SET role = ? WHERE id = ?", [
      role,
      userId,
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({ message: "User role updated successfully" });
  } catch (error) {
    console.error("PUT /admin/users/:id/role error:", error);
    return res.status(500).json({ message: "Unable to update user role" });
  }
}

function approveAdmin(req, res) {
  req.body.role = "admin";
  return updateUserRole(req, res);
}

function revokeAdmin(req, res) {
  req.body.role = "user";
  return updateUserRole(req, res);
}

router.get("/", verifyToken, requireAdmin, listUsers);
router.get("/users", verifyToken, requireAdmin, listUsers);

router.put("/:id/status", verifyToken, requireAdmin, updateUserStatus);
router.put("/users/:id/status", verifyToken, requireAdmin, updateUserStatus);
router.patch("/:id/status", verifyToken, requireAdmin, updateUserStatus);
router.patch("/users/:id/status", verifyToken, requireAdmin, updateUserStatus);

router.put("/:id/role", verifyToken, requireSuperAdmin, updateUserRole);
router.put("/users/:id/role", verifyToken, requireSuperAdmin, updateUserRole);
router.patch("/:id/role", verifyToken, requireSuperAdmin, updateUserRole);
router.patch("/users/:id/role", verifyToken, requireSuperAdmin, updateUserRole);
router.patch("/users/:id/approve-admin", verifyToken, requireSuperAdmin, approveAdmin);
router.patch("/users/:id/revoke-admin", verifyToken, requireSuperAdmin, revokeAdmin);

module.exports = router;
