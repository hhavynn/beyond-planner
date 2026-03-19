import { BUNDLED_CONTENT_VERSION, DB_SCHEMA_VERSION } from "@/db/constants";
import { getDatabase } from "@/db/client";
import { schemaStatements } from "@/db/schema";
import {
  beyond2026ArtistSeeds,
  beyond2026DaySeeds,
  beyond2026FestivalSeed,
  beyond2026SetSeeds,
  beyond2026StageSeeds,
} from "@/db/seeds/beyond2026Seed";
import { nowIsoString } from "@/lib/time";

type BootstrapSummary = {
  schemaVersion: number;
  bundledContentVersion: number;
  didSeedReferenceData: boolean;
};

export async function bootstrapLocalDatabase(): Promise<BootstrapSummary> {
  const db = await getDatabase();

  for (const statement of schemaStatements) {
    await db.execAsync(statement);
  }

  await ensureReminderSettingsColumns(db);

  const storedVersion = await readNumericMeta(db, "content_version");
  const shouldSeedReferenceData = storedVersion === null || storedVersion < BUNDLED_CONTENT_VERSION;

  if (shouldSeedReferenceData) {
    await db.withTransactionAsync(async () => {
      await db.execAsync("DELETE FROM sets;");
      await db.execAsync("DELETE FROM artists;");
      await db.execAsync("DELETE FROM stages;");
      await db.execAsync("DELETE FROM festival_days;");
      await db.execAsync("DELETE FROM festival;");

      await db.runAsync(
        `INSERT INTO festival (
          id,
          slug,
          name,
          edition_label,
          timezone,
          city,
          state,
          content_version
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          beyond2026FestivalSeed.id,
          beyond2026FestivalSeed.slug,
          beyond2026FestivalSeed.name,
          beyond2026FestivalSeed.editionLabel,
          beyond2026FestivalSeed.timezone,
          beyond2026FestivalSeed.city,
          beyond2026FestivalSeed.state,
          beyond2026FestivalSeed.contentVersion,
        ],
      );

      for (const day of beyond2026DaySeeds) {
        await db.runAsync(
          "INSERT INTO festival_days (id, festival_id, label, date_local, sort_order) VALUES (?, ?, ?, ?, ?);",
          [day.id, day.festivalId, day.label, day.dateLocal, day.sortOrder],
        );
      }

      for (const stage of beyond2026StageSeeds) {
        await db.runAsync(
          "INSERT INTO stages (id, festival_id, day_id, name, slug, area_kind, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?);",
          [
            stage.id,
            stage.festivalId,
            stage.dayId,
            stage.name,
            stage.slug,
            stage.areaKind,
            stage.sortOrder,
          ],
        );
      }

      for (const artist of beyond2026ArtistSeeds) {
        await db.runAsync("INSERT INTO artists (id, slug, name) VALUES (?, ?, ?);", [
          artist.id,
          artist.slug,
          artist.name,
        ]);
      }

      for (const item of beyond2026SetSeeds) {
        await db.runAsync(
          `INSERT INTO sets (
            id,
            festival_id,
            day_id,
            stage_id,
            artist_id,
            title,
            starts_at,
            ends_at,
            is_placeholder
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            item.id,
            item.festivalId,
            item.dayId,
            item.stageId,
            item.artistId,
            item.title,
            item.startsAt,
            item.endsAt,
            item.isPlaceholder ? 1 : 0,
          ],
        );
      }

      await writeMeta(db, "schema_version", String(DB_SCHEMA_VERSION));
      await writeMeta(db, "content_version", String(BUNDLED_CONTENT_VERSION));
      await writeMeta(db, "seeded_at", nowIsoString());
    });
  }

  await writeMeta(db, "schema_version", String(DB_SCHEMA_VERSION));

  return {
    schemaVersion: DB_SCHEMA_VERSION,
    bundledContentVersion: BUNDLED_CONTENT_VERSION,
    didSeedReferenceData: shouldSeedReferenceData,
  };
}

async function readNumericMeta(db: Awaited<ReturnType<typeof getDatabase>>, key: string) {
  const row = await db.getFirstAsync<{ value: string }>("SELECT value FROM app_meta WHERE key = ?;", [key]);
  return row ? Number(row.value) : null;
}

async function writeMeta(db: Awaited<ReturnType<typeof getDatabase>>, key: string, value: string) {
  await db.runAsync(
    `INSERT INTO app_meta (key, value)
      VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value;`,
    [key, value],
  );
}

async function ensureReminderSettingsColumns(db: Awaited<ReturnType<typeof getDatabase>>) {
  await db.execAsync(
    "ALTER TABLE reminder_settings ADD COLUMN scheduled_notification_id TEXT;",
  ).catch(() => undefined);
  await db.execAsync(
    "ALTER TABLE reminder_settings ADD COLUMN scheduled_for TEXT;",
  ).catch(() => undefined);
}
