"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import toast from "react-hot-toast";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { supabase } from "@/lib/supabase";

type Subscription = {
  id: string;
  plan_name: string;
  billing_cycle: string;
  amount_usd: number;
  status: string;
  payment_status: string | null;
  pay_currency: string | null;
  pay_address: string | null;
  pay_amount: number | null;
  payment_expires_at: string | null;
};

const cryptoOptions = [
  { label: "USDT BEP20", value: "usdtbsc" },
  { label: "USDT TRC20", value: "usdttrc20" },
  { label: "BNB", value: "bnbbsc" },
  { label: "ETH", value: "eth" },
  { label: "BTC", value: "btc" },
];

export default function SubscriptionCheckoutPage() {
  const params = useParams();
  const subscriptionId = params.subscriptionId as string;

  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState("usdtbsc");
  const [loading, setLoading] = useState(true);
  const [creatingPayment, setCreatingPayment] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    async function loadSubscription() {
      const { data, error } = await supabase
        .from("subscriptions")
        .select(
          "id, plan_name, billing_cycle, amount_usd, status, payment_status, pay_currency, pay_address, pay_amount, payment_expires_at"
        )
        .eq("id", subscriptionId)
        .maybeSingle();

      if (error || !data) {
        toast.error("Subscription request not found.");
        setLoading(false);
        return;
      }

      setSubscription(data as Subscription);

      if (data.pay_currency) {
        setSelectedCurrency(data.pay_currency);
      }

      setLoading(false);
    }

    if (subscriptionId) {
      loadSubscription();
    }
  }, [subscriptionId]);

  useEffect(() => {
    if (!subscription?.payment_expires_at) return;

    function updateTimer() {
      const expiry = new Date(subscription?.payment_expires_at || "").getTime();
      const now = Date.now();
      const remaining = Math.max(Math.floor((expiry - now) / 1000), 0);
      setSecondsLeft(remaining);
    }

    updateTimer();

    const timer = setInterval(updateTimer, 1000);

    return () => clearInterval(timer);
  }, [subscription?.payment_expires_at]);

  const countdown = useMemo(() => {
    const minutes = Math.floor(secondsLeft / 60);
    const seconds = secondsLeft % 60;

    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
      2,
      "0"
    )}`;
  }, [secondsLeft]);

  const createPayment = async () => {
    if (!subscription) return;

    setCreatingPayment(true);

    const response = await fetch("/api/nowpayments/create-payment", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        subscriptionId: subscription.id,
        payCurrency: selectedCurrency,
      }),
    });

    const result = await response.json();

    setCreatingPayment(false);

    if (!response.ok) {
      toast.error(result.error || "Unable to create payment.");
      return;
    }

    setSubscription(result.subscription);
    toast.success("Payment address generated.");
  };

  const paymentQrData = subscription?.pay_address
    ? `${subscription.pay_address}`
    : "";

  const paymentQrUrl = paymentQrData
    ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
        paymentQrData
      )}`
    : "";

  if (loading) {
    return (
      <DashboardLayout>
        <div className="rounded-2xl bg-[#0D2A5E] p-6 text-white">
          Loading checkout...
        </div>
      </DashboardLayout>
    );
  }

  if (!subscription) {
    return (
      <DashboardLayout>
        <div className="rounded-2xl bg-white p-6 text-[#071A3D]">
          Subscription request not found.
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="rounded-2xl bg-[#0D2A5E] p-5 shadow-lg md:p-6">
        <h1 className="text-2xl font-bold md:text-3xl">
          Complete Subscription Payment
        </h1>

        <p className="mt-2 text-sm text-gray-300 md:text-base">
          Select your preferred cryptocurrency and complete payment within 45
          minutes.
        </p>
      </div>

      <div className="mt-6 rounded-2xl bg-white p-6 text-[#071A3D] shadow-lg">
        <h2 className="text-2xl font-bold">{subscription.plan_name}</h2>

        <p className="mt-2 text-gray-600">
          Amount: ${Number(subscription.amount_usd)} • Billing:{" "}
          {subscription.billing_cycle === "six_months"
            ? "6 Months"
            : "Monthly"}
        </p>

        <div className="mt-6">
          <label className="text-sm font-semibold text-gray-600">
            Select payment cryptocurrency
          </label>

          <select
            value={selectedCurrency}
            onChange={(event) => setSelectedCurrency(event.target.value)}
            disabled={Boolean(subscription.pay_address)}
            className="mt-2 w-full rounded-lg border border-gray-300 p-3 outline-none"
          >
            {cryptoOptions.map((crypto) => (
              <option key={crypto.value} value={crypto.value}>
                {crypto.label}
              </option>
            ))}
          </select>
        </div>

        {!subscription.pay_address && (
          <button
            onClick={createPayment}
            disabled={creatingPayment}
            className="mt-6 w-full rounded-lg bg-[#D4AF37] py-3 font-semibold text-[#071A3D] disabled:opacity-60"
          >
            {creatingPayment ? "Generating Payment..." : "Pay"}
          </button>
        )}

        {subscription.pay_address && (
          <div className="mt-6 rounded-2xl bg-gray-100 p-5">
            <h3 className="text-xl font-bold">Payment Details</h3>

            <p className="mt-3 text-sm text-gray-600">Send exactly:</p>

            <p className="mt-1 break-all text-2xl font-bold">
              {subscription.pay_amount}{" "}
              {subscription.pay_currency?.toUpperCase()}
            </p>

            {paymentQrUrl && (
              <div className="mt-6 flex justify-center">
                <div className="rounded-2xl bg-white p-4 shadow">
                  <img
                    src={paymentQrUrl}
                    alt="Payment QR Code"
                    className="h-60 w-60"
                  />
                </div>
              </div>
            )}

            <p className="mt-5 text-sm text-gray-600">Wallet Address:</p>

            <p className="mt-1 break-all rounded-lg bg-white p-3 font-mono text-sm">
              {subscription.pay_address}
            </p>

            <div className="mt-5 rounded-xl bg-[#071A3D] p-4 text-white">
              <p className="text-sm text-gray-300">Time left to pay</p>
              <p className="mt-1 text-3xl font-bold text-[#D4AF37]">
                {countdown}
              </p>
            </div>

            <div className="mt-5 rounded-xl bg-yellow-50 p-4 text-sm text-yellow-800">
              After payment, your subscription will activate automatically once
              NOWPayments confirms the transaction.
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}