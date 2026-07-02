require("dotenv").config({ path: require("path").join(__dirname, "..", "..", ".env"), quiet: true });

const { getEmailProviderStatus, sendEmail } = require("../email");

function readEnv(name) {
  return String(process.env[name] || "").trim();
}

(async () => {
  const status = getEmailProviderStatus();
  const testTo = readEnv("EMAIL_TEST_TO");

  if (!status.configured) {
    console.log("SKIP email: no Resend, SMTP, or email webhook provider is configured.");
    if (String(process.env.NODE_ENV || "").toLowerCase() === "production") {
      process.exitCode = 1;
    }
    return;
  }

  console.log(`OK email: ${status.provider} provider is configured.`);

  if (!testTo) {
    console.log("SKIP email send: set EMAIL_TEST_TO to send a real test message.");
    return;
  }

  const result = await sendEmail({
    to: testTo,
    subject: "Read and Voice email delivery test",
    text: "Email delivery is configured correctly.",
    html: "<p>Email delivery is configured correctly.</p>",
  });

  if (!result.delivered) {
    console.error("MISSING email: provider did not deliver a test message.");
    process.exitCode = 1;
    return;
  }

  console.log(`OK email send: delivered via ${result.delivery}`);
})();
