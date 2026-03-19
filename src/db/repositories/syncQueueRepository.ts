import { getDatabase } from "@/db/client";
import { SyncAction, SyncEntityType, SyncQueueItem } from "@/domain/models";
import { createId } from "@/lib/id";
import { nowIsoString } from "@/lib/time";

type EnqueueSyncInput = {
  entityType: SyncEntityType;
  entityId: string;
  action: SyncAction;
  payload: unknown;
};

export async function enqueueSyncMutation(input: EnqueueSyncInput): Promise<SyncQueueItem> {
  const db = await getDatabase();
  const timestamp = nowIsoString();
  const item: SyncQueueItem = {
    id: createId("sync"),
    entityType: input.entityType,
    entityId: input.entityId,
    action: input.action,
    payloadJson: JSON.stringify(input.payload),
    status: "pending",
    attempts: 0,
    lastError: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await db.runAsync(
    `INSERT INTO sync_queue (
      id,
      entity_type,
      entity_id,
      action,
      payload_json,
      status,
      attempts,
      last_error,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      item.id,
      item.entityType,
      item.entityId,
      item.action,
      item.payloadJson,
      item.status,
      item.attempts,
      item.lastError,
      item.createdAt,
      item.updatedAt,
    ],
  );

  return item;
}

export async function listPendingSyncQueueItems(): Promise<SyncQueueItem[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    id: string;
    entity_type: SyncEntityType;
    entity_id: string;
    action: SyncAction;
    payload_json: string;
    status: SyncQueueItem["status"];
    attempts: number;
    last_error: string | null;
    created_at: string;
    updated_at: string;
  }>("SELECT * FROM sync_queue WHERE status IN ('pending', 'failed') ORDER BY created_at ASC;");

  return rows.map((row) => ({
    id: row.id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    action: row.action,
    payloadJson: row.payload_json,
    status: row.status,
    attempts: row.attempts,
    lastError: row.last_error,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function getPendingSyncQueueCount() {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ total: number }>(
    "SELECT COUNT(*) AS total FROM sync_queue WHERE status IN ('pending', 'failed');",
  );

  return row?.total ?? 0;
}

export async function markSyncQueueItemProcessing(id: string) {
  const db = await getDatabase();
  await db.runAsync(
    "UPDATE sync_queue SET status = 'processing', updated_at = ? WHERE id = ?;",
    [nowIsoString(), id],
  );
}

export async function markSyncQueueItemCompleted(id: string) {
  const db = await getDatabase();
  await db.runAsync(
    "UPDATE sync_queue SET status = 'completed', last_error = NULL, updated_at = ? WHERE id = ?;",
    [nowIsoString(), id],
  );
}

export async function markSyncQueueItemFailed(id: string, errorMessage: string) {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE sync_queue
      SET status = 'failed',
          attempts = attempts + 1,
          last_error = ?,
          updated_at = ?
      WHERE id = ?;`,
    [errorMessage, nowIsoString(), id],
  );
}

export async function hasPendingSyncForEntity(entityType: SyncEntityType, entityId: string) {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ total: number }>(
    `SELECT COUNT(*) AS total
      FROM sync_queue
      WHERE entity_type = ?
        AND entity_id = ?
        AND status IN ('pending', 'failed', 'processing');`,
    [entityType, entityId],
  );

  return (row?.total ?? 0) > 0;
}

export async function resetProcessingSyncQueueItems() {
  const db = await getDatabase();
  await db.runAsync(
    "UPDATE sync_queue SET status = 'pending', updated_at = ? WHERE status = 'processing';",
    [nowIsoString()],
  );
}
