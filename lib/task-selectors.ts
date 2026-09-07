import { sizePoints, type Task } from "./types";

export function localDate(value: Date | string = new Date(), timeZone?: string): string {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = typeof value === "string" ? new Date(value) : value;
  if (!Number.isFinite(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-US", { year: "numeric", month: "2-digit", day: "2-digit", timeZone }).formatToParts(date);
  const part = (type: string) => parts.find((item) => item.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function localTime(value: Date | string = new Date(), timeZone?: string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (!Number.isFinite(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone }).formatToParts(date);
  const part = (type: string) => parts.find((item) => item.type === type)?.value;
  return `${part("hour")}:${part("minute")}`;
}

export function deadlineToIso(dateValue: string, timeValue: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue) || !/^\d{2}:\d{2}$/.test(timeValue)) return null;
  const [year, month, day] = dateValue.split("-").map(Number);
  const [hour, minute] = timeValue.split(":").map(Number);
  const deadline = new Date(year, month - 1, day, hour, minute, 0, 0);
  if (
    deadline.getFullYear() !== year
    || deadline.getMonth() !== month - 1
    || deadline.getDate() !== day
    || deadline.getHours() !== hour
    || deadline.getMinutes() !== minute
  ) return null;
  return deadline.toISOString();
}

export const isActiveTask = (task: Task) => ["To Do", "In Progress", "Waiting", "Review"].includes(task.status) && !task.cancelledAt;
export const taskDate = (task: Task) => task.dueAt ? localDate(task.dueAt) : task.dueDate;
export const taskIsOverdue = (task: Task, now = new Date()) => isActiveTask(task) && (task.dueAt ? new Date(task.dueAt).getTime() < now.getTime() : Boolean(task.dueDate && task.dueDate < localDate(now)));
export const priorityRank = { Urgent: 0, High: 1, Medium: 2, Low: 3 };

export function dashboardSummary(tasks: Task[], now = new Date()) {
  const today = localDate(now);
  const weekEnd = new Date(now);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const active = tasks.filter(isActiveTask);
  const byDeadline = (a: Task, b: Task) => (a.dueAt || taskDate(a) || "9999").localeCompare(b.dueAt || taskDate(b) || "9999");
  const overdue = active.filter((task) => taskIsOverdue(task, now)).sort(byDeadline);
  const dueToday = active.filter((task) => taskDate(task) === today);
  const upcoming = active
    .filter((task) => !taskIsOverdue(task, now) && taskDate(task) >= today && taskDate(task) <= localDate(weekEnd))
    .sort(byDeadline);

  const focus: Task[] = [];
  const focusedIds = new Set<string>();
  const appendUnique = (items: Task[]) => {
    for (const task of items) {
      if (focus.length >= 5) break;
      if (!focusedIds.has(task.id)) {
        focusedIds.add(task.id);
        focus.push(task);
      }
    }
  };
  appendUnique(overdue);
  appendUnique(dueToday.filter((task) => !taskIsOverdue(task, now)).sort(byDeadline));
  appendUnique(active.filter((task) => taskDate(task) > today).sort(byDeadline));

  return { active, overdue, dueToday, upcoming: upcoming.slice(0, 5), focus };
}

export function memberWorkload(tasks: Task[], memberId: string) {
  const owned = tasks.filter((task) => isActiveTask(task) && task.assigneeId === memberId);
  return { count: owned.length, points: owned.reduce((sum, task) => sum + sizePoints[task.size], 0) };
}

export function calendarDeadlines(tasks: Task[]) {
  const days = new Map<string, Task[]>();
  for (const task of tasks.filter(isActiveTask)) {
    const date = taskDate(task);
    if (!date) continue;
    days.set(date, [...(days.get(date) ?? []), task]);
  }
  return days;
}

export function recentTaskActivities(tasks: Task[], limit = 100) {
  return tasks.flatMap((task) => (task.activity ?? []).map((activity) => ({ activity, task })))
    .sort((a, b) => b.activity.createdAt.localeCompare(a.activity.createdAt) || b.activity.id.localeCompare(a.activity.id)).slice(0, limit);
}
