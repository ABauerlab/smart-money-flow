import { useQuery } from '@tanstack/react-query';

export type RoundTrend = 'up' | 'down' | 'flat' | 'new';

export interface RoundRanking {
  symbol: string;
  count: number;
  rank: number;
  trend: RoundTrend;
  previousCount: number | null;
}

export interface RoundSummary {
  id: string;
  timestamp: string;
  sourceFileName: string | null;
}

export interface LatestRoundResponse {
  latest?: null;
  selectedRoundId?: string;
  isLatest?: boolean;
  isFallbackFromPreviousDay?: boolean;
  timestamp?: string;
  sourceFileName?: string | null;
  title?: string | null;
  rankings?: RoundRanking[];
  rounds: RoundSummary[];
}

const BASE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/crypto-analysis`;
const headers = {
  'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
  'Content-Type': 'application/json',
};

// Round-trips to the operational endpoint every 60s while the tab is open, so the
// dashboard reflects a new Make.com ingestion without the user needing to refresh.
export const useOperationalRound = (submissionId?: string) => {
  const getAccessCode = () => localStorage.getItem('crypto_access_code') || undefined;

  return useQuery<LatestRoundResponse>({
    queryKey: ['latest-round', submissionId ?? 'current'],
    queryFn: async () => {
      const resp = await fetch(`${BASE_URL}?action=latest-round`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ accessCode: getAccessCode(), submissionId }),
      });
      if (!resp.ok) throw new Error('Falha ao carregar a rodada operacional.');
      return resp.json();
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
};
