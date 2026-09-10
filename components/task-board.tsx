"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { CalendarDays, ChevronDown, GripVertical, ListChecks } from "lucide-react";
import Link from "next/link";
import type { Status, Task } from "@/lib/types";
import { statusLabels } from "@/lib/i18n";
import { companyFor, formatDate, isOverdue } from "@/lib/utils";
import { useWorkspace } from "./app-provider";
import { PriorityBadge } from "./badges";
import { ThemedSelect } from "./themed-select";
import { UserAvatar } from "./user-avatar";
import { toast } from "./toast";
import { sizePoints } from "@/lib/types";
import "./task-board.css";

type BoardStatus = "To Do" | "In Progress" | "Review" | "Done";
type DragState = { taskId: string; overStatus: BoardStatus | null; overTaskId: string | null };

const columns: { status: BoardStatus; label: string }[] = [
  { status: "To Do", label: "Yapılacak" },
  { status: "In Progress", label: "Devam ediyor" },
  { status: "Review", label: "İncelemede" },
  { status: "Done", label: "Tamamlandı" },
];
const presentedStatus = (status: Status): BoardStatus => status === "Waiting" ? "In Progress" : status;
const moveableStatuses: Status[] = ["To Do", "In Progress", "Waiting", "Review"];

export type TaskBoardProps = {
  tasks?: Task[];
  dashboard?: boolean;
  manual?: boolean;
  emptyMessage?: string;
};

export function TaskBoard({ tasks: suppliedTasks, dashboard = false, manual = true, emptyMessage = "Bu kapsamda görev yok." }: TaskBoardProps) {
  const workspace = useWorkspace();
  const tasks = useMemo(() => suppliedTasks ?? workspace.tasks.filter((task) => !task.cancelledAt), [suppliedTasks, workspace.tasks]);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [order, setOrder] = useState<string[]>(() => tasks.map((task) => task.id));
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const pointerRef = useRef<{ task: Task; element: HTMLElement; x: number; y: number; offsetX: number; offsetY: number; active: boolean } | null>(null);
  const cancelKeyRef = useRef<((event: KeyboardEvent) => void) | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const ghostRef = useRef<HTMLElement | null>(null);
  const restoreGripFocus = useRef<{ taskId: string; targetStatus: BoardStatus | null } | null>(null);
  const touchTap = useRef<{ taskId: string; pointerId: number; x: number; y: number } | null>(null);
  const suppressCardClick = useRef<string | null>(null);

  const setDragState = (value: DragState | null) => { dragRef.current = value; setDrag(value); };
  const orderedTasks = useMemo(() => {
    if (!manual) return tasks;
    const rank = new Map(order.map((id, index) => [id, index]));
    return [...tasks].sort((a, b) => (rank.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (rank.get(b.id) ?? Number.MAX_SAFE_INTEGER));
  }, [tasks, order, manual]);

  const move = async (task: Task, status: BoardStatus, beforeId: string | null, restoreFocus = false) => {
    if (task.status === "Done" && status !== "Done") return;
    const currentPresentation = presentedStatus(task.status);
    const nextStatus: Status = status === currentPresentation ? task.status : status;
    if (nextStatus === "Done" && task.status !== "Done") {
      workspace.setCompletionTask(task);
      return;
    }
    if (restoreFocus) restoreGripFocus.current = { taskId: task.id, targetStatus: presentedStatus(nextStatus) };
    const previous = order;
    setOrder((current) => {
      const next = current.filter((id) => id !== task.id);
      const target = beforeId ? next.indexOf(beforeId) : -1;
      next.splice(target < 0 ? next.length : target, 0, task.id);
      return next;
    });
    if (nextStatus !== task.status) {
      try { await workspace.updateTask(task.id, { status: nextStatus }); toast.show("taskStatusChanged"); }
      catch {
        if (restoreFocus) restoreGripFocus.current = { taskId: task.id, targetStatus: null };
        setOrder(previous);
        toast.show("saveError", { actionLabel: "Tekrar dene", onAction: () => { void move(task, status, beforeId); }, dedupeKey: "task-save-error" });
      }
    }
  };

  const pointerMove = (event: PointerEvent) => {
    const pending = pointerRef.current;
    if (!pending) return;
    if (!pending.active && Math.hypot(event.clientX - pending.x, event.clientY - pending.y) < 6) return;
    if (!pending.active) {
      pending.active = true;
      suppressCardClick.current = pending.task.id;
      const ghost = pending.element.cloneNode(true) as HTMLElement;
      ghost.querySelectorAll<HTMLElement>("[id]").forEach((element) => element.removeAttribute("id"));
      ghost.querySelectorAll<HTMLElement>("[aria-controls]").forEach((element) => element.removeAttribute("aria-controls"));
      ghost.removeAttribute("id");
      ghost.removeAttribute("aria-controls");
      ghost.setAttribute("aria-hidden", "true");
      ghost.inert = true;
      ghost.classList.add("ofus-board-drag-ghost");
      ghost.style.width = `${pending.element.getBoundingClientRect().width}px`;
      document.body.append(ghost);
      ghostRef.current = ghost;
      setDragState({ taskId: pending.task.id, overStatus: presentedStatus(pending.task.status), overTaskId: pending.task.id });
    }
    if (ghostRef.current) ghostRef.current.style.transform = `translate3d(${event.clientX - pending.offsetX}px,${event.clientY - pending.offsetY}px,0) rotate(-2deg)`;
    const current = dragRef.current;
    if (!current) return;
    const target = document.elementFromPoint(event.clientX, event.clientY) as HTMLElement | null;
    const column = target?.closest<HTMLElement>("[data-board-status]");
    if (!column) { setDragState({ ...current, overStatus: null, overTaskId: null }); return; }
    const card = target?.closest<HTMLElement>("[data-board-task]");
    let beforeId = card?.dataset.boardTask ?? null;
    if (card && event.clientY > card.getBoundingClientRect().top + card.getBoundingClientRect().height / 2) beforeId = card.nextElementSibling instanceof HTMLElement ? card.nextElementSibling.dataset.boardTask ?? null : null;
    const scroll = target?.closest<HTMLElement>(".ofus-board-column-body,.ofus-task-board-scroll");
    if (scroll) { const rect = scroll.getBoundingClientRect(); if (event.clientY < rect.top + 36) scroll.scrollTop -= 12; else if (event.clientY > rect.bottom - 36) scroll.scrollTop += 12; }
    const boardScroll = target?.closest<HTMLElement>(".ofus-task-board-scroll");
    if (boardScroll) { const rect = boardScroll.getBoundingClientRect(); if (event.clientX < rect.left + 48) boardScroll.scrollLeft -= 16; else if (event.clientX > rect.right - 48) boardScroll.scrollLeft += 16; }
    const next = { ...current, overStatus: column.dataset.boardStatus as BoardStatus, overTaskId: beforeId };
    if (next.overStatus !== current.overStatus || next.overTaskId !== current.overTaskId) setDragState(next);
  };

  const endPointer = (event: PointerEvent) => {
    const current = dragRef.current;
    cleanupRef.current?.();
    if (!current || !current.overStatus || event.type === "pointercancel") return;
    const task = tasks.find((item) => item.id === current.taskId);
    if (task && current.overTaskId !== task.id) void move(task, current.overStatus, current.overTaskId);
  };
  const cancelPointer = () => {
    cleanupRef.current?.();
  };
  const startPointer = (event: ReactPointerEvent<HTMLElement>, task: Task) => {
    if (!manual || event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (event.pointerType === "touch" && !target.closest("[data-drag-handle]")) {
      touchTap.current = { taskId: task.id, pointerId: event.pointerId, x: event.clientX, y: event.clientY };
      return;
    }
    if (target.closest("button,a,input,select") && !target.closest("[data-drag-handle],.ofus-board-title")) return;
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    pointerRef.current = { task, element: event.currentTarget, x: event.clientX, y: event.clientY, offsetX: event.clientX - rect.left, offsetY: event.clientY - rect.top, active: false };
    document.addEventListener("pointermove", pointerMove);
    document.addEventListener("pointerup", endPointer);
    document.addEventListener("pointercancel", cancelPointer);
    cancelKeyRef.current = (keyEvent) => { if (keyEvent.key === "Escape") cancelPointer(); };
    window.addEventListener("keydown", cancelKeyRef.current);
    window.addEventListener("blur", cancelPointer);
    cleanupRef.current = () => {
      document.removeEventListener("pointermove", pointerMove);
      document.removeEventListener("pointerup", endPointer);
      document.removeEventListener("pointercancel", cancelPointer);
      if (cancelKeyRef.current) window.removeEventListener("keydown", cancelKeyRef.current);
      window.removeEventListener("blur", cancelPointer);
      cancelKeyRef.current = null;
      ghostRef.current?.remove();
      ghostRef.current = null;
      pointerRef.current = null;
      dragRef.current = null;
      setDrag(null);
      cleanupRef.current = null;
      window.setTimeout(() => { suppressCardClick.current = null; }, 0);
    };
  };

  const trackTouch = (event: ReactPointerEvent<HTMLElement>, task: Task) => {
    const tap = touchTap.current;
    if (event.pointerType !== "touch" || !tap || tap.taskId !== task.id || tap.pointerId !== event.pointerId) return;
    if (Math.hypot(event.clientX - tap.x, event.clientY - tap.y) < 6) return;
    touchTap.current = null;
    suppressCardClick.current = task.id;
    window.setTimeout(() => { if (suppressCardClick.current === task.id) suppressCardClick.current = null; }, 500);
  };

  const openFromPointer = (event: ReactPointerEvent<HTMLElement>, task: Task) => {
    const pointer = pointerRef.current;
    if (event.pointerType === "touch" && !pointer) {
      const tap = touchTap.current;
      touchTap.current = null;
      if (!tap || tap.taskId !== task.id || tap.pointerId !== event.pointerId || Math.hypot(event.clientX - tap.x, event.clientY - tap.y) >= 6) return;
    }
    if ((!pointer || !pointer.active) && !(event.target as HTMLElement).closest("button,a,input,select,[role='button']")) workspace.setSelectedTask(task);
  };

  useEffect(() => () => cleanupRef.current?.(), []);
  useLayoutEffect(() => {
    const pending = restoreGripFocus.current;
    if (!pending) return;
    const current = tasks.find((task) => task.id === pending.taskId);
    if (!current || (pending.targetStatus && presentedStatus(current.status) !== pending.targetStatus)) return;
    const grip = document.querySelector<HTMLButtonElement>(`[data-board-task="${CSS.escape(pending.taskId)}"] [data-drag-handle]`);
    if (!grip) return;
    grip.focus({ preventScroll: true });
    restoreGripFocus.current = null;
  }, [tasks, order]);

  const keyboardMove = (event: ReactKeyboardEvent, task: Task) => {
    if (!manual || !event.altKey) return;
    const currentStatus = presentedStatus(task.status);
    const columnIndex = columns.findIndex((column) => column.status === currentStatus);
    const columnTasks = orderedTasks.filter((item) => presentedStatus(item.status) === currentStatus);
    const taskIndex = columnTasks.findIndex((item) => item.id === task.id);
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      if (task.status === "Done") return;
      const nextIndex = columnIndex + (event.key === "ArrowLeft" ? -1 : 1);
      if (nextIndex < 0 || nextIndex >= columns.length) return;
      event.preventDefault();
      void move(task, columns[nextIndex].status, null, true);
    } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      const sibling = columnTasks[taskIndex + (event.key === "ArrowUp" ? -1 : 1)];
      if (!sibling) return;
      event.preventDefault();
      const beforeId = event.key === "ArrowUp" ? sibling.id : columnTasks[taskIndex + 2]?.id ?? null;
      void move(task, currentStatus, beforeId, true);
    }
  };

  return <div className="ofus-task-board-scroll" data-dashboard={dashboard || undefined}>
    <div className="ofus-task-board" aria-label={dashboard ? "Genel bakış görev panosu" : "Görev panosu"}>
      {columns.map((column) => {
        const items = orderedTasks.filter((task) => presentedStatus(task.status) === column.status);
        return <section key={column.status} className={`ofus-board-column ${drag?.overStatus === column.status ? "is-over" : ""}`} data-board-status={column.status}>
          <header className="ofus-board-column-head"><span className="ofus-board-dot" /><h2>{column.label}</h2><span>{items.length}</span></header>
          <div className="ofus-board-column-body">
            {!items.length ? <div className="ofus-board-column-empty">{emptyMessage}</div> : null}
            {items.map((task) => {
              const open = expanded.has(task.id);
              const company = companyFor(task.companyId, workspace.companies);
              const project = workspace.projects.find((item) => item.id === task.projectId);
              const checked = task.checklist.filter((item) => item.done).length;
              return <article key={task.id} data-board-task={task.id} className={`ofus-board-card ${open ? "is-expanded" : ""} ${drag?.taskId === task.id ? "is-dragging" : ""}`} onPointerDown={(event) => startPointer(event, task)} onPointerMove={(event) => trackTouch(event, task)} onPointerUp={(event) => openFromPointer(event, task)} onPointerCancel={() => { touchTap.current = null; }}>
                <div className="ofus-board-card-top"><PriorityBadge priority={task.priority} /><button type="button" data-drag-handle className="ofus-board-grip" disabled={!manual} onKeyDown={(event) => keyboardMove(event, task)} aria-label={`${task.title} görevini taşı`}><GripVertical size={16} /></button></div>
                <button type="button" className="ofus-board-title" onClick={() => { if (suppressCardClick.current === task.id) { suppressCardClick.current = null; return; } workspace.setSelectedTask(task); }}>{task.title}</button>
                <p className="ofus-board-project"><span style={{ color: company.color }}>●</span>{project?.name ?? "—"}</p>
                <div className="ofus-board-summary"><span className={isOverdue(task) ? "is-overdue" : ""}><CalendarDays size={14} />{formatDate(task.dueDate)}{task.dueTime ? ` · ${task.dueTime}` : ""}</span><button type="button" className="ofus-board-expand" aria-expanded={open} aria-controls={`board-details-${task.id}`} onClick={() => setExpanded((current) => { const next = new Set(current); if (next.has(task.id)) next.delete(task.id); else next.add(task.id); return next; })} aria-label={`${task.title} ayrıntılarını ${open ? "kapat" : "aç"}`}><ChevronDown size={17} /></button></div>
                <div id={`board-details-${task.id}`} className="ofus-board-details" inert={!open} aria-hidden={!open}><div className="ofus-board-details-inner">
                  <p className="ofus-board-company">{company.name}</p>
                  <div className="ofus-board-meta"><UserAvatar userId={task.assigneeId} size="sm" showName /><span><ListChecks size={14} />{checked}/{task.checklist.length}</span><span className="ofus-board-size">{task.size}</span></div>
                  <ThemedSelect ariaLabel={`${task.title} durumu`} value={task.status} disabled={workspace.taskSaving || task.status === "Done"} className="ofus-board-status" options={(task.status === "Done" ? ["Done"] : [...moveableStatuses, "Done"]).map((value) => ({ value, label: statusLabels[value as Status] }))} onValueChange={(value) => { if (value === "Done") workspace.setCompletionTask(task); else void Promise.resolve(workspace.updateTask(task.id, { status: value as Status })).then(() => toast.show("taskStatusChanged")).catch(() => undefined); }} />
                </div></div>
              </article>;
            })}
          </div>
          <footer className="ofus-board-column-footer"><span>{items.length} görev · {items.reduce((sum, task) => sum + sizePoints[task.size], 0)} puan</span>{column.status === "Done" && dashboard ? <Link href="/tasks?view=list&scope=completed">Listeyi gör</Link> : column.status !== "Done" ? <button type="button" onClick={() => { window.dispatchEvent(new CustomEvent("ofus:task-create", { detail: { status: column.status } })); workspace.setQuickAddOpen(true); }}>+ Görev ekle</button> : null}</footer>
        </section>;
      })}
    </div>
  </div>;
}
