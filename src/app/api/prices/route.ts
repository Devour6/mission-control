import { NextResponse } from "next/server";

const COINGECKO_API_KEY = process.env.COINGECKO_API_KEY || "";
const COINGECKO_URL =
  "https://pro-api.coingecko.com/api/v3/simple/price?ids=solana,bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true";

let cache: { data: unknown; ts: number } | null = null;
const CACHE_TTL = 30_000; // 30 seconds

export async function GET() {
  const now = Date.now();
  if (cache && now - cache.ts < CACHE_TTL) {
    return NextResponse.json(cache.data);
  }

  try {
    const res = await fetch(COINGECKO_URL, {
      headers: {
        Accept: "application/json",
        "x-cg-pro-api-key": COINGECKO_API_KEY,
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
    const data = await res.json();
    cache = { data, ts: now };
    return NextResponse.json(data);
  } catch (e) {
    // If cache exists but stale, serve it anyway
    if (cache) return NextResponse.json(cache.data);
    return NextResponse.json(
      { error: "Price feed unavailable" },
      { status: 502 }
    );
  }
}
