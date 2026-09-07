"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { localDate, localTime } from "@/lib/task-selectors";
import type { BulkTaskAction, CompletionReport, DeletionReport } from "@/lib/types";
import type { TaskWorkspaceData } from "@/lib/supabase/tasks";
import { addTaskActivity as persistActivity, applyBulkTaskActions, cancelOrDeleteTask, completeTask as persistCompletion, createTask, listTaskActivities, updateTask as persistTaskUpdate } from "@/lib/supabase/tasks-client";
import { useWorkspace, WorkspaceContext, type WorkspaceContextValue } from "./app-provider";

const subscribeTimeZone = () => () => undefined;
const browserTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
const serverTimeZone = () => "UTC";

export function TaskDataProvider({ data, children }: { data: TaskWorkspaceData; children: ReactNode }) {
  const outer = useWorkspace();
  const [storedTasks, setTasks] = useState(data.tasks);
  const [sourceData, setSourceData] = useState(data);
  if (sourceData !== data) {
    setSourceData(data);
    setTasks(data.tasks);
  }
  const timeZone = useSyncExternalStore(subscribeTimeZone, browserTimeZone, serverTimeZone);
  const tasks = useMemo(() => storedTasks.map((task) => task.dueAt ? { ...task, dueDate: localDate(task.dueAt, timeZone), dueTime: localTime(task.dueAt, timeZone) } : task), [storedTasks, timeZone]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [completionId, setCompletionId] = useState<string | null>(null);
  const [deletionId, setDeletionId] = useState<string | null>(null);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [taskError, setTaskError] = useState("");
  const [taskSaving, setTaskSaving] = useState(false);
  const mutationTail = useRef<Promise<void>>(Promise.resolve());
  const pendingMutations = useRef(0);

  useEffect(() => {
    const open = () => setQuickAddOpen(true);
    window.addEventListener("twoofus:open-task-quick-add", open);
    return () => window.removeEventListener("twoofus:open-task-quick-add", open);
  }, []);

  const selectedTask = tasks.find((task) => task.id === selectedId) ?? null;
  const completionTask = tasks.find((task) => task.id === completionId) ?? null;
  const deletionTask = tasks.find((task) => task.id === deletionId) ?? null;

  const run = async (message: string, action: () => Promise<void>) => {
    pendingMutations.current += 1;
    setTaskSaving(true);
    setTaskError("");
    const queuedAction = mutationTail.current.then(action, action);
    mutationTail.current = queuedAction.catch(() => undefined);
    try { await queuedAction; }
    catch (error) {
      console.error(message, error);
      setTaskError(message);
      throw new Error(message);
    } finally {
      pendingMutations.current -= 1;
      if (!pendingMutations.current) setTaskSaving(false);
    }
  };

  const value = useMemo<WorkspaceContextValue>(() => ({
    ...outer,
    tasks,
    companies: data.companies,
    projects: data.projects,
    users: data.users,
    taskError,
    taskSaving,
    selectedTask,
    completionTask,
    deletionTask,
    quickAddOpen,
    setSelectedTask: (task) => {
      setSelectedId(task?.id ?? null);
      if (task && data.activityLimit) {
        void listTaskActivities(task.id).then((activity) => {
          setTasks((current) => current.map((item) => item.id === task.id ? { ...item, activity: [...new Map([...activity, ...(item.activity ?? [])].map((entry) => [entry.id, entry])).values()] } : item));
        }).catch(() => setTaskError("Görev hareketleri yüklenemedi."));
      }
    },
    setCompletionTask: (task) => setCompletionId(task?.id ?? null),
    setDeletionTask: (task) => setDeletionId(task?.id ?? null),
    setQuickAddOpen,
    clearTaskError: () => setTaskError(""),
    addTask: async (input) => run("Görev kaydedilemedi.", async () => {
      const created = await createTask(input);
      setTasks((current) => [created, ...current]);
      setQuickAddOpen(false);
    }),
    updateTask: async (id, patch) => run("Görev güncellenemedi.", async () => {
      const updated = await persistTaskUpdate(id, patch);
      setTasks((current) => current.map((task) => task.id === id ? { ...updated, activity: task.activity } : task));
    }),
    addTaskActivity: async (id, description, _userId, eventType = "task_updated") => run("Görev hareketi kaydedilemedi.", async () => {
      const activity = await persistActivity(id, eventType, description);
      setTasks((current) => current.map((task) => task.id === id ? { ...task, activity: [activity, ...(task.activity ?? [])] } : task));
    }),
    completeTask: async (id, report: CompletionReport) => run("Görev tamamlanamadı.", async () => {
      const result = await persistCompletion(id, report);
      setTasks((current) => current.map((task) => task.id === id ? { ...result.task, activity: [result.activity, ...(task.activity ?? [])] } : task));
      setCompletionId(null);
      setSelectedId(null);
    }),
    deleteTask: async (id, report: DeletionReport) => run("Görev iptal edilemedi.", async () => {
      const result = await cancelOrDeleteTask(id, report);
      setTasks((current) => result ? current.map((task) => task.id === id ? { ...result.task, activity: [result.activity, ...(task.activity ?? [])] } : task) : current.filter((task) => task.id !== id));
      setDeletionId(null);
      setSelectedId(null);
    }),
    bulkUpdateTasks: async (ids, action: BulkTaskAction) => {
      setTaskSaving(true);
      setTaskError("");
      try {
        const results = await applyBulkTaskActions(ids, action);
        const updated = results.filter((result): result is { id: string; task: NonNullable<typeof result.task> } => Boolean(result.task));
        const failedIds = results.filter((result) => !result.task).map((result) => result.id);
        if (updated.length) setTasks((current) => {
          const byId = new Map(updated.map((result) => [result.id, result.task]));
          return current.map((task) => {
            const result = byId.get(task.id);
            return result ? { ...result, reminders: task.reminders, activity: [...(result.activity ?? []), ...(task.activity ?? [])] } : task;
          });
        });
        return { updatedIds: updated.map((result) => result.id), failedIds };
      } catch (error) {
        console.error("Toplu görev işlemi başlatılamadı.", error);
        return { updatedIds: [], failedIds: ids };
      } finally {
        setTaskSaving(false);
      }
    },
  }), [outer, tasks, data, taskError, taskSaving, selectedTask, completionTask, deletionTask, quickAddOpen]);

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}
