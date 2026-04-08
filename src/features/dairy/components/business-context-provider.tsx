"use client";

import { createContext, useContext } from "react";

import type { BusinessContext } from "@/features/dairy/lib/types";

const BusinessContextState = createContext<BusinessContext | null>(null);

interface BusinessContextProviderProps {
  children: React.ReactNode;
  value: BusinessContext;
}

export function BusinessContextProvider({
  children,
  value,
}: BusinessContextProviderProps) {
  return (
    <BusinessContextState.Provider value={value}>
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
