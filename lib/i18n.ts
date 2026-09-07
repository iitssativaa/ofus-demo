import type { Priority, Status } from "./types";

export const statusLabels: Record<Status, string> = {
  "To Do": "Yapılacak",
  "In Progress": "Devam Ediyor",
  Waiting: "Beklemede",
  Review: "İncelemede",
  Done: "Tamamlandı",
};

export const priorityLabels: Record<Priority, string> = {
  Low: "Düşük",
  Medium: "Orta",
  High: "Yüksek",
  Urgent: "Acil",
};

export const projectStatusLabels = {
  Active: "Aktif",
  "On hold": "Beklemede",
  "Wrapping up": "Tamamlanıyor",
} as const;
