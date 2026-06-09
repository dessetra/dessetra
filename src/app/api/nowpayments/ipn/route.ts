import crypto from "crypto";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();

    const receivedSignature =
      request.headers.get("x-nowpayments-sig") || "";

    const ipnSecret = process.env.NOWPAYMENTS_IPN_SECRET || "";

    const calculatedSignature = crypto
      .createHmac("sha512", ipnSecret)
      .update(rawBody)
      .digest("hex");

    if (receivedSignature !== calculatedSignature) {
      return NextResponse.json(
        { error: "Invalid IPN Signature" },
        { status: 401 }
      );
    }

    const body = JSON.parse(rawBody);

    const paymentId = String(body.payment_id);
    const paymentStatus = String(body.payment_status);
    const orderId = String(body.order_id);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("id", orderId)
      .maybeSingle();

    if (!subscription) {
      return NextResponse.json(
        { error: "Subscription not found." },
        { status: 404 }
      );
    }

    if (paymentStatus === "finished") {
      const startDate = new Date();

      const expiryDate = new Date(startDate);

      if (subscription.billing_cycle === "monthly") {
        expiryDate.setMonth(expiryDate.getMonth() + 1);
      } else {
        expiryDate.setMonth(expiryDate.getMonth() + 6);
      }

      await supabase
        .from("subscriptions")
        .update({
          nowpayments_payment_id: paymentId,
          payment_status: paymentStatus,
          status: "active",
          started_at: startDate.toISOString(),
          expires_at: expiryDate.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);
    }

    if (
      paymentStatus === "failed" ||
      paymentStatus === "expired"
    ) {
      await supabase
        .from("subscriptions")
        .update({
          payment_status: paymentStatus,
          status: "cancelled",
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);
    }

    return NextResponse.json({
      success: true,
    });
  } catch {
    return NextResponse.json(
      {
        error: "Webhook processing failed.",
      },
      {
        status: 500,
      }
    );
  }
}