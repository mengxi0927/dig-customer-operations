import type { DigAccount } from './dig-types';

export function customerAssetTrend(customers: DigAccount[], months: number, now = new Date()) {
  const monthKey = (date: Date) => new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit',
  }).format(date);
  const current = monthKey(now);
  const dates = customers.flatMap(c => {
    if (!c.appliedAt) return [];
    const d = new Date(c.appliedAt);
    return Number.isFinite(d.getTime()) && d <= now ? [monthKey(d)] : [];
  });
  const [year, month] = current.split('-').map(Number);
  return {
    dated: dates.length,
    excluded: customers.length - dates.length,
    points: Array.from({ length: months }, (_, i) => {
      const key = monthKey(new Date(Date.UTC(year, month - months + i, 15)));
      return { month: key, added: dates.filter(d => d === key).length,
        total: dates.filter(d => d <= key).length };
    }),
  };
}
