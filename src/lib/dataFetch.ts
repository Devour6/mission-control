/**
 * Fetch data files — uses API route (always fresh from GitHub) with fallback to static.
 */
export async function fetchData<T>(filename: string): Promise<T> {
  try {
    const res = await fetch(`/api/data?file=${filename}`, { cache: "no-store" });
    if (res.ok) return res.json();
  } catch {
    // Fall through to static
  }
  // Fallback: static file
  const res = await fetch(`/data/${filename}`);
  return res.json();
}
