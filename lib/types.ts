export type Status = "To Do" | "In Progress" | "Waiting" | "Review" | "Done";
export type Priority = "Low" | "Medium" | "High" | "Urgent";
export type TaskSize = "S" | "M" | "L" | "XL";
export type ReminderPreset = "one_hour_before" | "six_hours_before" | "one_day_before" | "three_days_before" | "five_days_before" | "three_hours_before" | "at_deadline";

export type User = {
  id: string;
  name: string;
  firstName: string;
  initials: string;
  avatarUrl?: string | null;
  role: string;
  color: string;
};

export type Company = {
  id: string;
  name: string;
  color: string;
  contactName: string;
  phone: string;
  email: string;
  website: string;
  notes: string;
};

export type CompanyInput = Omit<Company, "id" | "color">;

export type Project = {
  id: string;
  name: string;
  companyId: string;
  status: "Active" | "On hold" | "Wrapping up";
  progress: number;
  memberIds: string[];
  description: string;
  notes: string;
};

export type ProjectInput = Pick<Project, "name" | "companyId" | "status" | "description" | "notes">;

export type ChecklistItem = { id: string; label: string; done: boolean };

export type CompletionChecklist = {
  delivered: boolean;
  feedbackReceived: boolean;
  revisionsCompleted: boolean;
  successfullyClosed: boolean;
};

export type TaskActivity = {
  id: string;
  description: string;
  userId: string;
  createdAt: string;
  eventType?: string;
  metadata?: Record<string, unknown>;
};

export type WorkspaceActivity = TaskActivity & {
  entityType: string;
  entityId: string;
};

export type MushroomNotePriority = 1 | 2 | 3;

export type MushroomBoardNote = {
  id: string;
  content: string;
  noteDate: string;
  priority: MushroomNotePriority;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type MushroomBoardNoteInput = Pick<MushroomBoardNote, "content" | "noteDate" | "priority">;

export type CompletionReport = {
  completedAt: string;
  completionChecklist: CompletionChecklist;
  resultNote: string;
  completionNote?: string;
};

export type DeletionReason = "Müşteri işi iptal etti" | "İş artık gerekli değil" | "Başka görevle birleştirildi" | "Yanlış eklendi" | "Diğer";

export type DeletionReport = {
  reason: DeletionReason;
  note?: string;
};

export type Task = {
  id: string;
  title: string;
  description: string;
  companyId: string;
  projectId: string;
  assigneeId: string;
  status: Status;
  priority: Priority;
  size: TaskSize;
  dueDate: string;
  dueTime?: string;
  dueAt?: string;
  createdAt: string;
  tags: string[];
  checklist: ChecklistItem[];
  notes?: string;
  completedAt?: string;
  completionChecklist?: CompletionChecklist;
  resultNote?: string;
  completionNote?: string;
  activity?: TaskActivity[];
  cancelledAt?: string;
  deletionReason?: Exclude<DeletionReason, "Yanlış eklendi">;
  deletionNote?: string;
  reminders?: ReminderPreset[];
};

export type TaskInput = Pick<Task, "title" | "description" | "companyId" | "projectId" | "assigneeId" | "status" | "priority" | "size" | "dueDate" | "tags" | "checklist" | "notes"> & { dueTime: string; reminders: ReminderPreset[] };

export type TaskUpdate = Partial<TaskInput>;

export type BulkTaskAction =
  | { type: "assignee"; assigneeId: string }
  | { type: "due_date"; dueDate: string; dueTime: string }
  | { type: "status"; status: Exclude<Status, "Done"> }
  | { type: "priority"; priority: Priority }
  | { type: "cancel"; reason: Exclude<DeletionReason, "Yanlış eklendi">; note?: string };

export type BulkTaskResult = {
  updatedIds: string[];
  failedIds: string[];
};

export type NotificationType = "task_created" | "task_assigned" | "deadline_soon" | "task_updated" | "task_completed" | "project_updated";

export type WorkNotification = {
  id: string;
  type: NotificationType;
  title: string;
  companyId?: string;
  projectId?: string;
  taskId?: string;
  userId: string;
  createdAt: string;
  read: boolean;
};

export const sizePoints: Record<TaskSize, number> = { S: 1, M: 2, L: 4, XL: 8 };
