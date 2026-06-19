type WithdrawalEmailParams = {
  fullName: string;
  amount: number;
  currency: string;
  network: string;
  walletAddress: string;
  txHash?: string | null;
  adminNote?: string | null;
};

function baseTemplate(title: string, body: string) {
  return `
<!DOCTYPE html>
<html>
<body style="background:#eef3fa;padding:40px;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:700px;margin:auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 8px 20px rgba(0,0,0,.08);">
    <div style="background:#071A3D;padding:25px;text-align:center;">
      <h1 style="color:#D4AF37;margin:0;font-size:34px;">Dessetra</h1>
      <p style="color:white;margin-top:10px;font-size:14px;">Learn • Connect • Earn</p>
    </div>

    <div style="padding:35px;">
      <h2 style="margin-top:0;color:#071A3D;">${title}</h2>
      ${body}

      <p style="margin-top:40px;color:#777;font-size:13px;text-align:center;line-height:1.8;">
        Thank you for using Dessetra.<br>
        This message was sent from info@dessetra.com.
      </p>
    </div>
  </div>
</body>
</html>
`;
}

export function buildWithdrawalApprovedEmail({
  fullName,
  amount,
  currency,
  network,
  walletAddress,
  txHash,
  adminNote,
}: WithdrawalEmailParams) {
  return {
    subject: "Dessetra Withdrawal Approved",
    html: baseTemplate(
      "WITHDRAWAL APPROVED",
      `
      <p style="font-size:16px;color:#555;">Hello <strong>${fullName}</strong>,</p>

      <p style="font-size:15px;line-height:1.8;color:#555;">
        Your withdrawal request has been approved and processed successfully.
      </p>

      <table style="width:100%;border-collapse:collapse;margin-top:25px;">
        <tr><td style="padding:8px 0;"><strong>Amount</strong></td><td>$${amount.toFixed(
          2
        )} ${currency}</td></tr>
        <tr><td style="padding:8px 0;"><strong>Network</strong></td><td>${network}</td></tr>
        <tr><td style="padding:8px 0;"><strong>Wallet Address</strong></td><td style="word-break:break-all;">${walletAddress}</td></tr>
        <tr><td style="padding:8px 0;"><strong>Transaction Hash</strong></td><td style="word-break:break-all;">${
          txHash || "Not provided"
        }</td></tr>
        <tr><td style="padding:8px 0;"><strong>Status</strong></td><td style="color:green;font-weight:bold;">APPROVED</td></tr>
      </table>

      ${
        adminNote
          ? `<p style="margin-top:25px;color:#555;"><strong>Admin Note:</strong> ${adminNote}</p>`
          : ""
      }
      `
    ),
  };
}

export function buildWithdrawalRejectedEmail({
  fullName,
  amount,
  currency,
  network,
  walletAddress,
  adminNote,
}: WithdrawalEmailParams) {
  return {
    subject: "Dessetra Withdrawal Rejected",
    html: baseTemplate(
      "WITHDRAWAL REJECTED",
      `
      <p style="font-size:16px;color:#555;">Hello <strong>${fullName}</strong>,</p>

      <p style="font-size:15px;line-height:1.8;color:#555;">
        Your withdrawal request was reviewed and rejected.
      </p>

      <table style="width:100%;border-collapse:collapse;margin-top:25px;">
        <tr><td style="padding:8px 0;"><strong>Amount</strong></td><td>$${amount.toFixed(
          2
        )} ${currency}</td></tr>
        <tr><td style="padding:8px 0;"><strong>Network</strong></td><td>${network}</td></tr>
        <tr><td style="padding:8px 0;"><strong>Wallet Address</strong></td><td style="word-break:break-all;">${walletAddress}</td></tr>
        <tr><td style="padding:8px 0;"><strong>Status</strong></td><td style="color:#b91c1c;font-weight:bold;">REJECTED</td></tr>
      </table>

      <p style="margin-top:25px;color:#555;">
        <strong>Reason:</strong> ${adminNote || "No specific reason was provided."}
      </p>
      `
    ),
  };
}