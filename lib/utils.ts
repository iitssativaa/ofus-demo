import type { Company, Task } from "./types";
import { localDate, taskIsOverdue } from "./task-selectors";

export const todayIso = () => localDate();
export const addDaysIso = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return localDate(date);
};
export const formatDate = (value: string, long = false) => value ? new Intl.DateTimeFormat("tr-TR", long ? { weekday: "short", month: "short", day: "numeric" } : { month: "short", day: "numeric" }).format(new Date(value.length === 10 ? `${value}T12:00:00` : value)) : "—";
export const isOverdue = (task: Task) => taskIsOverdue(task);
export const companyFor = (id: string, source: Company[]) => source.find((item) => item.id === id)!;
