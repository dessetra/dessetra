"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabase";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

export default function WalletPage() {
  const [walletAddress, setWalletAddress] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingWallet, setSavingWallet] = useState(false);
  const [requestingWithdrawal, setRequestingWithdrawal] = useState(false);

  useEffect(() => {
    async function loadWalletAddress() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("wallet_address")
        .eq("id", user.id)
        .single();

      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }

      setWalletAddress(data?.wallet_address || "");
      setLoading(false);
    }

    loadWalletAddress();
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

    if (!amount || amount < 50) {
      toast.error("Minimum withdrawal amount is $50.");
      return;
    }

    setRequestingWithdrawal(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("Please login again.");
      setRequestingWithdrawal(false);
      return;
    }

    const { error } = await supabase.from("withdrawal_requests").insert({
      user_id: user.id,
      amount,
      wallet_address: walletAddress.trim(),
      status: "pending",
    });

    setRequestingWithdrawal(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    setWithdrawAmount("");
    toast.success("Withdrawal request submitted successfully.");
  };

  return (
    <DashboardLayout>
      <div className="rounded-2xl bg-[#0D2A5E] p-5 shadow-lg md:p-6">
        <h1 className="text-2xl font-bold md:text-3xl">Wallet</h1>
        <p className="mt-2 text-sm text-gray-300 md:text-base">
          Manage your USDT BEP20 wallet address and commission withdrawal requests.
        </p>
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
            Add the USDT BEP20 address where commission payouts should be sent.
          </p>

          <input
            type="text"
            placeholder={
              loading
                ? "Loading wallet address..."
                : "Enter USDT BEP20 wallet address"
            }
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
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
            Withdrawals apply only to real commission earnings. Dessetra Points
            cannot be withdrawn or converted to money.
          </p>

          <p className="mt-3 text-sm font-semibold text-[#071A3D]">
            Minimum Withdrawal: $50 USDT
          </p>

          <input
            type="number"
            placeholder="Enter withdrawal amount in USDT"
            value={withdrawAmount}
            onChange={(e) => setWithdrawAmount(e.target.value)}
            className="mt-5 w-full rounded-lg border border-gray-300 p-3 outline-none"
          />

          <button
            onClick={requestWithdrawal}
            disabled={requestingWithdrawal}
            className="mt-5 w-full rounded-lg bg-[#1E88E5] py-3 font-semibold text-white disabled:opacity-60"
          >
            {requestingWithdrawal ? "Submitting..." : "Request Withdrawal"}
          </button>
        </div>
      </div>

      <div className="mt-6 rounded-2xl bg-[#0D2A5E] p-6">
        <h2 className="text-2xl font-bold">Withdrawal History</h2>

        <div className="mt-6 rounded-xl border border-dashed border-gray-500 p-10 text-center text-gray-400">
          No withdrawal requests yet.
        </div>
      </div>
    </DashboardLayout>
  );
}