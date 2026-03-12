"use client";
import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from "react";
import type { GorgiasTicket, EnhancedAnalytics } from "@/types/gorgias";
import { parseGorgiasCsv } from "@/lib/csv-parser";
import { computeAnalytics } from "@/lib/analytics";

interface TicketContextValue {
  tickets: GorgiasTicket[];
  analytics: EnhancedAnalytics | null;
  fileName: string;
  uploadCsv: (text: string, name?: string) => void;
  clear: () => void;
}

const TicketContext = createContext<TicketContextValue | null>(null);

export function TicketProvider({ children }: { children: ReactNode }) {
  const [tickets, setTickets] = useState<GorgiasTicket[]>([]);
  const [fileName, setFileName] = useState("");

  const analytics = useMemo(
    () => (tickets.length > 0 ? computeAnalytics(tickets) : null),
    [tickets]
  );

  const uploadCsv = useCallback((text: string, name?: string) => {
    const result = parseGorgiasCsv(text);
    setTickets(result.tickets);
    setFileName(name || "uploaded.csv");
  }, []);

  const clear = useCallback(() => {
    setTickets([]);
    setFileName("");
  }, []);

  return (
    <TicketContext.Provider value={{ tickets, analytics, fileName, uploadCsv, clear }}>
      {children}
    </TicketContext.Provider>
  );
}

export function useTickets() {
  const ctx = useContext(TicketContext);
  if (!ctx) throw new Error("useTickets must be used within a TicketProvider");
  return ctx;
}
