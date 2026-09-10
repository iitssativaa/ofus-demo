import { sizePoints, type Task } from "@/lib/types";

const months = ["oca", "şub", "mar", "nis", "may", "haz", "tem", "ağu", "eyl", "eki", "kas", "ara"];
const chartPoint = (value: number, index: number, maximum: number) => ({ x: 18 + index / 11 * 324, y: 180 - value / maximum * 110 });
function monotonePath(values: number[], maximum: number) {
  const points = values.map((value, index) => chartPoint(value, index, maximum));
  if (points.length < 2) return points.length ? `M${points[0].x},${points[0].y}` : "";
  const slopes = points.slice(1).map((point, index) => (point.y - points[index].y) / (point.x - points[index].x));
  const tangents = points.map((_, index) => index === 0 ? slopes[0] : index === points.length - 1 ? slopes.at(-1)! : slopes[index - 1] * slopes[index] <= 0 ? 0 : (slopes[index - 1] + slopes[index]) / 2);
  slopes.forEach((slope, index) => { if (!slope) { tangents[index] = 0; tangents[index + 1] = 0; return; } const a = tangents[index] / slope, b = tangents[index + 1] / slope, length = Math.hypot(a, b); if (length > 3) { const scale = 3 / length; tangents[index] = scale * a * slope; tangents[index + 1] = scale * b * slope; } });
  return points.slice(1).reduce((path, point, index) => { const previous = points[index], width = point.x - previous.x; return `${path} C${previous.x + width / 3},${previous.y + tangents[index] * width / 3} ${point.x - width / 3},${point.y - tangents[index + 1] * width / 3} ${point.x},${point.y}`; }, `M${points[0].x},${points[0].y}`);
}

export function PointHistory({ tasks, now }: { tasks: Task[]; now: Date }) {
  const year = now.getFullYear(), month = now.getMonth();
  const totals = (targetYear: number) => months.map((_, index) => tasks.reduce((sum, task) => { const date = task.completedAt ? new Date(task.completedAt) : null; return date && date.getFullYear() === targetYear && date.getMonth() === index ? sum + sizePoints[task.size] : sum; }, 0));
  const values = totals(year), prior = totals(year - 1), hasPrior = prior.some(Boolean);
  const previousMonth = month ? values[month - 1] : prior[11], delta = values[month] - previousMonth;
  const maximum = Math.max(1, ...values, ...(hasPrior ? prior : []));
  const currentValues = values.slice(0, month + 1), current = chartPoint(values[month], month, maximum);
  const calloutX = Math.min(282, Math.max(62, current.x)), calloutY = Math.max(8, current.y - 62);
  const accessibility = `${year} aylık tamamlanan görev puanları: ${currentValues.map((value, index) => `${months[index]} ${value}`).join(", ")}${hasPrior ? `; noktalı çizgi ${year - 1} karşılaştırmasıdır` : ""}`;
  return <figure className="chart-history"><figcaption><b className={delta < 0 ? "is-negative" : ""}>{delta > 0 ? "+" : ""}{delta}</b> puan geçen aya göre</figcaption><svg viewBox="0 0 360 240" role="img" aria-label={accessibility}><path d="M18 180H342" className="chart-history-grid"/>{hasPrior ? <path d={monotonePath(prior, maximum)} className="chart-history-prior"><title>{year - 1} aylık puan karşılaştırması</title></path> : null}<path d={monotonePath(currentValues, maximum)} className="chart-history-current"/><circle cx={current.x} cy={current.y} r="17" className="chart-history-halo"/><circle cx={current.x} cy={current.y} r="5" className="is-current"/><g className="chart-history-callout"><rect x={calloutX - 48} y={calloutY} width="96" height="44" rx="7"/><text x={calloutX} y={calloutY + 17} textAnchor="middle">{values[month]} puan</text><text x={calloutX} y={calloutY + 33} textAnchor="middle">{months[month]} {year}</text></g>{[0,3,6,9,11].map((index) => <text key={months[index]} x={18 + index / 11 * 324} y="225" textAnchor="middle" className="chart-history-month">{months[index]}</text>)}</svg></figure>;
}
