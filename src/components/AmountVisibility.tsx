"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

const AmountVisibilityContext = createContext<{ visible: boolean; toggle: () => void } | null>(null);

export function AmountVisibilityProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  return (
    <AmountVisibilityContext.Provider value={{ visible, toggle: () => setVisible((v) => !v) }}>
      {children}
    </AmountVisibilityContext.Provider>
  );
}

export function useAmountVisibility() {
  const ctx = useContext(AmountVisibilityContext);
  if (!ctx) throw new Error("useAmountVisibility must be used within an AmountVisibilityProvider");
  return ctx;
}
