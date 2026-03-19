import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { bootstrapLocalDatabase } from "@/db/bootstrap";
import { getAppMetaSnapshot } from "@/db/repositories/appMetaRepository";
import { getOrCreateLocalProfileId } from "@/features/auth/secureStore";
import { initializeLocalNotifications, reconcileLocalReminderNotifications } from "@/features/notifications/localNotificationService";
import { localFirstSyncQueueService } from "@/features/sync/LocalFirstSyncQueueService";
import { queryKeys } from "@/lib/query/queryKeys";
import { queryClient } from "@/lib/query/queryClient";

type BootstrapStatus = "idle" | "loading" | "ready" | "error";

type BootstrapState = {
  status: BootstrapStatus;
  error: string | null;
  localProfileId: string | null;
  bundledContentVersion: number | null;
  activeContentVersion: number | null;
  seededAt: string | null;
};

const BootstrapContext = createContext<BootstrapState | null>(null);

export function AppBootstrapProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<BootstrapState>({
    status: "idle",
    error: null,
    localProfileId: null,
    bundledContentVersion: null,
    activeContentVersion: null,
    seededAt: null,
  });

  useEffect(() => {
    let isActive = true;

    async function initializeApp() {
      setState((current) => ({
        ...current,
        status: "loading",
        error: null,
      }));

      try {
        const [bootstrapSummary, localProfileId] = await Promise.all([
          bootstrapLocalDatabase(),
          getOrCreateLocalProfileId(),
        ]);

        const meta = await getAppMetaSnapshot();

        if (!isActive) {
          return;
        }

        setState({
          status: "ready",
          error: null,
          localProfileId,
          bundledContentVersion: bootstrapSummary.bundledContentVersion,
          activeContentVersion: meta.contentVersion,
          seededAt: meta.seededAt,
        });
      } catch (error) {
        if (!isActive) {
          return;
        }

        setState({
          status: "error",
          error: error instanceof Error ? error.message : "Unknown bootstrap error",
          localProfileId: null,
          bundledContentVersion: null,
          activeContentVersion: null,
          seededAt: null,
        });
      }
    }

    void initializeApp();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (state.status !== "ready" || !state.localProfileId) {
      return;
    }

    void initializeLocalNotifications()
      .then(() => reconcileLocalReminderNotifications())
      .then(() =>
        queryClient.invalidateQueries({ queryKey: queryKeys.timeline(state.localProfileId as string) }),
      )
      .catch(() => undefined);

    void localFirstSyncQueueService.resumeWhenOnline(state.localProfileId);
  }, [state.status, state.localProfileId]);

  const value = useMemo(() => state, [state]);

  return <BootstrapContext.Provider value={value}>{children}</BootstrapContext.Provider>;
}

export function useAppBootstrap() {
  const context = useContext(BootstrapContext);

  if (!context) {
    throw new Error("useAppBootstrap must be used within AppBootstrapProvider");
  }

  return context;
}
