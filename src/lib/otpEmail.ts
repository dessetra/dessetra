type OtpEmailParams = {
  fullName: string;
  otpCode: string;
  purpose: "wallet_save" | "withdrawal";
};

function baseTemplate(title: string, body: string) {
  return `
<!DOCTYPE html>
<html>
<body style="background:#eef3fa;padding:40px;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:700px;margin:auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 8px 20px rgba(0,0,0,.08);">

    <div style="background:#071A3D;padding:25px;text-align:center;">
      <h1 style="color:#D4AF37;margin:0;font-size:34px;">Dessetra</h1>
      <p style="color:white;margin-top:10px;font-size:14px;">
        Learn • Connect • Earn
      </p>
    </div>

    <div style="padding:35px;">

      <h2 style="color:#071A3D;margin-top:0;">
        ${title}
      </h2>

      ${body}

      <div
        style="
          margin:35px 0;
          text-align:center;
          background:#071A3D;
          color:#D4AF37;
          padding:20px;
          border-radius:10px;
          font-size:34px;
          letter-spacing:8px;
          font-weight:bold;
        "
      >
        {{OTP}}
      </div>

      <p style="color:#555;line-height:1.8;">
        This verification code expires in <strong>10 minutes</strong>.
      </p>

      <p style="color:#555;line-height:1.8;">
        If you did not initiate this request, please ignore this email and
        secure your account immediately.
      </p>

      <hr style="margin:35px 0;" />

      <p
        style="
          color:#888;
          text-align:center;
          font-size:13px;
        "
      >
        © Dessetra • Learn • Connect • Earn<br/>
        Sent from info@dessetra.com
      </p>

    </div>

  </div>
</body>
</html>
`;
}

export function buildOtpEmail({
  fullName,
  otpCode,
  purpose,
}: OtpEmailParams) {
  const title =
    purpose === "wallet_save"
      ? "Verify Your Withdrawal Wallet"
      : "Confirm Withdrawal Request";

  const intro =
    purpose === "wallet_save"
      ? `
        <p>Hello <strong>${fullName}</strong>,</p>

        <p>
          You requested to save or change your withdrawal wallet on Dessetra.
        </p>

        <p>
          Please use the verification code below to complete the process.
        </p>
      `
      : `
        <p>Hello <strong>${fullName}</strong>,</p>

        <p>
          You requested to create a withdrawal request from your Dessetra account.
        </p>

        <p>
          Please use the verification code below to continue.
        </p>
      `;

  return {
    subject: title,
    html: baseTemplate(title, intro).replace("{{OTP}}", otpCode),
  };
}