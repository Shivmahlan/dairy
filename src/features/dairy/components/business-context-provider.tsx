"use client";

import { createContext, useContext, useEffect, useState } from "react";

import type { BusinessContext } from "@/features/dairy/lib/types";

interface BusinessContextValue extends BusinessContext {
  updateMilkRate: (nextMilkRate: number) => void;
}

const BusinessContextState = createContext<BusinessContextValue | null>(null);

interface BusinessContextProviderProps {
  children: React.ReactNode;
  value: BusinessContext;
}

export function BusinessContextProvider({
  children,
  value,
}: BusinessContextProviderProps) {
  const [businessContext, setBusinessContext] = useState(value);

  useEffect(() => {
    setBusinessContext(value);
  }, [value]);

  return (
    <BusinessContextState.Provider
      value={{
        ...businessContext,
        updateMilkRate(nextMilkRate) {
          setBusinessContext((current) => ({
            ...current,
            milkRate: nextMilkRate,
          }));
        },
      }}
    >
      {children}
    </BusinessContextState.Provider>
  );
}

export function useBusinessContext() {
  const context = useContext(BusinessContextState);

  if (!context) {
    throw new Error("Business context is missing.");
  }

  return context;
}
