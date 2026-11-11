import type { DigAccount } from './dig-types';

const shanghaiMonth = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit',
});

export function customerAssetTrend(customers: DigAccount[], months: number, now = new Date()) {
  const monthKey = shanghaiMonth.format;
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

export function customersAddedInYear(customers: DigAccount[], year: number, now = new Date()) {
  const start = new Date(`${year}-01-01T00:00:00+08:00`).getTime();
  const end = new Date(`${year + 1}-01-01T00:00:00+08:00`).getTime();
  return new Set(customers.filter(c => {
    const time = c.appliedAt ? new Date(c.appliedAt).getTime() : NaN;
    return Number.isFinite(time) && time >= start && time < end && time <= now.getTime();
  }).map(c => c.id)).size;
}
