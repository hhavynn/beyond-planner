import { getDatabase } from "@/db/client";
import { AppMetaSnapshot } from "@/domain/models";

export async function getAppMetaSnapshot(): Promise<AppMetaSnapshot> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ key: string; value: string }>("SELECT key, value FROM app_meta;");

  const meta = new Map(rows.map((row) => [row.key, row.value]));

  return {
    contentVersion: meta.has("content_version") ? Number(meta.get("content_version")) : null,
    seededAt: meta.get("seeded_at") ?? null,
  };
}
