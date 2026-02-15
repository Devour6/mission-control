import useSWR from 'swr';

/**
 * Fetcher function for SWR - uses the same logic as the existing fetchData
 */
const fetcher = async (url: string) => {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (res.ok) return res.json();
  } catch {
    // Fall through to static file fallback
  }
  
  // Fallback: try static file (extract filename from API URL)
  const filename = url.split('?file=')[1];
  if (filename) {
    const res = await fetch(`/data/${filename}`);
    if (res.ok) return res.json();
  }
  
  throw new Error('Failed to fetch data from both API and static sources');
};

/**
 * Custom hook for auto-refreshing data with SWR
 * 
 * @param filename - The JSON filename to fetch (e.g., 'content.json')
 * @param refreshInterval - How often to refresh in milliseconds (default: 30s)
 * @returns SWR response with data, loading, and error states
 */
export function useData<T>(filename: string, refreshInterval: number = 30000) {
  const { data, error, isLoading, mutate } = useSWR(
    `/api/data?file=${filename}`,
    fetcher,
    {
      refreshInterval, // Auto-refresh interval
      revalidateOnFocus: true, // Refresh when tab becomes active
      revalidateOnReconnect: true, // Refresh when network reconnects
      dedupingInterval: 5000, // Prevent duplicate requests within 5s
      errorRetryCount: 3,
      errorRetryInterval: 5000,
      shouldRetryOnError: true,
      refreshWhenHidden: false, // Don't refresh when tab is hidden (save resources)
      refreshWhenOffline: false, // Don't refresh when offline
    }
  );

  return {
    data: data as T | null,
    isLoading,
    isError: error,
    mutate, // Manual refresh function
  };
}

/**
 * Predefined refresh intervals for different types of data
 */
export const RefreshIntervals = {
  HIGH_ACTIVITY: 15000,    // 15s - for content approvals, active tasks
  MEDIUM_ACTIVITY: 30000,  // 30s - for office status, general tasks  
  LOW_ACTIVITY: 60000,     // 60s - for projects, docs, calendar
  STATIC: 120000,          // 2min - for team info, rarely changing data
} as const;