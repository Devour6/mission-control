"use client";

import { useEffect, useState } from "react";
import type { WalletData, WalletWeeklyData, Trade } from "@/lib/types";
import { fetchData } from "@/lib/dataFetch";

function truncateAddr(addr: string) {
  return addr.slice(0, 6) + "…" + addr.slice(-4);
}

function actionColor(action: Trade["action"]) {
  if (action === "buy" || action === "stake") return "text-emerald-400";
  if (action === "sell") return "text-red-400";
  return "text-amber-400";
}

function pctColor(pct: number) {
  if (pct > 0) return "text-emerald-400";
  if (pct < 0) return "text-red-400";
  return "text-[#8b8fa3]";
}

export default function WalletTab() {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [weekly, setWeekly] = useState<WalletWeeklyData | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    Promise.all([
      fetchData<WalletData>("wallet.json").catch(() => null),
      fetchData<WalletWeeklyData>("wallet-weekly.json").catch(() => null),
    ]).then(([w, wk]) => {
      if (!w) return;
      // Sort trades by date
      const sortedTrades = w.trades.sort((a: Trade, b: Trade) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setWallet({ ...w, trades: sortedTrades });
      if (wk) setWeekly(wk);
    });
  }, []);

  if (!wallet) return <div className="text-[#8b8fa3]">Loading wallet…</div>;

  const monthGain = ((wallet.currentBalance.usd - wallet.startingBalance.usd) / wallet.startingBalance.usd) * 100;
  const progressPct = Math.min(100, Math.max(0, (monthGain / wallet.monthlyTarget) * 100));

  const copyAddr = () => {
    navigator.clipboard.writeText(wallet.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-[#e4e6ed] flex items-center gap-2">
          💰 Wallet
        </h2>
        <p className="text-sm text-[#8b8fa3] mt-1">Solana • Trading Journal</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Address + Balance */}
        <div className="bg-[#1a1d27] border border-[#2e3345] rounded-xl p-5">
          <p className="text-xs text-[#8b8fa3] uppercase tracking-wider mb-2">Address</p>
          <button onClick={copyAddr} className="flex items-center gap-2 text-sm font-mono text-indigo-400 hover:text-indigo-300 transition-colors">
            {truncateAddr(wallet.address)}
            <span className="text-xs">{copied ? "✓" : "📋"}</span>
          </button>
          <div className="mt-4">
            <p className="text-xs text-[#8b8fa3] uppercase tracking-wider mb-1">Current Balance</p>
            <p className="text-2xl font-bold text-[#e4e6ed]">${wallet.currentBalance.usd.toLocaleString()}</p>
            <p className="text-sm text-[#8b8fa3]">{wallet.currentBalance.sol} SOL</p>
          </div>
        </div>

        {/* Monthly Target */}
        <div className="bg-[#1a1d27] border border-[#2e3345] rounded-xl p-5">
          <p className="text-xs text-[#8b8fa3] uppercase tracking-wider mb-2">Monthly Target</p>
          <p className="text-2xl font-bold text-[#e4e6ed]">{wallet.monthlyTarget}%</p>
          <div className="mt-3">
            <div className="flex justify-between text-xs text-[#8b8fa3] mb-1">
              <span>Progress</span>
              <span className={pctColor(monthGain)}>{monthGain.toFixed(2)}%</span>
            </div>
            <div className="w-full bg-[#2e3345] rounded-full h-2.5">
              <div
                className={`h-2.5 rounded-full transition-all ${monthGain >= 0 ? "bg-emerald-500" : "bg-red-500"}`}
                style={{ width: `${Math.abs(progressPct)}%` }}
              />
            </div>
          </div>
          <p className="text-xs text-[#8b8fa3] mt-2">
            Start: ${wallet.startingBalance.usd} • Since {wallet.startDate}
          </p>
        </div>

        {/* Quick Stats */}
        <div className="bg-[#1a1d27] border border-[#2e3345] rounded-xl p-5">
          <p className="text-xs text-[#8b8fa3] uppercase tracking-wider mb-2">Stats</p>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-[#8b8fa3]">Total Trades</p>
              <p className="text-xl font-bold text-[#e4e6ed]">{wallet.trades.length}</p>
            </div>
            <div>
              <p className="text-xs text-[#8b8fa3]">P&L</p>
              <p className={`text-xl font-bold ${pctColor(wallet.currentBalance.usd - wallet.startingBalance.usd)}`}>
                {wallet.currentBalance.usd - wallet.startingBalance.usd >= 0 ? "+" : ""}
                ${(wallet.currentBalance.usd - wallet.startingBalance.usd).toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Roundup */}
      {weekly && weekly.weeks.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-[#e4e6ed] mb-3">📊 Weekly Roundup</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {weekly.weeks.map((w, i) => (
              <div key={i} className="bg-[#1a1d27] border border-[#2e3345] rounded-lg p-4">
                <p className="text-xs text-[#8b8fa3] mb-2">Week of {w.startDate}</p>
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-xs text-[#8b8fa3]">Start</p>
                    <p className="text-sm font-medium text-[#e4e6ed]">${w.startValue.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#8b8fa3]">End</p>
                    <p className="text-sm font-medium text-[#e4e6ed]">${w.endValue.toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-[#8b8fa3]">Change</p>
                    <p className={`text-sm font-bold ${pctColor(w.pctChange)}`}>
                      {w.pctChange >= 0 ? "+" : ""}{w.pctChange.toFixed(2)}%
                    </p>
                  </div>
                </div>
                {w.cumulativeReturn !== undefined && (
                  <p className={`text-xs mt-2 ${pctColor(w.cumulativeReturn)}`}>
                    Cumulative: {w.cumulativeReturn >= 0 ? "+" : ""}{w.cumulativeReturn.toFixed(2)}%
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trades Log */}
      <div>
        <h3 className="text-lg font-semibold text-[#e4e6ed] mb-3">📒 Trades Log</h3>
        {wallet.trades.length === 0 ? (
          <div className="bg-[#1a1d27] border border-[#2e3345] rounded-xl p-8 text-center text-[#8b8fa3]">
            No trades yet. Update wallet.json to add entries.
          </div>
        ) : (
          <div className="bg-[#1a1d27] border border-[#2e3345] rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="border-b border-[#2e3345] text-[#8b8fa3] text-xs uppercase tracking-wider">
                    <th className="text-left p-3 whitespace-nowrap">Date</th>
                    <th className="text-left p-3 whitespace-nowrap">Action</th>
                    <th className="text-left p-3 whitespace-nowrap">Token(s)</th>
                    <th className="text-right p-3 whitespace-nowrap">Amount</th>
                    <th className="text-right p-3 whitespace-nowrap">USD</th>
                    <th className="text-left p-3 whitespace-nowrap">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {wallet.trades.map((t) => (
                    <tr key={t.id} className="border-b border-[#2e3345]/50 hover:bg-[#242836] transition-colors">
                      <td className="p-3 text-[#8b8fa3] font-mono text-xs whitespace-nowrap">{t.date}</td>
                      <td className={`p-3 font-semibold uppercase text-xs ${actionColor(t.action)} whitespace-nowrap`}>{t.action}</td>
                      <td className="p-3 text-[#e4e6ed] whitespace-nowrap">{t.tokens.join(" / ")}</td>
                      <td className="p-3 text-right text-[#e4e6ed] font-mono whitespace-nowrap">{t.amount}</td>
                      <td className={`p-3 text-right font-mono ${t.usdValue >= 0 ? "text-emerald-400" : "text-red-400"} whitespace-nowrap`}>
                        ${Math.abs(t.usdValue).toFixed(2)}
                      </td>
                      <td className="p-3 text-[#8b8fa3] text-xs max-w-[200px] truncate">{t.notes || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Read-only notice */}
      <div className="mt-6 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <p className="text-xs text-blue-400">💰 Wallet data is managed by John&#39;s scans and loaded from wallet.json</p>
      </div>
    </div>
  );
}