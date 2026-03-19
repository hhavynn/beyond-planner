import { getDatabase } from "@/db/client";
import { ArtistSet, Festival, FestivalDay, Stage } from "@/domain/models";
import { ScheduleSetListItem } from "@/features/festival/models";
import { formatTimeRange } from "@/lib/time";

export async function getFestival(): Promise<Festival | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{
    id: string;
    slug: string;
    name: string;
    edition_label: string;
    timezone: string;
    city: string | null;
    state: string | null;
    content_version: number;
  }>("SELECT * FROM festival LIMIT 1;");

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    editionLabel: row.edition_label,
    timezone: row.timezone,
    city: row.city,
    state: row.state,
    contentVersion: row.content_version,
  };
}

export async function listFestivalDays(): Promise<FestivalDay[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    id: string;
    festival_id: string;
    label: string;
    date_local: string | null;
    sort_order: number;
  }>("SELECT * FROM festival_days ORDER BY sort_order ASC;");

  return rows.map((row) => ({
    id: row.id,
    festivalId: row.festival_id,
    label: row.label,
    dateLocal: row.date_local,
    sortOrder: row.sort_order,
  }));
}

export async function listStages(): Promise<Stage[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    id: string;
    festival_id: string;
    day_id: string | null;
    name: string;
    slug: string;
    area_kind: string | null;
    sort_order: number;
  }>("SELECT * FROM stages ORDER BY sort_order ASC;");

  return rows.map((row) => ({
    id: row.id,
    festivalId: row.festival_id,
    dayId: row.day_id,
    name: row.name,
    slug: row.slug,
    areaKind: row.area_kind,
    sortOrder: row.sort_order,
  }));
}

export async function listSets(): Promise<ArtistSet[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    id: string;
    festival_id: string;
    day_id: string;
    stage_id: string;
    artist_id: string;
    title: string;
    starts_at: string;
    ends_at: string;
    is_placeholder: number;
  }>("SELECT * FROM sets ORDER BY starts_at ASC;");

  return rows.map((row) => ({
    id: row.id,
    festivalId: row.festival_id,
    dayId: row.day_id,
    stageId: row.stage_id,
    artistId: row.artist_id,
    title: row.title,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    isPlaceholder: Boolean(row.is_placeholder),
  }));
}

export async function listScheduleSetListItems(userId: string): Promise<ScheduleSetListItem[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    set_id: string;
    title: string;
    day_label: string;
    stage_label: string;
    starts_at: string;
    ends_at: string;
    is_placeholder: number;
    favorite_set_id: string | null;
    itinerary_item_id: string | null;
  }>(
    `SELECT
        sets.id AS set_id,
        sets.title AS title,
        festival_days.label AS day_label,
        stages.name AS stage_label,
        sets.starts_at AS starts_at,
        sets.ends_at AS ends_at,
        sets.is_placeholder AS is_placeholder,
        favorites.set_id AS favorite_set_id,
        itinerary_items.id AS itinerary_item_id
      FROM sets
      INNER JOIN festival_days ON festival_days.id = sets.day_id
      INNER JOIN stages ON stages.id = sets.stage_id
      LEFT JOIN favorites
        ON favorites.set_id = sets.id
        AND favorites.user_id = ?
        AND favorites.deleted_at IS NULL
      LEFT JOIN itinerary_items
        ON itinerary_items.set_id = sets.id
        AND itinerary_items.user_id = ?
        AND itinerary_items.kind = 'set'
        AND itinerary_items.deleted_at IS NULL
      ORDER BY sets.starts_at ASC, stages.sort_order ASC, sets.title ASC;`,
    [userId, userId],
  );

  return rows.map((row) => ({
    setId: row.set_id,
    title: row.title,
    dayLabel: row.day_label,
    stageLabel: row.stage_label,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    timeLabel: formatTimeRange(row.starts_at, row.ends_at),
    isFavorite: Boolean(row.favorite_set_id),
    isInPlan: Boolean(row.itinerary_item_id),
    planItemId: row.itinerary_item_id,
    isPlaceholder: Boolean(row.is_placeholder),
  }));
}
