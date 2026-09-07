"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { BulkTaskAction, BulkTaskResult, Company, CompanyInput, CompletionReport, DeletionReport, Project, Task, TaskInput, User, WorkNotification } from "@/lib/types";

export type WorkspaceContextValue = {
  tasks: Task[];
  companies: Company[];
  projects: Project[];
  users: User[];
  notifications: WorkNotification[];
  taskError: string;
  taskSaving: boolean;
  selectedTask: Task | null;
  quickAddOpen: boolean;
  sidebarCollapsed: boolean;
  mobileNavOpen: boolean;
  completionTask: Task | null;
  deletionTask: Task | null;
  setSelectedTask: (task: Task | null) => void;
  setQuickAddOpen: (open: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setMobileNavOpen: (open: boolean) => void;
  setCompletionTask: (task: Task | null) => void;
  setDeletionTask: (task: Task | null) => void;
  addTask: (task: TaskInput) => void | Promise<void>;
  updateTask: (id: string, update: Partial<Task>) => void | Promise<void>;
  addTaskActivity: (id: string, description: string, userId?: string, eventType?: string) => void | Promise<void>;
  completeTask: (id: string, report: CompletionReport) => void | Promise<void>;
  deleteTask: (id: string, report: DeletionReport) => void | Promise<void>;
  bulkUpdateTasks: (ids: string[], action: BulkTaskAction) => Promise<BulkTaskResult>;
  clearTaskError: () => void;
  toggleNotificationRead: (id: string) => void;
  clearNotification: (id: string) => void;
  addCompany: (input: CompanyInput) => Company;
  updateCompany: (id: string, input: CompanyInput) => void;
  deleteCompany: (id: string) => void;
};

export const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [projects] = useState<Project[]>([]);
  const [users] = useState<User[]>([]);
  const [notifications, setNotifications] = useState<WorkNotification[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [completionId, setCompletionId] = useState<string | null>(null);
  const [deletionId, setDeletionId] = useState<string | null>(null);

  const selectedTask = tasks.find((task) => task.id === selectedId) ?? null;
  const completionTask = tasks.find((task) => task.id === completionId) ?? null;
  const deletionTask = tasks.find((task) => task.id === deletionId) ?? null;
  const value = useMemo<WorkspaceContextValue>(() => ({
    tasks,
    companies,
    projects,
    users,
    notifications,
    taskError: "",
    taskSaving: false,
    selectedTask,
    quickAddOpen,
    sidebarCollapsed,
    mobileNavOpen,
    completionTask,
    deletionTask,
    setSelectedTask: (task) => setSelectedId(task?.id ?? null),
    setQuickAddOpen,
    setSidebarCollapsed,
    setMobileNavOpen,
    setCompletionTask: (task) => setCompletionId(task?.id ?? null),
    setDeletionTask: (task) => setDeletionId(task?.id ?? null),
    addTask: (input) => {
      const createdAt = new Date().toISOString();
      const task: Task = { ...input, id: `local-task-${crypto.randomUUID()}`, createdAt };
      setTasks((current) => [{ ...task, activity: [{ id: `activity-${crypto.randomUUID()}`, description: "Görev oluşturuldu", userId: task.assigneeId, createdAt }] }, ...current]);
      setNotifications((current) => [{
        id: `notification-${task.id}`,
        type: "task_created",
        title: `Yeni görev oluşturuldu: ${task.title}`,
        companyId: task.companyId,
        projectId: task.projectId,
        taskId: task.id,
        userId: task.assigneeId,
        createdAt,
        read: false,
      }, ...current]);
    },
    updateTask: (id, update) => setTasks((current) => current.map((task) => task.id === id ? { ...task, ...update } : task)),
    addTaskActivity: (id, description, userId, eventType) => setTasks((current) => current.map((task) => task.id === id ? { ...task, activity: [...(task.activity ?? []), { id: `activity-${crypto.randomUUID()}`, description, userId: userId ?? task.assigneeId, createdAt: new Date().toISOString(), eventType }] } : task)),
    completeTask: (id, report) => {
      const completed = tasks.find((task) => task.id === id);
      if (!completed) return;
      const now = new Date().toISOString();
      setTasks((current) => current.map((task) => task.id === id ? {
        ...task,
        ...report,
        status: "Done",
        activity: [...(task.activity ?? []), { id: `activity-${crypto.randomUUID()}`, description: "Görev tamamlandı", userId: task.assigneeId, createdAt: now }],
      } : task));
      setNotifications((current) => [{ id: `notification-completed-${id}-${Date.now()}`, type: "task_completed", title: `Görev tamamlandı: ${completed.title}`, companyId: completed.companyId, projectId: completed.projectId, taskId: id, userId: completed.assigneeId, createdAt: now, read: false }, ...current]);
      setCompletionId(null);
    },
    deleteTask: (id, report) => {
      if (report.reason === "Yanlış eklendi") {
        setTasks((current) => current.filter((task) => task.id !== id));
      } else {
        const now = new Date().toISOString();
        const reason = report.reason;
        setTasks((current) => current.map((task) => task.id === id ? {
          ...task,
          cancelledAt: now.slice(0, 10),
          deletionReason: reason,
          deletionNote: report.note,
          activity: [...(task.activity ?? []),
            { id: `activity-${crypto.randomUUID()}`, description: "Görev iptal edildi", userId: task.assigneeId, createdAt: now },
            { id: `activity-${crypto.randomUUID()}`, description: `Silinme nedeni: ${report.reason}`, userId: task.assigneeId, createdAt: now },
          ],
        } : task));
      }
      setSelectedId((current) => current === id ? null : current);
      setDeletionId(null);
    },
    bulkUpdateTasks: async (ids, action) => {
      const now = new Date().toISOString();
      const descriptions: Record<BulkTaskAction["type"], string> = { assignee: "Sorumlu değiştirildi", due_date: "Son tarih güncellendi", status: "Durum değiştirildi", priority: "Öncelik değiştirildi", cancel: "Görev iptal edildi" };
      setTasks((current) => current.map((task) => {
        if (!ids.includes(task.id)) return task;
        const patch: Partial<Task> = action.type === "assignee" ? { assigneeId: action.assigneeId }
          : action.type === "due_date" ? { dueDate: action.dueDate, dueTime: action.dueTime }
          : action.type === "status" ? { status: action.status }
          : action.type === "priority" ? { priority: action.priority }
          : { status: "To Do", cancelledAt: now.slice(0, 10), deletionReason: action.reason, deletionNote: action.note };
        return { ...task, ...patch, activity: [{ id: `activity-${crypto.randomUUID()}`, description: descriptions[action.type], userId: task.assigneeId, createdAt: now, eventType: action.type === "cancel" ? "task_cancelled" : `${action.type}_changed` }, ...(task.activity ?? [])] };
      }));
      return { updatedIds: ids, failedIds: [] };
    },
    toggleNotificationRead: (id) => setNotifications((current) => current.map((item) => item.id === id ? { ...item, read: !item.read } : item)),
    clearNotification: (id) => setNotifications((current) => current.filter((item) => item.id !== id)),
    addCompany: (input) => {
      const company: Company = {
        ...input,
        id: `local-company-${crypto.randomUUID()}`,
        color: ["#6d5bd0", "#d0647c", "#248f8d", "#c47a38"][companies.length % 4],
      };
      setCompanies((current) => [...current, company]);
      return company;
    },
    updateCompany: (id, input) => setCompanies((current) => current.map((company) => company.id === id ? { ...company, ...input } : company)),
    deleteCompany: (id) => setCompanies((current) => current.filter((company) => company.id !== id)),
    clearTaskError: () => undefined,
  }), [tasks, companies, projects, users, notifications, selectedTask, completionTask, deletionTask, quickAddOpen, sidebarCollapsed, mobileNavOpen]);

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error("useWorkspace must be used inside AppProvider");
  return context;
}
