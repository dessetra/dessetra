"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { supabase } from "@/lib/supabase";

type WalletTransaction = {
  id: string;
  transaction_type: string;
  amount_usd: number | string;
  currency: string;
  direction: string;
  status: string;
  description: string | null;
  created_at: string;
};

type WithdrawalRequest = {
  id: string;
  amount: number | string;
  currency: string | null;
  network: string | null;
  wallet_address: string;
  status: string;
  admin_note: string | null;
  tx_hash: string | null;
  requested_at: string | null;
  processed_at: string | null;
};

const MINIMUM_WITHDRAWAL = 20;

export default function WalletPage() {
  const [walletAddress, setWalletAddress] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingWallet, setSavingWallet] = useState(false);
  const [requestingWithdrawal, setRequestingWithdrawal] = useState(false);

  const availableBalance = useMemo(() => {
    return transactions.reduce((sum, transaction) => {
      const amountUsd = Number(transaction.amount_usd || 0);

      if (
        transaction.direction === "credit" &&
        transaction.status === "completed"
      ) {
        return sum + amountUsd;
      }

      if (
        transaction.direction === "debit" &&
        (transaction.status === "pending" ||
          transaction.status === "completed")
      ) {
        return sum - amountUsd;
      }

      return sum;
    }, 0);
  }, [transactions]);

  const canWithdraw = availableBalance >= MINIMUM_WITHDRAWAL;

  async function loadWalletData() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("wallet_address")
      .eq("id", user.id)
      .single();

    if (profileError) {
      toast.error(profileError.message);
      setLoading(false);
      return;
    }

    setWalletAddress(profileData?.wallet_address || "");

    const { data: transactionData, error: transactionError } = await supabase
      .from("wallet_transactions")
      .select(
        "id, transaction_type, amount_usd, currency, direction, status, description, created_at"
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (transactionError) {
      toast.error(transactionError.message);
    } else {
      setTransactions((transactionData || []) as WalletTransaction[]);
    }

    const { data: withdrawalData, error: withdrawalError } = await supabase
      .from("withdrawal_requests")
      .select(
        "id, amount, currency, network, wallet_address, status, admin_note, tx_hash, requested_at, processed_at"
      )
      .eq("user_id", user.id)
      .order("requested_at", { ascending: false });

    if (withdrawalError) {
      toast.error(withdrawalError.message);
    } else {
      setWithdrawals((withdrawalData || []) as WithdrawalRequest[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    queueMicrotask(() => {
    void loadWalletData();
    });
  }, []);

  const saveWalletAddress = async () => {
    if (!walletAddress.trim()) {
      toast.error("Please enter your USDT BEP20 wallet address.");
      return;
    }

    setSavingWallet(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("Please login again.");
      setSavingWallet(false);
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        wallet_address: walletAddress.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    setSavingWallet(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("USDT BEP20 wallet address saved successfully.");
  };

  const requestWithdrawal = async () => {
    const amount = Number(withdrawAmount);

    if (!walletAddress.trim()) {
      toast.error("Please save your USDT BEP20 wallet address first.");
      return;
    }

    if (!amount || amount <= 0) {
      toast.error("Please enter a valid withdrawal amount.");
      return;
    }

    if (amount < MINIMUM_WITHDRAWAL) {
      toast.error("Minimum withdrawal amount is $20.");
      return;
    }

    if (amount > availableBalance) {
      toast.error("Insufficient wallet balance.");
      return;
    }

    setRequestingWithdrawal(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      toast.error("Please login again.");
      setRequestingWithdrawal(false);
      return;
    }

    const response = await fetch("/api/withdrawals/request", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        amount,
        walletAddress: walletAddress.trim(),
      }),
    });

    const result = await response.json();

    setRequestingWithdrawal(false);

    if (!response.ok) {
      toast.error(result.error || "Unable to request withdrawal.");
      return;
    }

    setWithdrawAmount("");
    toast.success("Withdrawal request submitted successfully.");
    await loadWalletData();
  };

  const formatDate = (dateValue: string | null) => {
    if (!dateValue) return "Pending";

    return new Date(dateValue).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatMoney = (value: number | string) => {
    return `$${Number(value || 0).toFixed(2)}`;
  };

  return (
    <DashboardLayout>
      <div className="rounded-2xl bg-[#0D2A5E] p-5 shadow-lg md:p-6">
        <h1 className="text-2xl font-bold md:text-3xl">Wallet</h1>
        <p className="mt-2 text-sm text-gray-300 md:text-base">
          Manage your USDT BEP20 wallet address, referral earnings, investment
          earnings, and withdrawal requests.
        </p>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl bg-white p-6 text-[#071A3D] shadow-lg">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">
            Available Balance
          </p>

          <h2 className="mt-3 text-4xl font-bold">
            {loading ? "Loading..." : formatMoney(availableBalance)}
          </h2>

          <p className="mt-3 text-sm text-gray-500">
            Only completed earnings minus pending/completed withdrawals are
            available.
          </p>
        </div>

        <div className="rounded-2xl bg-[#D4AF37] p-6 text-[#071A3D] shadow-lg">
          <p className="text-sm font-semibold uppercase tracking-[0.2em]">
            Minimum Withdrawal
          </p>

          <h2 className="mt-3 text-4xl font-bold">$20</h2>

          <p className="mt-3 text-sm">
            All withdrawals are processed manually by Admin.
          </p>
        </div>

        <div className="rounded-2xl bg-[#071A3D] p-6 text-white shadow-lg">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-300">
            Withdrawal Currency
          </p>

          <h2 className="mt-3 text-3xl font-bold text-[#D4AF37]">
            USDT BEP20
          </h2>

          <p className="mt-3 text-sm text-gray-300">
            Other networks are not supported.
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-[#D4AF37]/40 bg-[#D4AF37]/10 p-5 text-[#D4AF37]">
        <h2 className="text-lg font-bold">Important Wallet Notice</h2>
        <p className="mt-2 text-sm leading-7">
          Only submit a <strong>USDT BEP20</strong> wallet address. ERC20,
          TRC20, Solana, Polygon, Bitcoin, or other network addresses are not
          supported. Withdrawals sent to unsupported networks may be lost.
        </p>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl bg-white p-6 text-[#071A3D] shadow-lg">
          <h2 className="text-2xl font-bold">USDT BEP20 Wallet Address</h2>

          <p className="mt-2 text-sm text-gray-500">
            Add the USDT BEP20 address where approved payouts should be sent.
          </p>

          <input
            type="text"
            placeholder={
              loading
                ? "Loading wallet address..."
                : "Enter USDT BEP20 wallet address"
            }
            value={walletAddress}
            onChange={(event) => setWalletAddress(event.target.value)}
            className="mt-5 w-full rounded-lg border border-gray-300 p-3 outline-none"
          />

          <button
            onClick={saveWalletAddress}
            disabled={savingWallet || loading}
            className="mt-5 w-full rounded-lg bg-[#D4AF37] py-3 font-semibold disabled:opacity-60"
          >
            {savingWallet ? "Saving..." : "Save USDT BEP20 Address"}
          </button>
        </div>

        <div className="rounded-2xl bg-white p-6 text-[#071A3D] shadow-lg">
          <h2 className="text-2xl font-bold">Withdrawal Request</h2>

          <p className="mt-2 text-sm text-gray-500">
            Withdrawals apply only to real referral and investment earnings.
            Dessetra Points cannot be withdrawn or converted to money.
          </p>

          <div className="mt-4 rounded-xl bg-gray-100 p-4 text-sm">
            <p>
              Available Balance:{" "}
              <strong>{formatMoney(availableBalance)}</strong>
            </p>
            <p className="mt-1">
              Minimum Withdrawal: <strong>$20 USDT</strong>
            </p>
            <p className="mt-1">
              Network: <strong>BEP20 only</strong>
            </p>
          </div>

          <input
            type="number"
            placeholder="Enter withdrawal amount in USDT"
            value={withdrawAmount}
            onChange={(event) => setWithdrawAmount(event.target.value)}
            className="mt-5 w-full rounded-lg border border-gray-300 p-3 outline-none"
          />

          {!canWithdraw && (
            <p className="mt-3 text-sm text-red-600">
              Your balance must be at least $20 before you can request a
              withdrawal.
            </p>
          )}

          <button
            onClick={requestWithdrawal}
            disabled={requestingWithdrawal || loading || !canWithdraw}
            className="mt-5 w-full rounded-lg bg-[#1E88E5] py-3 font-semibold text-white disabled:opacity-60"
          >
            {requestingWithdrawal ? "Submitting..." : "Request Withdrawal"}
          </button>
        </div>
      </div>

      <div className="mt-6 rounded-2xl bg-[#0D2A5E] p-6">
        <h2 className="text-2xl font-bold">Recent Wallet Transactions</h2>

        {transactions.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-gray-500 p-10 text-center text-gray-400">
            No wallet transactions yet.
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {transactions.slice(0, 8).map((transaction) => (
              <div
                key={transaction.id}
                className="flex flex-col justify-between gap-3 rounded-xl bg-white p-4 text-[#071A3D] md:flex-row md:items-center"
              >
                <div>
                  <p className="font-bold">
                    {transaction.description || transaction.transaction_type}
                  </p>

                  <p className="mt-1 text-sm text-gray-500">
                    {formatDate(transaction.created_at)} •{" "}
                    <span className="capitalize">{transaction.status}</span>
                  </p>
                </div>

                <p
                  className={`text-lg font-bold ${
                    transaction.direction === "credit"
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {transaction.direction === "credit" ? "+" : "-"}
                  {formatMoney(transaction.amount_usd)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 rounded-2xl bg-[#0D2A5E] p-6">
        <h2 className="text-2xl font-bold">Withdrawal History</h2>

        {withdrawals.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-gray-500 p-10 text-center text-gray-400">
            No withdrawal requests yet.
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {withdrawals.map((withdrawal) => (
              <div
                key={withdrawal.id}
                className="rounded-xl bg-white p-4 text-[#071A3D]"
              >
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                  <div>
                    <p className="font-bold">
                      {formatMoney(withdrawal.amount)}{" "}
                      {withdrawal.currency || "USDT_BEP20"}
                    </p>

                    <p className="mt-1 text-sm text-gray-500">
                      Requested: {formatDate(withdrawal.requested_at)} • Status:{" "}
                      <span className="capitalize">{withdrawal.status}</span>
                    </p>
                  </div>

                  <div className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-semibold">
                    {withdrawal.network || "BEP20"}
                  </div>
                </div>

                <p className="mt-3 break-all rounded-lg bg-gray-100 p-3 font-mono text-xs">
                  {withdrawal.wallet_address}
                </p>

                {withdrawal.tx_hash && (
                  <p className="mt-3 break-all text-sm">
                    <strong>TX Hash:</strong> {withdrawal.tx_hash}
                  </p>
                )}

                {withdrawal.admin_note && (
                  <p className="mt-3 text-sm text-gray-600">
                    <strong>Admin Note:</strong> {withdrawal.admin_note}
                  </p>
                )}

                {withdrawal.processed_at && (
                  <p className="mt-3 text-sm text-gray-500">
                    Processed: {formatDate(withdrawal.processed_at)}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}