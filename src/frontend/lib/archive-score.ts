export type ArchiveScore = { score: number; decision: string; reasons: string[]; dimensions?: readonly (readonly [string, number, number])[]; scoreType: string; ruleVersion: string };
export function archiveScore(summary: Record<string, unknown>): ArchiveScore {
  const saved = summary.presentationAdmission as ArchiveScore | undefined;
  if (saved && typeof saved.score === 'number') return saved;
  const legal = (summary.legal || summary) as Record<string, unknown>;
  const deductions: [string, number, number][] = [
    ['失信被执行人', Number(legal.dishonestDebtors ?? legal.dishonestDebtor ?? 0), 30],
    ['被执行人', Number(legal.executedDebtors ?? legal.executedDebtor ?? 0), 15],
    ['限制高消费', Number(legal.consumptionRestrictions ?? 0), 10],
    ['终本案件', Number(legal.terminatedExecutionCases ?? 0), 10],
    ['股权冻结', Number(legal.equityFreezes ?? 0), 5],
  ];
  const hits = deductions.filter(([,count]) => count > 0);
  const score = Math.max(0, 85 - hits.reduce((n, [,,penalty]) => n + penalty, 0));
  return { score, decision: score < 60 ? '建议人工复核' : '建议持续维护', reasons: ['参考基准85分；仅按已录入风险项调整，不因资料未提供而扣分。', ...hits.map(([label,count,penalty]) => `${label}${count}条：扣${penalty}分（同类不重复扣分）`)], scoreType: '资料参考评分', ruleVersion: 'archive-reference-1' };
}
