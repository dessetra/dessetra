"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import AdminGuard from "@/components/admin/AdminGuard";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { supabase } from "@/lib/supabase";

type WithdrawalUser = {
  id: string;
  full_name: string | null;
  email: string | null;
  country: string | null;
};

type WithdrawalRequest = {
  id: string;
  user_id: string;
  amount: number | string;
  currency: string | null;
  network: string | null;
  wallet_address: string;
  status: string;
  admin_note: string | null;
  requested_at: string | null;
  processed_at: string | null;
  wallet_transaction_id: string | null;
  admin_id: string | null;
  tx_hash: string | null;
  user: WithdrawalUser | null;
};

export default function FounderWithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  const [txHashes, setTxHashes] = useState<Record<string, string>>({});

  async function loadWithdrawals() {
    setLoading(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      setLoading(false);
      return;
    }

    const response = await fetch("/api/admin/withdrawals", {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    const result = await response.json();

    if (!response.ok) {
      toast.error(result.error || "Unable to load withdrawals.");
      setLoading(false);
      return;
    }

    setWithdrawals(result.withdrawals || []);
    setLoading(false);
  }

  useEffect(() => {
    queueMicrotask(() => {
      void loadWithdrawals();
    });
  }, []);

  const filteredWithdrawals = useMemo(() => {
    return withdrawals.filter((withdrawal) => {
      const matchesStatus =
        statusFilter === "all" || withdrawal.status === statusFilter;

      const searchable = `${withdrawal.user?.full_name || ""} ${
        withdrawal.user?.email || ""
      } ${withdrawal.user_id || ""} ${withdrawal.wallet_address || ""}`.toLowerCase();

      const matchesSearch = searchable.includes(searchTerm.toLowerCase());

      return matchesStatus && matchesSearch;
    });
  }, [withdrawals, statusFilter, searchTerm]);

  const formatMoney = (value: number | string) => {
    return `$${Number(value || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDate = (value: string | null) => {
    if (!value) return "Not processed";

    return new Date(value).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const copyText = async (text: string, successMessage: string) => {
    if (!text) {
      toast.error("Nothing to copy.");
      return;
    }

    await navigator.clipboard.writeText(text);
    toast.success(successMessage);
  };

  const updateWithdrawal = async (
    withdrawal: WithdrawalRequest,
    status: "approved" | "rejected"
  ) => {
    const adminNote = adminNotes[withdrawal.id] || "";
    const txHash = txHashes[withdrawal.id] || "";

    if (status === "approved" && !txHash.trim()) {
      toast.error("Please enter the blockchain transaction hash before approval.");
      return;
    }

    const confirmationMessage =
      status === "approved"
        ? `Confirm approval?\n\nMake sure you have already sent ${formatMoney(
            withdrawal.amount
          )} ${withdrawal.currency || "USDT_BEP20"} to:\n\n${
            withdrawal.wallet_address
          }\n\nTX Hash:\n${txHash}`
        : `Confirm rejection?\n\nThis will reject ${formatMoney(
            withdrawal.amount
          )} withdrawal request for ${
            withdrawal.user?.full_name || "this user"
          }.`;

    const confirmed = window.confirm(confirmationMessage);

    if (!confirmed) return;

    setProcessingId(withdrawal.id);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      toast.error("Please login again.");
      setProcessingId(null);
      return;
    }

    const response = await fetch("/api/admin/withdrawals/update", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        withdrawalId: withdrawal.id,
        status,
        adminNote,
        txHash,
      }),
    });

    const result = await response.json();

    setProcessingId(null);

    if (!response.ok) {
      toast.error(result.error || "Unable to update withdrawal.");
      return;
    }

    toast.success(
      status === "approved"
        ? "Withdrawal approved successfully."
        : "Withdrawal rejected successfully."
    );

    await loadWithdrawals();
  };

  return (
    <AdminGuard>
      <DashboardLayout>
        <div className="rounded-3xl bg-gradient-to-r from-[#04122D] to-[#0D2A5E] p-6 text-white shadow-lg md:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#D4AF37]">
            Founder Control
          </p>

          <h1 className="mt-3 text-3xl font-bold md:text-4xl">
            Withdrawal Management
          </h1>

          <p className="mt-3 max-w-3xl text-gray-300">
            Review, approve, or reject user withdrawal requests. Approved
            withdrawals require the USDT BEP20 transaction hash for audit
            history.
          </p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          {["pending", "approved", "rejected", "all"].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`rounded-xl px-4 py-3 font-semibold capitalize ${
                statusFilter === status
                  ? "bg-[#D4AF37] text-[#071A3D]"
                  : "bg-[#0D2A5E] text-white"
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        <div className="mt-6 rounded-2xl bg-white p-5 text-[#071A3D] shadow-lg">
          <input
            type="text"
            placeholder="Search by name, email, user ID, or wallet address..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="w-full rounded-lg border border-gray-300 p-3 outline-none"
          />
        </div>

        <div className="mt-6 rounded-2xl bg-[#0D2A5E] p-6 text-white shadow-lg">
          <h2 className="text-2xl font-bold">Withdrawal Requests</h2>

          {loading ? (
            <div className="mt-6 rounded-xl bg-white p-6 text-[#071A3D]">
              Loading withdrawals...
            </div>
          ) : filteredWithdrawals.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-gray-500 p-10 text-center text-gray-400">
              No withdrawal requests found.
            </div>
          ) : (
            <div className="mt-6 space-y-5">
              {filteredWithdrawals.map((withdrawal) => (
                <div
                  key={withdrawal.id}
                  className="rounded-2xl bg-white p-5 text-[#071A3D] shadow"
                >
                  <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                    <div>
                      <h3 className="text-xl font-bold">
                        {withdrawal.user?.full_name || "Unknown User"}
                      </h3>

                      <p className="mt-1 text-sm text-gray-500">
                        {withdrawal.user?.email || "No email"} •{" "}
                        {withdrawal.user?.country || "Unknown country"}
                      </p>

                      <p className="mt-2 break-all text-xs text-gray-500">
                        <strong>User ID:</strong> {withdrawal.user_id}
                      </p>

                      <p className="mt-3 text-2xl font-bold text-[#071A3D]">
                        {formatMoney(withdrawal.amount)}{" "}
                        {withdrawal.currency || "USDT_BEP20"}
                      </p>

                      <p className="mt-1 text-sm text-gray-500">
                        Network: {withdrawal.network || "BEP20"} • Requested:{" "}
                        {formatDate(withdrawal.requested_at)}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-4 py-2 text-sm font-bold capitalize ${
                        withdrawal.status === "pending"
                          ? "bg-yellow-100 text-yellow-700"
                          : withdrawal.status === "approved"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {withdrawal.status}
                    </span>
                  </div>

                  <div className="mt-5">
                    <p className="text-sm font-semibold text-gray-500">
                      Destination Wallet
                    </p>

                    <div className="mt-2 rounded-lg bg-gray-100 p-3">
                      <p className="break-all font-mono text-sm">
                        {withdrawal.wallet_address}
                      </p>

                      <button
                        type="button"
                        onClick={() =>
                          copyText(
                            withdrawal.wallet_address,
                            "Wallet address copied."
                          )
                        }
                        className="mt-3 rounded-lg bg-[#0D2A5E] px-4 py-2 text-sm font-semibold text-white"
                      >
                        Copy Wallet Address
                      </button>
                    </div>
                  </div>

                  {withdrawal.status === "pending" ? (
                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="text-sm font-semibold text-gray-600">
                          Blockchain TX Hash
                        </label>

                        <input
                          type="text"
                          placeholder="Paste USDT BEP20 transaction hash"
                          value={txHashes[withdrawal.id] || ""}
                          onChange={(event) =>
                            setTxHashes({
                              ...txHashes,
                              [withdrawal.id]: event.target.value,
                            })
                          }
                          className="mt-2 w-full rounded-lg border border-gray-300 p-3 outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-sm font-semibold text-gray-600">
                          Admin Note
                        </label>

                        <input
                          type="text"
                          placeholder="Optional note"
                          value={adminNotes[withdrawal.id] || ""}
                          onChange={(event) =>
                            setAdminNotes({
                              ...adminNotes,
                              [withdrawal.id]: event.target.value,
                            })
                          }
                          className="mt-2 w-full rounded-lg border border-gray-300 p-3 outline-none"
                        />
                      </div>

                      <div className="flex gap-3 md:col-span-2">
                        <button
                          onClick={() => updateWithdrawal(withdrawal, "approved")}
                          disabled={processingId === withdrawal.id}
                          className="flex-1 rounded-lg bg-green-600 py-3 font-semibold text-white disabled:opacity-60"
                        >
                          {processingId === withdrawal.id
                            ? "Processing..."
                            : "Approve"}
                        </button>

                        <button
                          onClick={() => updateWithdrawal(withdrawal, "rejected")}
                          disabled={processingId === withdrawal.id}
                          className="flex-1 rounded-lg bg-red-600 py-3 font-semibold text-white disabled:opacity-60"
                        >
                          {processingId === withdrawal.id
                            ? "Processing..."
                            : "Reject"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-5 rounded-xl bg-gray-100 p-4 text-sm">
                      <p>
                        <strong>Processed:</strong>{" "}
                        {formatDate(withdrawal.processed_at)}
                      </p>

                      {withdrawal.tx_hash && (
                        <div className="mt-2">
                          <p className="break-all">
                            <strong>TX Hash:</strong> {withdrawal.tx_hash}
                          </p>

                          <button
                            type="button"
                            onClick={() =>
                              copyText(withdrawal.tx_hash || "", "TX hash copied.")
                            }
                            className="mt-3 rounded-lg bg-[#0D2A5E] px-4 py-2 text-sm font-semibold text-white"
                          >
                            Copy TX Hash
                          </button>
                        </div>
                      )}

                      {withdrawal.admin_note && (
                        <p className="mt-2">
                          <strong>Admin Note:</strong>{" "}
                          {withdrawal.admin_note}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </DashboardLayout>
    </AdminGuard>
  );
}