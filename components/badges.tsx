import type { Priority, Status } from "@/lib/types";
import { priorityLabels, statusLabels } from "@/lib/i18n";

const priorityStyles: Record<Priority, string> = {
  Low: "bg-slate-100 text-slate-600",
  Medium: "bg-blue-50 text-blue-700",
  High: "bg-amber-50 text-amber-700",
  Urgent: "ofus-urgent",
};

const statusStyles: Record<Status, string> = {
  "To Do": "bg-slate-100 text-slate-650",
  "In Progress": "bg-indigo-50 text-indigo-700",
  Waiting: "bg-amber-50 text-amber-700",
  Review: "bg-emerald-50 text-emerald-700",
  Done: "bg-emerald-50 text-emerald-700",
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  return <span className={`badge ${priorityStyles[priority]}`}><span className={`h-1.5 w-1.5 rounded-full ${priority === "Urgent" ? "bg-rose-500" : priority === "High" ? "bg-amber-500" : priority === "Medium" ? "bg-blue-500" : "bg-slate-400"}`} />{priorityLabels[priority]}</span>;
}

export function StatusBadge({ status }: { status: Status }) {
  return <span className={`badge ${statusStyles[status]}`}>{statusLabels[status]}</span>;
}

