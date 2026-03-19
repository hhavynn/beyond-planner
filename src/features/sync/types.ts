import { SyncQueueItem } from "@/domain/models";

export type SyncFlushResult = {
  processed: number;
  failed: number;
  skipped: number;
  status: "synced" | "deferred_no_session" | "partial_failure";
};

export interface SyncQueueService {
  enqueuePendingChange(item: SyncQueueItem): Promise<void>;
  flushPendingChanges(localUserId: string): Promise<SyncFlushResult>;
  resumeWhenOnline(localUserId: string): Promise<void>;
}
