"use client";

import { useMemo } from "react";
import useSWR from "swr";

// --- Types ---
interface CoinPrice {
  usd: number;
  usd_24h_change?: number;
}

interface PriceData {
  solana: CoinPrice;
  bitcoin: CoinPrice;
  ethereum: CoinPrice;
}

interface CoinDisplayProps {
  name: string;
  symbol: string;
  icon: string;
  price: number;
  change24h?: number;
  loading?: boolean;
}

// --- API Configuration ---
// Uses our own Next.js API route which proxies to CoinGecko Pro.
const PRICE_ENDPOINT = "/api/prices";

// --- Fetcher ---
const fetcher = async (): Promise<PriceData> => {
  const response = await fetch(PRICE_ENDPOINT, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(5000),
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return await response.json();
};

// --- Coin Display Component ---
function CoinDisplay({ name, symbol, icon, price, change24h, loading }: CoinDisplayProps) {
  const changeColor = useMemo(() => {
    if (change24h === undefined) return "text-[#8b8fa3]";
    return change24h >= 0 ? "text-green-400" : "text-red-400";
  }, [change24h]);

  const changePrefix = useMemo(() => {
    if (change24h === undefined) return "";
    return change24h >= 0 ? "+" : "";
  }, [change24h]);

  if (loading) {
    return (
      <div className="flex items-center justify-between p-3 border-b border-[#2e3345] last:border-b-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#2e3345] rounded-full animate-pulse" />
          <div>
            <div className="w-12 h-3 bg-[#2e3345] rounded animate-pulse mb-1" />
            <div className="w-8 h-2 bg-[#2e3345] rounded animate-pulse" />
          </div>
        </div>
        <div className="text-right">
          <div className="w-16 h-3 bg-[#2e3345] rounded animate-pulse mb-1" />
          <div className="w-12 h-2 bg-[#2e3345] rounded animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-3 border-b border-[#2e3345] last:border-b-0 hover:bg-[#242836] transition-colors">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-[#2e3345] flex items-center justify-center text-sm">
          {icon}
        </div>
        <div>
          <div className="text-sm font-semibold text-[#e4e6ed]">{name}</div>
          <div className="text-xs text-[#8b8fa3] uppercase">{symbol}</div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-sm font-mono text-[#e4e6ed]">
          ${price.toLocaleString('en-US', { 
            minimumFractionDigits: price < 1 ? 4 : 2,
            maximumFractionDigits: price < 1 ? 4 : 2
          })}
        </div>
        {change24h !== undefined && (
          <div className={`text-xs font-mono ${changeColor}`}>
            {changePrefix}{change24h.toFixed(2)}%
          </div>
        )}
      </div>
    </div>
  );
}

// --- Health Status Component ---
function HealthStatus({ isError, isLoading }: { isError: boolean; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
        <span className="text-xs text-[#8b8fa3]">Loading...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 bg-red-500 rounded-full" />
        <span className="text-xs text-red-400">Offline</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="w-2 h-2 bg-green-500 rounded-full" />
      <span className="text-xs text-green-400">Live</span>
    </div>
  );
}

// --- Main Price Widget ---
export default function PriceWidget() {
  const isLocalhost = process.env.NODE_ENV === "development";
  
  const { data, error, isLoading } = useSWR<PriceData>(
    "prices",
    fetcher,
    {
      refreshInterval: 30000, // 30 seconds
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      errorRetryCount: 2,
      errorRetryInterval: 5000,
    }
  );

  const coins = useMemo(() => [
    {
      name: "Solana",
      symbol: "SOL",
      icon: "◎",
      price: data?.solana?.usd || 0,
      change24h: data?.solana?.usd_24h_change,
    },
    {
      name: "Bitcoin", 
      symbol: "BTC",
      icon: "₿",
      price: data?.bitcoin?.usd || 0,
      change24h: data?.bitcoin?.usd_24h_change,
    },
    {
      name: "Ethereum",
      symbol: "ETH", 
      icon: "Ξ",
      price: data?.ethereum?.usd || 0,
      change24h: data?.ethereum?.usd_24h_change,
    },
  ], [data]);

  return (
    <div className="bg-[#1a1d27] border border-[#2e3345] rounded-xl overflow-hidden">
      <div className="px-3 py-2.5 border-b border-[#2e3345] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold text-[#e4e6ed]">💰 Live Prices</h3>
          {isLocalhost && (
            <span className="text-[8px] text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded">
              LOCAL
            </span>
          )}
        </div>
        <HealthStatus isError={!!error} isLoading={isLoading} />
      </div>
      
      <div className="max-h-[200px] overflow-y-auto">
        {error ? (
          <div className="p-3 text-center">
            <div className="text-xs text-red-400 mb-1">Price feed unavailable</div>
            <div className="text-[10px] text-[#8b8fa3]">
              {isLocalhost ? "Aggregator offline" : "Network error"}
            </div>
          </div>
        ) : (
          coins.map((coin) => (
            <CoinDisplay
              key={coin.symbol}
              name={coin.name}
              symbol={coin.symbol}
              icon={coin.icon}
              price={coin.price}
              change24h={coin.change24h}
              loading={isLoading}
            />
          ))
        )}
      </div>

      <div className="px-3 py-2 border-t border-[#2e3345] bg-[#141620]/50">
        <div className="text-[9px] text-[#8b8fa3] text-center">
          Updates every 30s • Price Aggregator
        </div>
      </div>
    </div>
  );
}