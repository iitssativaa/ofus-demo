"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type DraftStore = {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T): void;
  clear(key: string): void;
};

const FormDraftContext = createContext<DraftStore | null>(null);

export function FormDraftProvider({ scope, children }: { scope: string; children: ReactNode }) {
  return <ScopedDraftProvider key={scope}>{children}</ScopedDraftProvider>;
}

function ScopedDraftProvider({ children }: { children: ReactNode }) {
  const [store] = useState<DraftStore>(() => {
    const drafts = new Map<string, unknown>();
    return {
      get: <T,>(key: string) => drafts.get(key) as T | undefined,
      set: <T,>(key: string, value: T) => { drafts.set(key, value); },
      clear: (key: string) => { drafts.delete(key); },
    };
  });
  return <FormDraftContext.Provider value={store}>{children}</FormDraftContext.Provider>;
}

export function useFormDrafts() {
  const store = useContext(FormDraftContext);
  if (!store) throw new Error("FormDraftProvider bulunamadı.");
  return store;
}
