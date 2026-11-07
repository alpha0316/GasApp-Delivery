import { api } from '../../lib/api/client';
import type { EarningsTotals } from '../../lib/api/types';

export const fetchEarnings = () => api<{ totals: EarningsTotals; items: unknown[] }>('/rider/earnings');
