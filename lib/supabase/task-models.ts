import type { ChecklistItem, DeletionReason, Priority, ReminderPreset, Status, Task, TaskActivity, TaskSize, User, WorkspaceActivity } from "@/lib/types";
import type { Database, Json } from "./database.types";

export type TaskRow = Database["public"]["Tables"]["tasks"]["Row"];
export type TaskActivityRow = Database["public"]["Tables"]["task_activities"]["Row"];
export type TaskStatusRow = Database["public"]["Enums"]["task_status"];
export type TaskPriorityRow = Database["public"]["Enums"]["task_priority"];
export type TaskSizeRow = Database["public"]["Enums"]["task_size"];
export type CancellationReasonRow = Database["public"]["Enums"]["cancellation_reason"];

export const statusFromDatabase: Record<TaskStatusRow, Status> = {
  todo: "To Do",
  in_progress: "In Progress",
  waiting: "Waiting",
  review: "Review",
  completed: "Done",
  cancelled: "To Do",
};

export const statusToDatabase: Record<Status, Exclude<TaskStatusRow, "cancelled">> = {
  "To Do": "todo",
  "In Progress": "in_progress",
  Waiting: "waiting",
  Review: "review",
  Done: "completed",
};

export const priorityFromDatabase: Record<TaskPriorityRow, Priority> = { low: "Low", medium: "Medium", high: "High", urgent: "Urgent" };
export const priorityToDatabase: Record<Priority, TaskPriorityRow> = { Low: "low", Medium: "medium", High: "high", Urgent: "urgent" };
export const sizeFromDatabase: Record<TaskSizeRow, TaskSize> = { s: "S", m: "M", l: "L", xl: "XL" };
export const sizeToDatabase: Record<TaskSize, TaskSizeRow> = { S: "s", M: "m", L: "l", XL: "xl" };

export const cancellationFromDatabase: Record<CancellationReasonRow, Exclude<DeletionReason, "Yanlış eklendi">> = {
  client_cancelled: "Müşteri işi iptal etti",
  no_longer_needed: "İş artık gerekli değil",
  merged: "Başka görevle birleştirildi",
  other: "Diğer",
};

export const cancellationToDatabase: Record<Exclude<DeletionReason, "Yanlış eklendi">, CancellationReasonRow> = {
  "Müşteri işi iptal etti": "client_cancelled",
  "İş artık gerekli değil": "no_longer_needed",
  "Başka görevle birleştirildi": "merged",
  Diğer: "other",
};

function checklistFromJson(value: Json): ChecklistItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const id = typeof item.id === "string" ? item.id : "";
    const label = typeof item.label === "string" ? item.label : "";
    const done = typeof item.done === "boolean" ? item.done : false;
    return id && label ? [{ id, label, done }] : [];
  });
}

function metadataFromJson(value: Json): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export function taskActivityFromRow(row: TaskActivityRow): TaskActivity {
  return { id: row.id, description: row.description, userId: row.actor_id ?? "", createdAt: row.created_at, eventType: row.event_type, metadata: metadataFromJson(row.metadata) };
}

export function workspaceActivityFromRow(row: TaskActivityRow): WorkspaceActivity {
  return {
    ...taskActivityFromRow(row),
    entityType: row.entity_type,
    entityId: row.entity_id,
  };
}

export function taskFromRow(row: TaskRow, activity: TaskActivity[] = [], reminders: ReminderPreset[] = []): Task {
  const completed = row.status === "completed";
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    companyId: row.company_id,
    projectId: row.project_id,
    assigneeId: row.assignee_id ?? "",
    status: statusFromDatabase[row.status],
    priority: priorityFromDatabase[row.priority],
    size: sizeFromDatabase[row.size],
    dueDate: row.due_at?.slice(0, 10) ?? "",
    dueTime: row.due_at?.slice(11, 16) ?? "",
    dueAt: row.due_at ?? undefined,
    createdAt: row.created_at,
    tags: row.tags,
    checklist: checklistFromJson(row.checklist),
    notes: row.notes ?? undefined,
    completedAt: row.completed_at?.slice(0, 10),
    completionChecklist: completed ? { delivered: row.delivered, feedbackReceived: row.feedback_received, revisionsCompleted: row.revisions_completed, successfullyClosed: row.successfully_closed } : undefined,
    resultNote: row.result_note ?? undefined,
    completionNote: row.completion_note ?? undefined,
    cancelledAt: row.cancelled_at?.slice(0, 10),
    deletionReason: row.cancellation_reason ? cancellationFromDatabase[row.cancellation_reason] : undefined,
    deletionNote: row.cancellation_note ?? undefined,
    activity,
    reminders,
  };
}

const memberColors = ["#5b67d8", "#d36b4b", "#2b8a72", "#a85f8c", "#3780a8"];

export function memberToUser(id: string, displayName: string, role: string, index: number, avatarUrl?: string | null): User {
  const words = displayName.trim().split(/\s+/);
  return {
    id,
    name: displayName,
    firstName: words[0] || displayName,
    initials: words.slice(0, 2).map((word) => word[0]).join("").toLocaleUpperCase("tr-TR"),
    avatarUrl,
    role: role === "owner" ? "Çalışma alanı sahibi" : "Çalışma alanı üyesi",
    color: memberColors[index % memberColors.length],
  };
}
