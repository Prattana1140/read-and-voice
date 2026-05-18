require("dotenv").config({ quiet: true });

const db = require("../../config/db");

const EXPECTED_USERS = [
  { email: "reader.nida@readvoice.local", role: "user" },
  { email: "reader.arun@readvoice.local", role: "user" },
  { email: "writer.mali@readvoice.local", role: "writer" },
  { email: "writer.tan@readvoice.local", role: "writer" },
  { email: "admin.ops@readvoice.local", role: "admin" },
  { email: "superadmin@readvoice.local", role: "superadmin" },
];

async function main() {
  const emails = EXPECTED_USERS.map((user) => user.email);
  const [rows] = await db.query(
    `SELECT email, role, status
     FROM users
     WHERE email IN (${emails.map(() => "?").join(",")})
     ORDER BY email`,
    emails,
  );

  const actualByEmail = new Map(rows.map((row) => [row.email, row]));
  let failed = false;

  for (const expected of EXPECTED_USERS) {
    const actual = actualByEmail.get(expected.email);
    if (!actual) {
      failed = true;
      console.log(`MISSING ${expected.email}: expected role=${expected.role}`);
      continue;
    }

    const ok = actual.role === expected.role && actual.status === "active";
    if (!ok) failed = true;
    console.log(
      `${ok ? "OK" : "MISMATCH"} ${expected.email}: role=${actual.role}, status=${actual.status}, expected=${expected.role}/active`,
    );
  }

  if (failed) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error("Demo user check failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.end();
  });
