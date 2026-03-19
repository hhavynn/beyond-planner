import { FavoriteSet } from "@/domain/models";
import { getDatabase } from "@/db/client";
import { compareDateTimes, nowIsoString } from "@/lib/time";

export async function listFavoriteSetIds(userId: string): Promise<string[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ set_id: string }>(
    "SELECT set_id FROM favorites WHERE user_id = ? AND deleted_at IS NULL ORDER BY updated_at DESC;",
    [userId],
  );

  return rows.map((row) => row.set_id);
}

export async function saveFavoriteSet(userId: string, setId: string): Promise<FavoriteSet> {
  const db = await getDatabase();
  const existing = await db.getFirstAsync<{
    user_id: string;
    set_id: string;
    created_at: string;
  }>("SELECT user_id, set_id, created_at FROM favorites WHERE user_id = ? AND set_id = ?;", [userId, setId]);
  const timestamp = nowIsoString();

  if (existing) {
    await db.runAsync(
      `UPDATE favorites
        SET deleted_at = NULL, updated_at = ?
        WHERE user_id = ? AND set_id = ?;`,
      [timestamp, userId, setId],
    );

    return {
      userId,
      setId,
      createdAt: existing.created_at,
      updatedAt: timestamp,
      deletedAt: null,
    };
  }

  await db.runAsync(
    `INSERT INTO favorites (user_id, set_id, created_at, updated_at, deleted_at)
      VALUES (?, ?, ?, ?, NULL);`,
    [userId, setId, timestamp, timestamp],
  );

  return {
    userId,
    setId,
    createdAt: timestamp,
    updatedAt: timestamp,
    deletedAt: null,
  };
}

export async function unsaveFavoriteSet(userId: string, setId: string): Promise<FavoriteSet> {
  const db = await getDatabase();
  const existing = await db.getFirstAsync<{
    created_at: string;
  }>("SELECT created_at FROM favorites WHERE user_id = ? AND set_id = ?;", [userId, setId]);
  const timestamp = nowIsoString();
  const createdAt = existing?.created_at ?? timestamp;

  if (existing) {
    await db.runAsync(
      `UPDATE favorites
        SET deleted_at = ?, updated_at = ?
        WHERE user_id = ? AND set_id = ?;`,
      [timestamp, timestamp, userId, setId],
    );
  } else {
    await db.runAsync(
      `INSERT INTO favorites (user_id, set_id, created_at, updated_at, deleted_at)
        VALUES (?, ?, ?, ?, ?);`,
      [userId, setId, createdAt, timestamp, timestamp],
    );
  }

  return {
    userId,
    setId,
    createdAt,
    updatedAt: timestamp,
    deletedAt: timestamp,
  };
}

export async function getFavoriteSet(userId: string, setId: string): Promise<FavoriteSet | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{
    user_id: string;
    set_id: string;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
  }>("SELECT * FROM favorites WHERE user_id = ? AND set_id = ? LIMIT 1;", [userId, setId]);

  if (!row) {
    return null;
  }

  return {
    userId: row.user_id,
    setId: row.set_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

export async function upsertFavoriteSetFromRemote(
  localUserId: string,
  remoteRow: FavoriteSet,
  options?: { preserveLocal?: boolean },
) {
  const local = await getFavoriteSet(localUserId, remoteRow.setId);

  if (options?.preserveLocal && local && compareDateTimes(local.updatedAt, remoteRow.updatedAt) >= 0) {
    return local;
  }

  const db = await getDatabase();

  await db.runAsync(
    `INSERT INTO favorites (user_id, set_id, created_at, updated_at, deleted_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(user_id, set_id) DO UPDATE SET
        created_at = excluded.created_at,
        updated_at = excluded.updated_at,
        deleted_at = excluded.deleted_at;`,
    [localUserId, remoteRow.setId, remoteRow.createdAt, remoteRow.updatedAt, remoteRow.deletedAt],
  );

  return {
    ...remoteRow,
    userId: localUserId,
  };
}
