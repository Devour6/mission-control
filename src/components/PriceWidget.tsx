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
const getApiUrl = (): string => {
  // In development, try localhost first
  if (process.env.NODE_ENV === "development") {
    return "http://localhost:3001/api/v3/simple/price?ids=solana,bitcoin,ethereum&vs_currencies=usd";
  }
  
  // In production, use CoinGecko public API as fallback
  return "https://api.coingecko.com/api/v3/simple/price?ids=solana,bitcoin,ethereum&vs_currencies=usd";
};

// --- Fetcher with fallback logic ---
const fetcher = async (url: string): Promise<PriceData> => {
  try {
    // Try primary URL
    const response = await fetch(url, { 
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      // Add timeout for localhost requests
      signal: AbortSignal.timeout(5000)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    // If localhost fails in dev, fallback to public API
    if (process.env.NODE_ENV === "development" && url.includes("localhost")) {
      console.warn("Localhost aggregator unavailable, falling back to CoinGecko:", error);
      const fallbackUrl = "https://api.coingecko.com/api/v3/simple/price?ids=solana,bitcoin,ethereum&vs_currencies=usd";
      const fallbackResponse = await fetch(fallbackUrl);
      
      if (!fallbackResponse.ok) {
        throw new Error(`Fallback API failed: HTTP ${fallbackResponse.status}`);
      }
      
      return await fallbackResponse.json();
    }
    
    throw error;
  }
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
  const apiUrl = getApiUrl();
  const isLocalhost = apiUrl.includes("localhost");
  
  const { data, error, isLoading } = useSWR<PriceData>(
    apiUrl,
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
          Updates every 30s • {isLocalhost ? "Price Aggregator" : "CoinGecko"}
        </div>
      </div>
    </div>
  );
}