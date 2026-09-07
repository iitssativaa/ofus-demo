"use client";

import type { BulkTaskAction, CompletionReport, DeletionReport, ReminderPreset, TaskInput, TaskUpdate } from "@/lib/types";
import type { Database, Json } from "./database.types";
import { createClient } from "./client";
import { cancellationToDatabase, priorityToDatabase, sizeToDatabase, statusToDatabase, taskActivityFromRow, taskFromRow } from "./task-models";
import { deadlineToIso, localDate, localTime } from "@/lib/task-selectors";

type TaskUpdateRow = Database["public"]["Tables"]["tasks"]["Update"];
type ActivityMetadata = Record<string, string | number | boolean | null>;

async function context() {
  const supabase = createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Oturum bulunamadı.");
  const { data: membership, error: membershipError } = await supabase.from("workspace_members").select("workspace_id").eq("user_id", user.id).order("joined_at").limit(1).single();
  if (membershipError || !membership) throw new Error("Çalışma alanı üyeliği bulunamadı.");
  return { supabase, userId: user.id, workspaceId: membership.workspace_id };
}

const nullable = (value: string | undefined) => value?.trim() || null;
const dueAt = (dateValue: string, timeValue: string) => {
  const value = deadlineToIso(dateValue, timeValue);
  if (!value) throw new Error("Geçerli bir son tarih ve saat seçmelisiniz.");
  return value;
};

async function validateRelations(supabase: ReturnType<typeof createClient>, workspaceId: string, projectId: string, companyId: string, assigneeId: string) {
  const [projectResult, memberResult] = await Promise.all([
    supabase.from("projects").select("id, company_id").eq("workspace_id", workspaceId).eq("id", projectId).single(),
    supabase.from("workspace_members").select("user_id").eq("workspace_id", workspaceId).eq("user_id", assigneeId).single(),
  ]);
  if (projectResult.error || !projectResult.data) throw new Error("Seçilen proje bulunamadı.");
  if (projectResult.data.company_id !== companyId) throw new Error("Seçilen proje bu firmaya bağlı değil.");
  if (memberResult.error || !memberResult.data) throw new Error("Seçilen sorumlu bu çalışma alanında değil.");
}

async function insertActivity(supabase: ReturnType<typeof createClient>, taskId: string, eventType: string, description: string, metadata: ActivityMetadata = {}) {
  const { data, error } = await supabase.rpc("create_task_activity", {
    target_task_id: taskId,
    target_event_type: eventType,
    target_description: description,
    target_metadata: metadata as Json,
    action_request_id: crypto.randomUUID(),
  });
  if (error) throw error;
  return taskActivityFromRow(data);
}

async function persistReminders(supabase: ReturnType<typeof createClient>, taskId: string, reminders: ReminderPreset[]) {
  const { data, error } = await supabase.rpc("set_task_reminders", {
    target_task_id: taskId,
    reminder_presets: reminders,
  });
  if (error) throw error;
  return data.map((row) => row.preset as ReminderPreset);
}

async function listReminders(supabase: ReturnType<typeof createClient>, workspaceId: string, taskId: string) {
  const { data, error } = await supabase.from("task_reminders").select("preset").eq("workspace_id", workspaceId).eq("task_id", taskId).neq("status", "cancelled");
  if (error) throw error;
  return data.map((row) => row.preset as ReminderPreset);
}

export async function createTask(input: TaskInput) {
  const { supabase, userId, workspaceId } = await context();
  await validateRelations(supabase, workspaceId, input.projectId, input.companyId, input.assigneeId);
  const { data, error } = await supabase.from("tasks").insert({
    workspace_id: workspaceId,
    created_by: userId,
    assignee_id: input.assigneeId,
    company_id: input.companyId,
    project_id: input.projectId,
    title: input.title.trim(),
    description: input.description.trim(),
    status: statusToDatabase[input.status],
    priority: priorityToDatabase[input.priority],
    size: sizeToDatabase[input.size],
    due_at: dueAt(input.dueDate, input.dueTime),
    tags: input.tags,
    checklist: input.checklist as Json,
    notes: nullable(input.notes),
  }).select().single();
  if (error) throw error;
  let reminders: ReminderPreset[];
  try {
    reminders = await persistReminders(supabase, data.id, input.reminders);
  } catch (reminderError) {
    await supabase.rpc("delete_mistaken_task", { target_task_id: data.id });
    throw reminderError;
  }
  let activity;
  try {
    activity = await insertActivity(supabase, data.id, "task_created", "Görev oluşturuldu");
  } catch (activityError) {
    await supabase.rpc("delete_mistaken_task", { target_task_id: data.id });
    throw activityError;
  }
  return taskFromRow(data, [activity], reminders);
}

export async function updateTask(id: string, patch: TaskUpdate) {
  if (patch.status === "Done") throw new Error("Görevi tamamlamak için tamamlama akışını kullanın.");
  const { supabase, workspaceId } = await context();
  const update: TaskUpdateRow = {};
  if (patch.title !== undefined) update.title = patch.title.trim();
  if (patch.description !== undefined) update.description = patch.description.trim();
  if (patch.assigneeId !== undefined) {
    const member = await supabase.from("workspace_members").select("user_id").eq("workspace_id", workspaceId).eq("user_id", patch.assigneeId).single();
    if (member.error || !member.data) throw new Error("Seçilen sorumlu bu çalışma alanında değil.");
    update.assignee_id = patch.assigneeId;
  }
  if (patch.status !== undefined) update.status = statusToDatabase[patch.status];
  if (patch.priority !== undefined) update.priority = priorityToDatabase[patch.priority];
  if (patch.size !== undefined) update.size = sizeToDatabase[patch.size];
  if (patch.dueDate !== undefined || patch.dueTime !== undefined) {
    let currentDueAt: string | null = null;
    if (patch.dueDate === undefined || patch.dueTime === undefined) {
      const current = await supabase.from("tasks").select("due_at").eq("workspace_id", workspaceId).eq("id", id).single();
      if (current.error || !current.data) throw new Error("Görev bulunamadı.");
      currentDueAt = current.data.due_at;
    }
    const dateValue = patch.dueDate ?? (currentDueAt ? localDate(currentDueAt) : "");
    const timeValue = patch.dueTime ?? (currentDueAt ? localTime(currentDueAt) : "");
    update.due_at = dueAt(dateValue, timeValue);
  }
  if (patch.tags !== undefined) update.tags = patch.tags;
  if (patch.checklist !== undefined) update.checklist = patch.checklist as Json;
  if (patch.notes !== undefined) update.notes = nullable(patch.notes);

  if (patch.projectId !== undefined || patch.companyId !== undefined) {
    const current = await supabase.from("tasks").select("project_id, company_id").eq("workspace_id", workspaceId).eq("id", id).single();
    if (current.error || !current.data) throw new Error("Görev bulunamadı.");
    const projectId = patch.projectId ?? current.data.project_id;
    const project = await supabase.from("projects").select("id, company_id").eq("workspace_id", workspaceId).eq("id", projectId).single();
    if (project.error || !project.data) throw new Error("Seçilen proje bulunamadı.");
    const companyId = patch.companyId ?? project.data.company_id;
    if (project.data.company_id !== companyId) throw new Error("Seçilen proje bu firmaya bağlı değil.");
    update.project_id = projectId;
    update.company_id = companyId;
  }

  const taskQuery = Object.keys(update).length
    ? supabase.from("tasks").update(update).eq("workspace_id", workspaceId).eq("id", id).select().single()
    : supabase.from("tasks").select("*").eq("workspace_id", workspaceId).eq("id", id).single();
  const { data, error } = await taskQuery;
  if (error) throw error;
  const reminders = patch.reminders !== undefined
    ? await persistReminders(supabase, id, patch.reminders)
    : await listReminders(supabase, workspaceId, id);
  return taskFromRow(data, [], reminders);
}

export async function addTaskActivity(taskId: string, eventType: string, description: string, metadata: ActivityMetadata = {}) {
  const { supabase } = await context();
  return insertActivity(supabase, taskId, eventType, description, metadata);
}

export async function listTaskActivities(taskId: string) {
  const { supabase, workspaceId } = await context();
  const { data, error } = await supabase.from("task_activities").select("*").eq("workspace_id", workspaceId).eq("task_id", taskId).order("created_at", { ascending: false });
  if (error) throw error;
  return data.map(taskActivityFromRow);
}

async function applyBulkTaskActionWithContext(supabase: ReturnType<typeof createClient>, workspaceId: string, taskId: string, action: BulkTaskAction, requestId: string) {
  type BulkArgs = Database["public"]["Functions"]["apply_bulk_task_action"]["Args"];
  const args: BulkArgs = {
    target_task_id: taskId,
    action_type: action.type,
    action_request_id: requestId,
  };
  if (action.type === "assignee") args.target_assignee_id = action.assigneeId;
  if (action.type === "due_date") {
    const value = dueAt(action.dueDate, action.dueTime);
    args.target_due_at = value;
  }
  if (action.type === "status") args.target_status = statusToDatabase[action.status];
  if (action.type === "priority") args.target_priority = priorityToDatabase[action.priority];
  if (action.type === "cancel") {
    args.target_cancellation_reason = cancellationToDatabase[action.reason];
    args.target_cancellation_note = action.note?.trim() || undefined;
  }

  const { data, error } = await supabase.rpc("apply_bulk_task_action", args);
  if (error) throw error;
  const { data: activity } = await supabase.from("task_activities").select("*").eq("workspace_id", workspaceId).eq("request_id", requestId).maybeSingle();
  return taskFromRow(data, activity ? [taskActivityFromRow(activity)] : []);
}

export async function applyBulkTaskActions(taskIds: string[], action: BulkTaskAction) {
  const { supabase, workspaceId } = await context();
  return Promise.all(taskIds.map(async (id) => {
    try { return { id, task: await applyBulkTaskActionWithContext(supabase, workspaceId, id, action, crypto.randomUUID()) }; }
    catch (error) { console.error("Toplu görev işlemi başarısız oldu.", error); return { id, task: null }; }
  }));
}

export async function completeTask(taskId: string, report: CompletionReport) {
  const { supabase, workspaceId } = await context();
  const requestId = crypto.randomUUID();
  const { data, error } = await supabase.rpc("complete_task_secure", {
    target_task_id: taskId,
    target_completed_at: `${report.completedAt}T12:00:00.000Z`,
    target_delivered: report.completionChecklist.delivered,
    target_feedback_received: report.completionChecklist.feedbackReceived,
    target_revisions_completed: report.completionChecklist.revisionsCompleted,
    target_successfully_closed: report.completionChecklist.successfullyClosed,
    target_result_note: report.resultNote.trim(),
    target_completion_note: nullable(report.completionNote) ?? "",
    action_request_id: requestId,
  });
  if (error) throw error;
  const { data: activityRow, error: activityError } = await supabase.from("task_activities").select("*").eq("workspace_id", workspaceId).eq("request_id", requestId).single();
  if (activityError) throw activityError;
  const activity = taskActivityFromRow(activityRow);
  return { task: taskFromRow(data), activity };
}

export async function cancelOrDeleteTask(taskId: string, report: DeletionReport) {
  const { supabase, workspaceId } = await context();
  if (report.reason === "Yanlış eklendi") {
    const { error } = await supabase.rpc("delete_mistaken_task", { target_task_id: taskId });
    if (error) throw error;
    return null;
  }
  const requestId = crypto.randomUUID();
  const { data, error } = await supabase.rpc("cancel_task_secure", {
    target_task_id: taskId,
    target_cancellation_reason: cancellationToDatabase[report.reason],
    target_cancellation_note: nullable(report.note) ?? "",
    action_request_id: requestId,
  });
  if (error) throw error;
  const { data: activityRow, error: activityError } = await supabase.from("task_activities").select("*").eq("workspace_id", workspaceId).eq("request_id", requestId).single();
  if (activityError) throw activityError;
  const activity = taskActivityFromRow(activityRow);
  return { task: taskFromRow(data), activity };
}
