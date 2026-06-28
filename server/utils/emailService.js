const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

// Update FROM_ADDRESS once your domain is verified in Resend.
// Until then, use "onboarding@resend.dev" for testing (Resend default sandbox).
const FROM_ADDRESS = "AML Motors <noreply@nafrok.com>";

const sendOtpEmail = async (to, otp) => {
  const { error } = await resend.emails.send({
    from:    FROM_ADDRESS,
    to:      [to],
    subject: "AML Motors — Password Reset OTP",
    html: `
      <div style="font-family:'IBM Plex Sans',sans-serif;max-width:480px;margin:0 auto;
                  padding:32px 24px;background:#FFFFFF;border:1px solid #DDE3EE;">
        <div style="height:3px;background:#1E3A8A;margin-bottom:28px;"></div>
        <div style="font-family:'Barlow Condensed',sans-serif;font-size:22px;
                    font-weight:700;color:#0A1628;letter-spacing:0.04em;
                    text-transform:uppercase;margin-bottom:4px;">AML MOTORS</div>
        <div style="font-size:10px;color:#6B7A99;letter-spacing:0.14em;
                    text-transform:uppercase;margin-bottom:28px;">
          Technician Performance Portal
        </div>
        <p style="font-size:14px;color:#374151;margin:0 0 20px;">
          You requested a password reset. Use the OTP below:
        </p>
        <div style="background:#EEF2F7;border:1px solid #DDE3EE;border-left:3px solid #1E3A8A;
                    padding:24px;margin:0 0 24px;text-align:center;">
          <div style="font-size:40px;font-weight:700;letter-spacing:0.4em;
                      color:#1E3A8A;font-family:monospace;">${otp}</div>
        </div>
        <p style="font-size:13px;color:#6B7A99;margin:0 0 8px;">
          This OTP expires in <strong>10 minutes</strong>.
        </p>
        <p style="font-size:13px;color:#6B7A99;margin:0 0 24px;">
          If you did not request this, ignore this email. Your password will not change.
        </p>
        <div style="height:1px;background:#DDE3EE;margin:0 0 20px;"></div>
        <p style="font-size:10px;color:#A0AABB;margin:0;
                  text-transform:uppercase;letter-spacing:0.1em;">
          Powered by NAFROK · AML Motors Internal System
        </p>
      </div>
    `,
  });

  if (error) throw new Error(`Email send failed: ${error.message}`);
};

module.exports = { sendOtpEmail };