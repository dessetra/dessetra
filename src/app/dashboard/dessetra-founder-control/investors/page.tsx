"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import AdminGuard from "@/components/admin/AdminGuard";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { supabase } from "@/lib/supabase";

type InvestorUser = {
  id: string;
  full_name: string | null;
  email: string | null;
  country: string | null;
};

type Investor = {
  id: string;
  user_id: string;
  tier_amount_usd: number | string;
  target_return_usd: number | string;
  dsn_tokens: number | string;
  current_earnings_usd: number | string;
  available_withdrawal_usd: number | string;
  withdrawn_usd: number | string;
  status: string;
  payment_status: string | null;
  activated_at: string | null;
  completed_at: string | null;
  next_meeting_at: string | null;
  created_at: string;
  progress_percentage: string;
  user: InvestorUser | null;
};

export default function FounderInvestorsPage() {
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("active");
  const [searchTerm, setSearchTerm] = useState("");

  const [selectedInvestor, setSelectedInvestor] = useState<Investor | null>(
    null
  );
  const [earningsAmount, setEarningsAmount] = useState("");
  const [weekStart, setWeekStart] = useState("");
  const [weekEnd, setWeekEnd] = useState("");
  const [crediting, setCrediting] = useState(false);

  async function loadInvestors() {
    setLoading(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      setLoading(false);
      return;
    }

    const response = await fetch("/api/admin/investments", {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    const result = await response.json();

    if (!response.ok) {
      toast.error(result.error || "Unable to load investors.");
      setLoading(false);
      return;
    }

    setInvestors(result.investors || []);
    setLoading(false);
  }

  useEffect(() => {
    queueMicrotask(() => {
      void loadInvestors();
    });
  }, []);

  const filteredInvestors = useMemo(() => {
    return investors.filter((investor) => {
      const matchesStatus =
        statusFilter === "all" || investor.status === statusFilter;

      const searchable = `${investor.user?.full_name || ""} ${
        investor.user?.email || ""
      } ${investor.user?.country || ""}`.toLowerCase();

      return matchesStatus && searchable.includes(searchTerm.toLowerCase());
    });
  }, [investors, statusFilter, searchTerm]);

  const formatMoney = (value: number | string) => {
    return `$${Number(value || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatNumber = (value: number | string) => {
    return Number(value || 0).toLocaleString();
  };

  const formatDate = (value: string | null) => {
    if (!value) return "Not set";

    return new Date(value).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const openCreditModal = (investor: Investor) => {
    setSelectedInvestor(investor);
    setEarningsAmount("");
    setWeekStart("");
    setWeekEnd("");
  };

  const closeCreditModal = () => {
    setSelectedInvestor(null);
    setEarningsAmount("");
    setWeekStart("");
    setWeekEnd("");
  };

  const creditEarnings = async () => {
    if (!selectedInvestor) return;

    const amount = Number(earningsAmount);

    if (!amount || amount <= 0) {
      toast.error("Enter a valid earnings amount.");
      return;
    }

    setCrediting(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      toast.error("Please login again.");
      setCrediting(false);
      return;
    }

    const response = await fetch(
      "/api/admin/investments/credit-earnings",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          investmentId: selectedInvestor.id,
          amountUsd: amount,
          weekStart: weekStart || null,
          weekEnd: weekEnd || null,
        }),
      }
    );

    const result = await response.json();

    setCrediting(false);

    if (!response.ok) {
      toast.error(result.error || "Unable to credit earnings.");
      return;
    }

    toast.success("Investor earnings credited successfully.");
    closeCreditModal();
    await loadInvestors();
  };

  return (
    <AdminGuard>
      <DashboardLayout>
        <div className="rounded-3xl bg-gradient-to-r from-[#04122D] to-[#0D2A5E] p-6 text-white shadow-lg md:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#D4AF37]">
            Founder Control
          </p>

          <h1 className="mt-3 text-3xl font-bold md:text-4xl">
            Investor Management
          </h1>

          <p className="mt-3 max-w-3xl text-gray-300">
            Monitor founder investors, investment tiers, progress toward 200%,
            DSN allocations, earnings, withdrawal availability, and credit
            investor earnings.
          </p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          {["active", "pending_payment", "completed", "all"].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`rounded-xl px-4 py-3 font-semibold capitalize ${
                statusFilter === status
                  ? "bg-[#D4AF37] text-[#071A3D]"
                  : "bg-[#0D2A5E] text-white"
              }`}
            >
              {status.replace("_", " ")}
            </button>
          ))}
        </div>

        <div className="mt-6 rounded-2xl bg-white p-5 text-[#071A3D] shadow-lg">
          <input
            type="text"
            placeholder="Search by investor name, email, or country..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="w-full rounded-lg border border-gray-300 p-3 outline-none"
          />
        </div>

        <div className="mt-6 rounded-2xl bg-[#0D2A5E] p-6 text-white shadow-lg">
          <h2 className="text-2xl font-bold">Investors</h2>

          {loading ? (
            <div className="mt-6 rounded-xl bg-white p-6 text-[#071A3D]">
              Loading investors...
            </div>
          ) : filteredInvestors.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-gray-500 p-10 text-center text-gray-400">
              No investors found.
            </div>
          ) : (
            <div className="mt-6 space-y-5">
              {filteredInvestors.map((investor) => {
                const progress = Number(investor.progress_percentage || 0);

                return (
                  <div
                    key={investor.id}
                    className="rounded-2xl bg-white p-5 text-[#071A3D] shadow"
                  >
                    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                      <div>
                        <h3 className="text-xl font-bold">
                          {investor.user?.full_name || "Unknown Investor"}
                        </h3>

                        <p className="mt-1 text-sm text-gray-500">
                          {investor.user?.email || "No email"} •{" "}
                          {investor.user?.country || "Unknown country"}
                        </p>

                        <p className="mt-3 text-2xl font-bold">
                          {formatMoney(investor.tier_amount_usd)} Investment
                        </p>

                        <p className="mt-1 text-sm text-gray-500">
                          Activated: {formatDate(investor.activated_at)} •
                          Status:{" "}
                          <span className="capitalize">
                            {investor.status.replace("_", " ")}
                          </span>
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-4 py-2 text-sm font-bold capitalize ${
                          investor.status === "active"
                            ? "bg-green-100 text-green-700"
                            : investor.status === "completed"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {investor.status.replace("_", " ")}
                      </span>
                    </div>

                    <div className="mt-5">
                      <div className="flex items-center justify-between text-sm font-semibold">
                        <span>Progress Toward 200%</span>
                        <span>{progress.toFixed(1)}%</span>
                      </div>

                      <div className="mt-2 h-4 overflow-hidden rounded-full bg-gray-200">
                        <div
                          className="h-full rounded-full bg-[#D4AF37]"
                          style={{
                            width: `${Math.min(progress, 100)}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="mt-5 grid gap-4 md:grid-cols-4">
                      <div className="rounded-xl bg-gray-100 p-4">
                        <p className="text-sm text-gray-500">Target</p>
                        <p className="mt-1 font-bold">
                          {formatMoney(investor.target_return_usd)}
                        </p>
                      </div>

                      <div className="rounded-xl bg-gray-100 p-4">
                        <p className="text-sm text-gray-500">Earnings</p>
                        <p className="mt-1 font-bold">
                          {formatMoney(investor.current_earnings_usd)}
                        </p>
                      </div>

                      <div className="rounded-xl bg-gray-100 p-4">
                        <p className="text-sm text-gray-500">Available</p>
                        <p className="mt-1 font-bold text-green-600">
                          {formatMoney(investor.available_withdrawal_usd)}
                        </p>
                      </div>

                      <div className="rounded-xl bg-gray-100 p-4">
                        <p className="text-sm text-gray-500">Pending DSN</p>
                        <p className="mt-1 font-bold">
                          {formatNumber(investor.dsn_tokens)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-4 md:grid-cols-3">
                      <div className="rounded-xl bg-gray-100 p-4">
                        <p className="text-sm text-gray-500">Withdrawn</p>
                        <p className="mt-1 font-bold">
                          {formatMoney(investor.withdrawn_usd)}
                        </p>
                      </div>

                      <div className="rounded-xl bg-gray-100 p-4">
                        <p className="text-sm text-gray-500">Next Meeting</p>
                        <p className="mt-1 font-bold">
                          {formatDate(investor.next_meeting_at)}
                        </p>
                      </div>

                      <div className="rounded-xl bg-gray-100 p-4">
                        <p className="text-sm text-gray-500">Completed</p>
                        <p className="mt-1 font-bold">
                          {formatDate(investor.completed_at)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5">
                      <button
                        onClick={() => openCreditModal(investor)}
                        disabled={investor.status !== "active"}
                        className="w-full rounded-lg bg-[#D4AF37] py-3 font-semibold text-[#071A3D] disabled:opacity-50"
                      >
                        {investor.status === "active"
                          ? "Credit Earnings"
                          : "Earnings Credit Disabled"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {selectedInvestor && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="w-full max-w-xl rounded-2xl bg-white p-6 text-[#071A3D] shadow-2xl">
              <h2 className="text-2xl font-bold">Credit Investor Earnings</h2>

              <p className="mt-2 text-sm text-gray-600">
                Investor:{" "}
                <strong>
                  {selectedInvestor.user?.full_name || "Unknown Investor"}
                </strong>
              </p>

              <p className="mt-1 text-sm text-gray-600">
                Investment:{" "}
                <strong>
                  {formatMoney(selectedInvestor.tier_amount_usd)}
                </strong>
              </p>

              <div className="mt-5">
                <label className="text-sm font-semibold text-gray-600">
                  Earnings Amount (USD)
                </label>

                <input
                  type="number"
                  value={earningsAmount}
                  onChange={(event) => setEarningsAmount(event.target.value)}
                  placeholder="Enter amount, e.g. 50"
                  className="mt-2 w-full rounded-lg border border-gray-300 p-3 outline-none"
                />
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-semibold text-gray-600">
                    Week Start
                  </label>

                  <input
                    type="date"
                    value={weekStart}
                    onChange={(event) => setWeekStart(event.target.value)}
                    className="mt-2 w-full rounded-lg border border-gray-300 p-3 outline-none"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-600">
                    Week End
                  </label>

                  <input
                    type="date"
                    value={weekEnd}
                    onChange={(event) => setWeekEnd(event.target.value)}
                    className="mt-2 w-full rounded-lg border border-gray-300 p-3 outline-none"
                  />
                </div>
              </div>

              <div className="mt-5 rounded-xl bg-yellow-50 p-4 text-sm text-yellow-800">
                This will increase the investor&apos;s current earnings and
                available withdrawal balance immediately.
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={closeCreditModal}
                  disabled={crediting}
                  className="flex-1 rounded-lg border border-gray-300 py-3 font-semibold disabled:opacity-60"
                >
                  Cancel
                </button>

                <button
                  onClick={creditEarnings}
                  disabled={crediting}
                  className="flex-1 rounded-lg bg-[#D4AF37] py-3 font-semibold text-[#071A3D] disabled:opacity-60"
                >
                  {crediting ? "Crediting..." : "Credit Earnings"}
                </button>
              </div>
            </div>
          </div>
        )}
      </DashboardLayout>
    </AdminGuard>
  );
}