import type { ReactNode } from "react";
export function TeamGauge({ percent }: { percent: number | null }) {
  return <div className="ofus-team-gauge" role="img" aria-label={percent === null ? "Zamanında tamamlanma verisi yok" : `Zamanında tamamlanma yüzde ${percent}`}><svg viewBox="0 0 240 140" aria-hidden="true"><path d="M 20 120 A 100 100 0 0 1 220 120" fill="none" stroke="var(--border-subtle)" strokeWidth="9" strokeLinecap="round" /><path d="M 20 120 A 100 100 0 0 1 220 120" fill="none" stroke="var(--brand)" strokeWidth="9" strokeLinecap="round" pathLength="100" strokeDasharray={`${percent ?? 0} 100`} /></svg><strong>{percent === null ? "—" : `${percent}%`}</strong><p>Zamanında tamamlanma</p><span>{percent === null ? "Tarihli tamamlanan görev bulunmuyor." : "Tamamlanan görevlerin teslim tarihine göre."}</span></div>;
}
export function RingMetric({ value, total, label, color = "var(--accent)", children }: { value: number; total: number; label: string; color?: string; children?: ReactNode }) {
  const ratio = total > 0 ? Math.max(0, Math.min(1, value / total)) : 0;
  return <><div className="ofus-ring" aria-label={`${value} ${label}`}><svg viewBox="0 0 220 220" aria-hidden="true"><circle cx="110" cy="110" r="100" fill="none" stroke="var(--border-subtle)" strokeWidth="6" /><circle cx="110" cy="110" r="100" fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" pathLength="100" strokeDasharray={`${ratio * 100} 100`} /></svg><div className="ofus-ring-center"><strong>{value}</strong><span className="text-slate-400">{label}</span></div></div>{children}</>;
}
export function MonthlyChart({ counts, month }: { counts: number[]; month: number }) {
  const maximum = Math.max(1, ...counts);
  const labels = ["oca", "şub", "mar", "nis", "may", "haz", "tem", "ağu", "eyl", "eki", "kas", "ara"];
  return <div className="ofus-month-chart" role="img" aria-label={counts.map((count, index) => `${labels[index]}: ${count} tamamlanan görev`).join(", ")}>{counts.map((count, index) => <div key={index} className="ofus-month-bar" data-future={index > month}><span>{count || ""}</span><i style={{ height: `${count / maximum * 75}%` }} /><span>{labels[index]}</span></div>)}</div>;
}
