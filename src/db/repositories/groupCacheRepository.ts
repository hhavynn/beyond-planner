import { getDatabase } from "@/db/client";
import { GroupCache } from "@/domain/models";

export async function listCachedGroups(): Promise<GroupCache[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    id: string;
    name: string;
    invite_code: string | null;
    owner_user_id: string | null;
    last_synced_at: string | null;
  }>("SELECT * FROM groups_cache ORDER BY name ASC;");

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    inviteCode: row.invite_code,
    ownerUserId: row.owner_user_id,
    lastSyncedAt: row.last_synced_at,
  }));
}
