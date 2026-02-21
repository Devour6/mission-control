import { NextResponse } from "next/server";

// Primary: local price aggregator (when running on Mac mini)
const LOCAL_AGGREGATOR_URL =
  "http://localhost:3001/api/v3/simple/price?ids=solana,bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true";

// Fallback: CoinGecko free API (no key needed, for Vercel deployment)
const COINGECKO_FREE_URL =
  "https://api.coingecko.com/api/v3/simple/price?ids=solana,bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true";

let cache: { data: unknown; ts: number } | null = null;
const CACHE_TTL = 30_000; // 30 seconds

async function fetchPrices(): Promise<unknown> {
  // Try local aggregator first
  try {
    const res = await fetch(LOCAL_AGGREGATOR_URL, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(2000),
    });
    if (res.ok) return await res.json();
  } catch {
    // Local aggregator not reachable — fall through to free CoinGecko
  }

  // Fallback: CoinGecko free tier
  const res = await fetch(COINGECKO_FREE_URL, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`CoinGecko free ${res.status}`);
  return await res.json();
}

export async function GET() {
  const now = Date.now();
  if (cache && now - cache.ts < CACHE_TTL) {
    return NextResponse.json(cache.data);
  }

  try {
    const data = await fetchPrices();
    cache = { data, ts: now };
    return NextResponse.json(data);
  } catch {
    if (cache) return NextResponse.json(cache.data);
    return NextResponse.json(
      { error: "Price feed unavailable" },
      { status: 502 }
    );
  }
}
