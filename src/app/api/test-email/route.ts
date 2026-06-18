import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";

export async function GET() {
  try {
    await sendEmail({
      to: "info@dessetra.com",
      subject: "Dessetra SMTP Test",
      html: `
        <h2>Dessetra Email Test</h2>
        <p>This is a test email from the Dessetra platform.</p>
        <p>If you received this, SMTP is working correctly.</p>
      `,
    });

    return NextResponse.json({
      success: true,
      message: "Test email sent successfully.",
    });
  } catch (error) {
    console.log("Test email error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Test email failed.",
      },
      { status: 500 }
    );
  }
}