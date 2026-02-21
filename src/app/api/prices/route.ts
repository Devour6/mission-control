import { NextResponse } from "next/server";

// Uses our local price aggregator (port 3001) — CoinGecko Pro replacement
const PRICE_AGGREGATOR_URL =
  "http://localhost:3001/api/v3/simple/price?ids=solana,bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true";

let cache: { data: unknown; ts: number } | null = null;
const CACHE_TTL = 30_000; // 30 seconds

export async function GET() {
  const now = Date.now();
  if (cache && now - cache.ts < CACHE_TTL) {
    return NextResponse.json(cache.data);
  }

  try {
    const res = await fetch(PRICE_AGGREGATOR_URL, {
      headers: {
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) throw new Error(`Price Aggregator ${res.status}`);
    const data = await res.json();
    cache = { data, ts: now };
    return NextResponse.json(data);
  } catch {
    // If cache exists but stale, serve it anyway
    if (cache) return NextResponse.json(cache.data);
    return NextResponse.json(
      { error: "Price feed unavailable" },
      { status: 502 }
    );
  }
}
