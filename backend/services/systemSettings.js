const db = require("../config/db");

const DEFAULT_SYSTEM_SETTINGS = {
  registration_enabled: true,
  writer_applications_enabled: true,
  manual_payment_enabled: true,
  support_form_enabled: true,
  admin_password_reset_enabled: true,
  maintenance_notice: "",
  support_email: "",
  updated_note: "",
};

function safeParseJson(value, fallback) {
  if (!value) return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch (_) {
    return fallback;
  }
}

async function getSystemSettings() {
  try {
    const [rows] = await db.query(
      `SELECT setting_json
       FROM admin_settings
       WHERE setting_key = 'system_settings'
       LIMIT 1`,
    );

    return {
      ...DEFAULT_SYSTEM_SETTINGS,
      ...safeParseJson(rows[0]?.setting_json, {}),
    };
  } catch (_) {
    return { ...DEFAULT_SYSTEM_SETTINGS };
  }
}

async function isSystemFeatureEnabled(key, fallback = true) {
  const settings = await getSystemSettings();
  if (!(key in settings)) return fallback;
  return Boolean(settings[key]);
}

module.exports = {
  DEFAULT_SYSTEM_SETTINGS,
  getSystemSettings,
  isSystemFeatureEnabled,
};
