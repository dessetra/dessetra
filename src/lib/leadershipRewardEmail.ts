type LeadershipRewardEmailParams = {
  fullName: string;
  rankName: string;
  rewardChoice: "cash_gift" | "item_reward";
  rewardItem?: string | null;
  cashAmount: number;
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
      <p style="color:white;margin-top:10px;font-size:14px;">
        Learn • Connect • Earn
      </p>
    </div>

    <div style="padding:35px;">

      <h2 style="margin-top:0;color:#071A3D;">
        ${title}
      </h2>

      ${body}

      <p style="margin-top:40px;color:#777;font-size:13px;text-align:center;line-height:1.8;">
        Thank you for being part of the Dessetra community.<br>
        This message was sent from info@dessetra.com.
      </p>

    </div>
  </div>
</body>
</html>
`;
}

export function buildLeadershipApprovedEmail({
  fullName,
  rankName,
  rewardChoice,
  rewardItem,
  cashAmount,
  adminNote,
}: LeadershipRewardEmailParams) {
  const rewardDescription =
    rewardChoice === "cash_gift"
      ? `Cash Gift of <strong>$${cashAmount.toFixed(2)}</strong>`
      : `<strong>${rewardItem || "Leadership Reward Item"}</strong>${
          cashAmount > 0
            ? ` + Cash Gift of <strong>$${cashAmount.toFixed(2)}</strong>`
            : ""
        }`;

  return {
    subject: `Dessetra Leadership Reward Approved - ${rankName}`,

    html: baseTemplate(
      "LEADERSHIP REWARD APPROVED",
      `
      <p style="font-size:16px;color:#555;">
        Hello <strong>${fullName}</strong>,
      </p>

      <p style="font-size:15px;line-height:1.8;color:#555;">
        Congratulations! Your Leadership Achievement Reward has been approved by the Dessetra Founder Team.
      </p>

      <table style="width:100%;border-collapse:collapse;margin-top:25px;">
        <tr>
          <td style="padding:8px 0;"><strong>Leadership Rank</strong></td>
          <td>${rankName}</td>
        </tr>

        <tr>
          <td style="padding:8px 0;"><strong>Reward</strong></td>
          <td>${rewardDescription}</td>
        </tr>

        <tr>
          <td style="padding:8px 0;"><strong>Status</strong></td>
          <td style="color:green;font-weight:bold;">APPROVED</td>
        </tr>
      </table>

      ${
        adminNote
          ? `
      <p style="margin-top:25px;color:#555;">
        <strong>Founder Note:</strong><br>
        ${adminNote}
      </p>
      `
          : ""
      }

      <p style="margin-top:30px;font-size:15px;color:#555;line-height:1.8;">
        Thank you for helping grow the Dessetra community. We appreciate your contribution and look forward to seeing you achieve even higher leadership ranks.
      </p>
      `
    ),
  };
}

export function buildLeadershipRejectedEmail({
  fullName,
  rankName,
  adminNote,
}: LeadershipRewardEmailParams) {
  return {
    subject: `Dessetra Leadership Reward Update - ${rankName}`,

    html: baseTemplate(
      "LEADERSHIP REWARD NOT APPROVED",
      `
      <p style="font-size:16px;color:#555;">
        Hello <strong>${fullName}</strong>,
      </p>

      <p style="font-size:15px;line-height:1.8;color:#555;">
        Your Leadership Achievement Reward for the <strong>${rankName}</strong> rank has been reviewed but was not approved at this time.
      </p>

      <p style="margin-top:25px;color:#555;">
        <strong>Founder Note:</strong><br>
        ${adminNote || "No additional information was provided."}
      </p>

      <p style="margin-top:30px;font-size:15px;color:#555;line-height:1.8;">
        If further action is required from you, the Founder Team will contact you through your registered email address or WhatsApp number.
      </p>
      `
    ),
  };
}