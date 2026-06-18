type InvestmentReceiptParams = {
  fullName: string;
  email: string;
  investmentAmount: number;
  targetReturn: number;
  dsnTokens: number;
  paymentId: string;
  activatedAt: string;
  nextMeetingAt?: string | null;
};

export function buildInvestmentReceipt({
  fullName,
  email,
  investmentAmount,
  targetReturn,
  dsnTokens,
  paymentId,
  activatedAt,
  nextMeetingAt,
}: InvestmentReceiptParams) {
  const receiptNumber = `INV-${Date.now()}`;

  return {
    subject: "Dessetra Investment Confirmation",

    html: `
<!DOCTYPE html>
<html>

<head>
<meta charset="UTF-8">
<title>Dessetra Investment Receipt</title>
</head>

<body style="
background:#eef3fa;
padding:40px;
font-family:Arial,Helvetica,sans-serif;
">

<div style="
max-width:700px;
margin:auto;
background:white;
border-radius:12px;
overflow:hidden;
box-shadow:0 8px 20px rgba(0,0,0,.08);
">

<div style="
background:#071A3D;
padding:25px;
text-align:center;
">

<h1 style="
color:#D4AF37;
margin:0;
font-size:34px;
">
Dessetra
</h1>

<p style="
color:white;
margin-top:10px;
font-size:14px;
">
Learn • Connect • Earn
</p>

</div>

<div style="padding:35px;">

<h2 style="
margin-top:0;
color:#071A3D;
">
INVESTMENT CONFIRMATION
</h2>

<p style="
font-size:16px;
color:#555;
">
Hello <strong>${fullName}</strong>,
</p>

<p style="
font-size:15px;
line-height:1.8;
color:#555;
">
Congratulations! Your investment has been successfully activated on the Dessetra platform.
</p>

<hr style="margin:30px 0;">

<table style="
width:100%;
border-collapse:collapse;
">

<tr>
<td style="padding:8px 0;"><strong>Receipt Number</strong></td>
<td>${receiptNumber}</td>
</tr>

<tr>
<td style="padding:8px 0;"><strong>Email</strong></td>
<td>${email}</td>
</tr>

<tr>
<td style="padding:8px 0;"><strong>Investment Amount</strong></td>
<td>$${investmentAmount.toFixed(2)} USD</td>
</tr>

<tr>
<td style="padding:8px 0;"><strong>Projected Return</strong></td>
<td>$${targetReturn.toFixed(2)} USD</td>
</tr>

<tr>
<td style="padding:8px 0;"><strong>DSN Allocation</strong></td>
<td>${dsnTokens.toLocaleString()} DSN</td>
</tr>

<tr>
<td style="padding:8px 0;"><strong>Payment ID</strong></td>
<td>${paymentId}</td>
</tr>

<tr>
<td style="padding:8px 0;"><strong>Activated On</strong></td>
<td>${activatedAt}</td>
</tr>

<tr>
<td style="padding:8px 0;"><strong>Next Investor Meeting</strong></td>
<td>${nextMeetingAt || "To be announced"}</td>
</tr>

<tr>
<td style="padding:8px 0;"><strong>Status</strong></td>
<td style="color:green;font-weight:bold;">
ACTIVE
</td>
</tr>

</table>

<div style="
text-align:center;
margin-top:40px;
">

<a
href="https://www.dessetra.com/dashboard/investor"
style="
background:#D4AF37;
padding:14px 28px;
border-radius:8px;
text-decoration:none;
color:#071A3D;
font-weight:bold;
display:inline-block;
">

Open Investor Dashboard

</a>

</div>

<p style="
margin-top:40px;
color:#777;
font-size:13px;
text-align:center;
line-height:1.8;
">

Thank you for investing with Dessetra.<br>

We appreciate your confidence in our vision and look forward to building the future of Web3 education together.

</p>

</div>

</div>

</body>

</html>
`,
  };
}