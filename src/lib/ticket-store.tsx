"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { GorgiasTicket, EnhancedAnalytics } from "@/types/gorgias";
import { parseGorgiasCsv } from "@/lib/csv-parser";
import { computeAnalytics } from "@/lib/analytics";

interface TicketStore {
  tickets: GorgiasTicket[];
  analytics: EnhancedAnalytics | null;
  loading: boolean;
  fileName: string;
  uploadCsv: (text: string, name: string) => void;
  clear: () => void;
}

const TicketContext = createContext<TicketStore | null>(null);

export function TicketProvider({ children }: { children: ReactNode }) {
  const [tickets, setTickets] = useState<GorgiasTicket[]>([]);
  const [analytics, setAnalytics] = useState<EnhancedAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState("");

  const uploadCsv = useCallback((text: string, name: string) => {
    setLoading(true);
    try {
      const parsed = parseGorgiasCsv(text);
      setTickets(parsed);
      setFileName(name);
      const stats = computeAnalytics(parsed);
      setAnalytics(stats);
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setTickets([]);
    setAnalytics(null);
    setFileName("");
  }, []);

  return (
    <TicketContext.Provider value={{ tickets, analytics, loading, fileName, uploadCsv, clear }}>
      {children}
    </TicketContext.Provider>
  );
}

export function useTickets() {
  const ctx = useContext(TicketContext);
  if (!ctx) throw new Error("useTickets must be used within TicketProvider");
  return ctx;
}
