import type { CSSProperties, ReactNode } from "react";
import Image from "next/image";

export function TeamGauge({ percent }: { percent: number | null }) {
  const value = percent ?? 0;
  return <div className="ofus-team-gauge chart-team-gauge" role="img" aria-label={percent === null ? "Zamanında tamamlanma verisi yok" : `Zamanında tamamlanma yüzde ${percent}`}><svg viewBox="0 0 240 140" aria-hidden="true"><path d="M 20 120 A 100 100 0 0 1 220 120" className="chart-track" pathLength="100" /><path d="M 20 120 A 100 100 0 0 1 220 120" className="chart-value" pathLength="100" strokeDasharray={`${value} 100`} /></svg><Image unoptimized className="ofus-team-emotion" src="/ofus/emotions/duygu-1.svg" width={72} height={70} alt="" /><strong>{percent === null ? "—" : `${percent}%`}</strong><p>Zamanında tamamlanma</p><span>{percent === null ? "Henüz ölçülebilir tamamlanma yok." : "Teslim tarihine göre"}</span></div>;
}

export function RingMetric({ value, total, label, color = "var(--accent)", children }: { value: number; total: number; label: string; color?: string; children?: ReactNode }) {
  const ratio = total > 0 ? Math.max(0, Math.min(1, value / total)) : 0;
  return <><div className="ofus-ring chart-ring" role="img" aria-label={`${value} ${label}, toplam ${total}`}><svg viewBox="0 0 220 220" aria-hidden="true"><circle cx="110" cy="110" r="96" className="chart-track" /><circle cx="110" cy="110" r="96" className="chart-value" style={{ stroke: color }} pathLength="100" strokeDasharray={`${ratio * 100} 100`} /></svg><div className="ofus-ring-center"><strong>{value}</strong><span>{label}</span></div></div>{children}</>;
}

export function MonthlyChart({ counts, month }: { counts: number[]; month: number }) {
  const labels = ["oca", "şub", "mar", "nis", "may", "haz", "tem", "ağu", "eyl", "eki", "kas", "ara"];
  const maximum = Math.max(1, ...counts);
  const axisMaximum = Math.max(10, Math.ceil(maximum / 10) * 10);
  const middle = axisMaximum / 2;
  return <figure className="chart-monthly" aria-label={counts.map((count, index) => `${labels[index]}: ${count} tamamlanan görev`).join(", ")}>
    <figcaption><span><i className="is-future" />Gelecek aylar</span><span><i />Geçen / bu ay</span></figcaption>
    <div className="chart-monthly-plot"><span className="chart-grid is-top"/><span className="chart-grid is-middle"/><span className="chart-axis-label is-top">{axisMaximum}</span><span className="chart-axis-label is-middle">{middle}</span><span className="chart-axis-label is-bottom">0</span>{counts.map((count, index) => <div key={labels[index]} className="chart-month-bar" data-future={index > month} data-current={index === month}><div className="chart-month-bar-plot" style={{ "--bar-percent": `${count / axisMaximum * 100}%` } as CSSProperties}><span className="chart-bar-value">{index === month ? count : ""}</span><i style={{ height: `${count / axisMaximum * 100}%` }} /></div><span>{labels[index]}</span></div>)}</div>
  </figure>;
}
