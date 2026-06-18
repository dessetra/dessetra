type SubscriptionReceiptParams = {
  fullName: string;
  email: string;
  planName: string;
  billingCycle: string;
  amountUsd: number;
  paymentId: string;
  activatedAt: string;
  expiresAt: string;
};

export function buildSubscriptionReceipt({
  fullName,
  email,
  planName,
  billingCycle,
  amountUsd,
  paymentId,
  activatedAt,
  expiresAt,
}: SubscriptionReceiptParams) {
  const receiptNumber = `DST-${Date.now()}`;

  return {
    subject: `Dessetra Payment Receipt - ${planName}`,

    html: `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Dessetra Receipt</title>
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
PAYMENT RECEIPT
</h2>

<p style="
color:#555;
font-size:16px;
">
Hello <strong>${fullName}</strong>,
</p>

<p style="
color:#555;
font-size:15px;
line-height:1.7;
">
Thank you for subscribing to Dessetra Premium.
Your payment has been successfully received and your subscription is now active.
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
<td style="padding:8px 0;"><strong>Plan</strong></td>
<td>${planName}</td>
</tr>

<tr>
<td style="padding:8px 0;"><strong>Billing Cycle</strong></td>
<td>${billingCycle}</td>
</tr>

<tr>
<td style="padding:8px 0;"><strong>Amount Paid</strong></td>
<td>$${amountUsd.toFixed(2)} USD</td>
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
<td style="padding:8px 0;"><strong>Expires On</strong></td>
<td>${expiresAt}</td>
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
href="https://www.dessetra.com/dashboard"
style="
background:#D4AF37;
padding:14px 28px;
border-radius:8px;
text-decoration:none;
color:#071A3D;
font-weight:bold;
display:inline-block;
"
>

Go To Dashboard

</a>

</div>

<p style="
margin-top:40px;
color:#777;
font-size:13px;
text-align:center;
line-height:1.8;
">

Thank you for choosing Dessetra.<br>

Continue learning safely and confidently in Web3.

</p>

</div>

</div>

</body>

</html>
`,
  };
}