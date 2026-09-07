import type { Company, Project, Task, User, WorkspaceActivity } from "@/lib/types";
import { ensureAuthenticatedWorkspace } from "./bootstrap";
import { companyFromRow, projectFromRow } from "./business-models";
import { createClient } from "./server";
import { memberToUser, taskActivityFromRow, taskFromRow, workspaceActivityFromRow } from "./task-models";
import type { ReminderPreset } from "@/lib/types";

export type TaskWorkspaceData = {
  tasks: Task[];
  companies: Company[];
  projects: Project[];
  users: User[];
  workspaceActivities: WorkspaceActivity[];
  activityLimit?: number;
};

export async function listTaskWorkspaceData({ activityLimit }: { activityLimit?: number } = {}): Promise<TaskWorkspaceData> {
  const identity = await ensureAuthenticatedWorkspace();
  if (!identity) throw new Error("Oturum bulunamadı.");
  const supabase = await createClient();
  const activitiesQuery = supabase.from("task_activities").select("*").eq("workspace_id", identity.workspaceId).order("created_at", { ascending: false }).order("id", { ascending: false });

  const [tasksResult, activitiesResult, remindersResult, companiesResult, projectsResult, membersResult] = await Promise.all([
    supabase.from("tasks").select("*").eq("workspace_id", identity.workspaceId).order("created_at", { ascending: false }),
    activityLimit ? activitiesQuery.limit(activityLimit) : activitiesQuery,
    supabase.from("task_reminders").select("task_id, preset, status").eq("workspace_id", identity.workspaceId).neq("status", "cancelled"),
    supabase.from("companies").select("*").eq("workspace_id", identity.workspaceId).order("name"),
    supabase.from("projects").select("*").eq("workspace_id", identity.workspaceId).order("name"),
    supabase.from("workspace_members").select("user_id, role, joined_at").eq("workspace_id", identity.workspaceId).order("joined_at"),
  ]);

  if (tasksResult.error) throw tasksResult.error;
  if (activitiesResult.error) throw activitiesResult.error;
  if (remindersResult.error) throw remindersResult.error;
  if (companiesResult.error) throw companiesResult.error;
  if (projectsResult.error) throw projectsResult.error;
  if (membersResult.error) throw membersResult.error;

  const memberIds = membersResult.data.map((member) => member.user_id);
  const profilesResult = memberIds.length
    ? await supabase.from("profiles").select("id, display_name, avatar_url").in("id", memberIds)
    : { data: [], error: null };
  if (profilesResult.error) throw profilesResult.error;

  const profilesById = new Map(profilesResult.data.map((profile) => [profile.id, profile]));
  const activitiesByTask = new Map<string, ReturnType<typeof taskActivityFromRow>[]>();
  const workspaceActivities: WorkspaceActivity[] = [];
  for (const row of activitiesResult.data) {
    if (!row.task_id) {
      workspaceActivities.push(workspaceActivityFromRow(row));
      continue;
    }
    const items = activitiesByTask.get(row.task_id) ?? [];
    items.push(taskActivityFromRow(row));
    activitiesByTask.set(row.task_id, items);
  }
  const remindersByTask = new Map<string, ReminderPreset[]>();
  for (const row of remindersResult.data) {
    const items = remindersByTask.get(row.task_id) ?? [];
    const preset = row.preset as ReminderPreset;
    if (!items.includes(preset)) items.push(preset);
    remindersByTask.set(row.task_id, items);
  }

  return {
    activityLimit,
    workspaceActivities,
    tasks: tasksResult.data.map((row) => taskFromRow(row, activitiesByTask.get(row.id) ?? [], remindersByTask.get(row.id) ?? [])),
    companies: companiesResult.data.map(companyFromRow),
    projects: projectsResult.data.map(projectFromRow),
    users: membersResult.data.map((member, index) => {
      const profile = profilesById.get(member.user_id);
      return memberToUser(member.user_id, profile?.display_name ?? "Kullanıcı", member.role, index, profile?.avatar_url);
    }),
  };
}
