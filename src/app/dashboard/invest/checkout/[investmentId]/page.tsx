"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { supabase } from "@/lib/supabase";

type Investment = {
  id: string;
  tier_amount_usd: number;
  target_return_usd: number;
  dsn_tokens: number;
  status: string;
  payment_status: string | null;
  pay_currency: string | null;
  pay_address: string | null;
  pay_amount: number | null;
  payment_url: string | null;
  payment_expires_at: string | null;
};

const cryptoOptions = [
  { label: "USDT BEP20", value: "usdtbsc" },
  { label: "USDT TRC20", value: "usdttrc20" },
];

export default function InvestmentCheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const investmentId = params.investmentId as string;

  const [investment, setInvestment] = useState<Investment | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState("usdtbsc");
  const [loading, setLoading] = useState(true);
  const [creatingPayment, setCreatingPayment] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [redirecting, setRedirecting] = useState(false);

  async function loadInvestment() {
    const { data, error } = await supabase
      .from("investments")
      .select(
        "id, tier_amount_usd, target_return_usd, dsn_tokens, status, payment_status, pay_currency, pay_address, pay_amount, payment_url, payment_expires_at"
      )
      .eq("id", investmentId)
      .maybeSingle();

    if (error || !data) {
      toast.error("Investment request not found.");
      setLoading(false);
      return;
    }

    setInvestment(data as Investment);

    if (data.pay_currency) {
      setSelectedCurrency(data.pay_currency);
    }

    setLoading(false);
  }

  useEffect(() => {
    if (!investmentId) return;

    queueMicrotask(() => {
      void loadInvestment();
    });
  }, [investmentId]);

  useEffect(() => {
    if (!investment?.payment_expires_at) return;

    function updateTimer() {
      const expiry = new Date(investment?.payment_expires_at || "").getTime();
      const now = Date.now();
      const remaining = Math.max(Math.floor((expiry - now) / 1000), 0);

      setSecondsLeft(remaining);
    }

    updateTimer();

    const timer = setInterval(updateTimer, 1000);

    return () => clearInterval(timer);
  }, [investment?.payment_expires_at]);

  useEffect(() => {
    if (!investment?.id || !investment.pay_address) return;

    const pollPaymentStatus = async () => {
      const { data } = await supabase
        .from("investments")
        .select(
          "id, tier_amount_usd, target_return_usd, dsn_tokens, status, payment_status, pay_currency, pay_address, pay_amount, payment_url, payment_expires_at"
        )
        .eq("id", investment.id)
        .maybeSingle();

      if (!data) return;

      const updatedInvestment = data as Investment;
      setInvestment(updatedInvestment);

      if (updatedInvestment.status === "active" && !redirecting) {
        setRedirecting(true);
        toast.success("Investment payment confirmed.");

        setTimeout(() => {
          router.push("/dashboard/investor");
        }, 3000);
      }
    };

    const poller = setInterval(pollPaymentStatus, 7000);

    return () => clearInterval(poller);
  }, [investment?.id, investment?.pay_address, redirecting, router]);

  const countdown = useMemo(() => {
    const minutes = Math.floor(secondsLeft / 60);
    const seconds = secondsLeft % 60;

    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
      2,
      "0"
    )}`;
  }, [secondsLeft]);

  const paymentExpired =
    Boolean(investment?.pay_address) &&
    Boolean(investment?.payment_expires_at) &&
    secondsLeft === 0 &&
    investment?.status !== "active";

  const paymentQrData = investment?.pay_address ? investment.pay_address : "";

  const paymentQrUrl = paymentQrData
    ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
        paymentQrData
      )}`
    : "";

  const copyAddress = async () => {
    if (!investment?.pay_address) return;

    await navigator.clipboard.writeText(investment.pay_address);
    toast.success("Wallet address copied.");
  };

  const createPayment = async () => {
    if (!investment) return;

    setCreatingPayment(true);

    const response = await fetch("/api/nowpayments/create-investment-payment", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        investmentId: investment.id,
        payCurrency: selectedCurrency,
      }),
    });

    const result = await response.json();

    setCreatingPayment(false);

    if (!response.ok) {
      toast.error(result.error || "Unable to create investment payment.");
      return;
    }

    setInvestment(result.investment);
    toast.success("Investment payment address generated.");
  };

  const formatPaymentStatus = (status: string | null) => {
    if (!status) return "Waiting Payment";

    return status.replaceAll("_", " ");
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="rounded-2xl bg-[#0D2A5E] p-6 text-white">
          Loading investment checkout...
        </div>
      </DashboardLayout>
    );
  }

  if (!investment) {
    return (
      <DashboardLayout>
        <div className="rounded-2xl bg-white p-6 text-[#071A3D]">
          Investment request not found.
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="rounded-3xl bg-gradient-to-r from-[#04122D] to-[#0D2A5E] p-6 text-white shadow-lg md:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#D4AF37]">
          Founder Investment Checkout
        </p>

        <h1 className="mt-3 text-3xl font-bold md:text-4xl">
          Complete Investment Payment
        </h1>

        <p className="mt-3 max-w-3xl text-gray-300">
          Complete your investment payment using USDT BEP20 or USDT TRC20.
          Payment confirmation will activate your investor dashboard.
        </p>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl bg-white p-6 text-[#071A3D] shadow-lg">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">
            Investment Amount
          </p>

          <h2 className="mt-3 text-4xl font-bold">
            ${Number(investment.tier_amount_usd).toLocaleString()}
          </h2>
        </div>

        <div className="rounded-2xl bg-[#D4AF37] p-6 text-[#071A3D] shadow-lg">
          <p className="text-sm font-semibold uppercase tracking-[0.2em]">
            Revenue Target
          </p>

          <h2 className="mt-3 text-4xl font-bold">
            ${Number(investment.target_return_usd).toLocaleString()}
          </h2>
        </div>

        <div className="rounded-2xl bg-[#071A3D] p-6 text-white shadow-lg">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-300">
            Pending DSN Tokens
          </p>

          <h2 className="mt-3 text-4xl font-bold text-[#D4AF37]">
            {Number(investment.dsn_tokens).toLocaleString()}
          </h2>
        </div>
      </div>

      <div className="mt-6 rounded-2xl bg-white p-6 text-[#071A3D] shadow-lg">
        <h2 className="text-2xl font-bold">Payment Method</h2>

        <p className="mt-2 text-sm text-gray-500">
          Choose your preferred USDT network. Only send the exact amount shown
          after the payment address is generated.
        </p>

        <div className="mt-6">
          <label className="text-sm font-semibold text-gray-600">
            Select payment cryptocurrency
          </label>

          <select
            value={selectedCurrency}
            onChange={(event) => setSelectedCurrency(event.target.value)}
            disabled={Boolean(investment.pay_address)}
            className="mt-2 w-full rounded-lg border border-gray-300 p-3 outline-none"
          >
            {cryptoOptions.map((crypto) => (
              <option key={crypto.value} value={crypto.value}>
                {crypto.label}
              </option>
            ))}
          </select>
        </div>

        {!investment.pay_address && (
          <button
            onClick={createPayment}
            disabled={creatingPayment}
            className="mt-6 w-full rounded-lg bg-[#D4AF37] py-3 font-semibold text-[#071A3D] disabled:opacity-60"
          >
            {creatingPayment ? "Generating Payment..." : "Pay"}
          </button>
        )}

        {investment.pay_address && (
          <div className="mt-6 rounded-2xl bg-gray-100 p-5">
            <h3 className="text-xl font-bold">Payment Details</h3>

            <div className="mt-4 rounded-xl bg-white p-4">
              <p className="text-sm font-semibold text-gray-500">Status</p>

              <p className="mt-1 text-lg font-bold capitalize">
                {investment.status === "active"
                  ? "Payment Completed"
                  : formatPaymentStatus(investment.payment_status)}
              </p>
            </div>

            <p className="mt-5 text-sm text-gray-600">Send exactly:</p>

            <p className="mt-1 break-all text-2xl font-bold">
              {investment.pay_amount} {investment.pay_currency?.toUpperCase()}
            </p>

            {paymentQrUrl && (
              <div className="mt-6 flex justify-center">
                <div className="rounded-2xl bg-white p-4 shadow">
                  <img
                    src={paymentQrUrl}
                    alt="Investment Payment QR Code"
                    className="h-60 w-60"
                  />
                </div>
              </div>
            )}

            <p className="mt-5 text-sm text-gray-600">Wallet Address:</p>

            <p className="mt-1 break-all rounded-lg bg-white p-3 font-mono text-sm">
              {investment.pay_address}
            </p>

            <button
              onClick={copyAddress}
              className="mt-3 rounded-lg bg-[#071A3D] px-4 py-2 text-sm font-semibold text-white"
            >
              Copy Address
            </button>

            <div className="mt-5 rounded-xl bg-[#071A3D] p-4 text-white">
              <p className="text-sm text-gray-300">Time left to pay</p>

              <p className="mt-1 text-3xl font-bold text-[#D4AF37]">
                {investment.status === "active" ? "Completed" : countdown}
              </p>
            </div>

            {paymentExpired && (
              <div className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-800">
                This payment window has expired. Please return to the investment
                page and start a new investment payment request.
              </div>
            )}

            {investment.status === "active" && (
              <div className="mt-5 rounded-xl bg-green-50 p-4 text-sm text-green-800">
                Payment confirmed. Your investor dashboard is now active.
                Redirecting...
              </div>
            )}

            {investment.status !== "active" && !paymentExpired && (
              <div className="mt-5 rounded-xl bg-yellow-50 p-4 text-sm text-yellow-800">
                After payment, your investment dashboard will activate
                automatically once NOWPayments confirms the transaction.
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}