import type { Task } from "./types";

export function getProjectMetrics(projectId: string, tasks: Task[]) {
  const projectTasks = tasks.filter((task) => task.projectId === projectId && !task.cancelledAt);
  const completedCount = projectTasks.filter((task) => task.status === "Done").length;

  return {
    progress: projectTasks.length ? Math.round(completedCount / projectTasks.length * 100) : 0,
    memberIds: [...new Set(projectTasks.map((task) => task.assigneeId).filter(Boolean))],
  };
}
