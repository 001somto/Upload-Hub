// gateways/emailGateway.js
// WHAT THIS FILE IS: how the backend sends email (only password-reset emails for now).
// WHAT IT DOES: two simple versions:
//   console -> prints the reset link in the backend terminal (development only)
//   none    -> sends nothing
// Real sending (AWS SES) belongs to the backend teammate: write a gateway with the same two
// parts (configured, sendPasswordReset) and pass it to createApp({ email }).

export function createEmailGateway(mode) {
  if (mode === "console") {
    return {
      configured: false, // nothing is really emailed
      developmentOnly: true,
      async sendPasswordReset({ to, link }) {
        console.log(`\n[DEV ONLY] Password reset link for ${to}:\n${link}\n`);
      },
    };
  }
  return { configured: false, developmentOnly: false, async sendPasswordReset() {} };
}
