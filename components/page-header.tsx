import type { ReactNode } from "react";

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description: string; actions?: ReactNode }) {
  return (
    <header className="mb-5 flex flex-wrap items-end justify-between gap-3 sm:mb-7">
      <div className="min-w-0">
        {eyebrow ? <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">{eyebrow}</p> : null}
        <h1 className="text-xl font-semibold tracking-[-0.025em] text-slate-950 sm:text-[28px]">{title}</h1>
        <p className="mt-1 hidden max-w-2xl text-sm text-slate-500 min-[430px]:block">{description}</p>
      </div>
      {actions ? <div className="flex w-full shrink-0 items-center justify-end gap-2 min-[430px]:w-auto [&_.primary-button]:h-9 [&_.primary-button]:px-3">{actions}</div> : null}
    </header>
  );
}
