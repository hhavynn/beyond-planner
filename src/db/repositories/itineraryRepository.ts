import { getDatabase } from "@/db/client";
import { ItineraryItem } from "@/domain/models";
import { TimelineEntry } from "@/features/plan/models";
import { createId } from "@/lib/id";
import { compareDateTimes, formatReminderOffsetLabel, formatTimeRange, nowIsoString } from "@/lib/time";

export type CreateCustomItemInput = {
  title: string;
  startsAt: string;
  endsAt: string;
  locationLabel?: string | null;
  notes?: string | null;
};

export type UpdateCustomItemInput = CreateCustomItemInput;

type ItineraryRow = {
  id: string;
  user_id: string;
  kind: string;
  title: string;
  set_id: string | null;
  group_id: string | null;
  starts_at: string | null;
  ends_at: string | null;
  location_label: string | null;
  notes: string | null;
  status: string | null;
  is_completed: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export async function listItineraryItems(userId: string): Promise<ItineraryItem[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<ItineraryRow>(
    `SELECT * FROM itinerary_items
      WHERE user_id = ? AND deleted_at IS NULL
      ORDER BY COALESCE(starts_at, created_at) ASC;`,
    [userId],
  );

  return rows.map(mapItineraryRow);
}

export async function getItineraryItem(userId: string, itemId: string): Promise<ItineraryItem | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<ItineraryRow>(
    "SELECT * FROM itinerary_items WHERE user_id = ? AND id = ? LIMIT 1;",
    [userId, itemId],
  );

  return row ? mapItineraryRow(row) : null;
}

export async function addSetToPlan(userId: string, setId: string): Promise<ItineraryItem> {
  const db = await getDatabase();
  const existing = await db.getFirstAsync<ItineraryRow>(
    `SELECT * FROM itinerary_items
      WHERE user_id = ? AND set_id = ? AND kind = 'set' AND deleted_at IS NULL
      LIMIT 1;`,
    [userId, setId],
  );

  if (existing) {
    return mapItineraryRow(existing);
  }

  const setRow = await db.getFirstAsync<{
    set_id: string;
    title: string;
    starts_at: string;
    ends_at: string;
    stage_label: string;
  }>(
    `SELECT
        sets.id AS set_id,
        sets.title AS title,
        sets.starts_at AS starts_at,
        sets.ends_at AS ends_at,
        stages.name AS stage_label
      FROM sets
      INNER JOIN stages ON stages.id = sets.stage_id
      WHERE sets.id = ?
      LIMIT 1;`,
    [setId],
  );

  if (!setRow) {
    throw new Error("Set not found");
  }

  const timestamp = nowIsoString();
  const item: ItineraryItem = {
    id: createId("itinerary"),
    userId,
    kind: "set",
    title: setRow.title,
    setId,
    groupId: null,
    startsAt: setRow.starts_at,
    endsAt: setRow.ends_at,
    locationLabel: setRow.stage_label,
    notes: null,
    status: null,
    isCompleted: false,
    createdAt: timestamp,
    updatedAt: timestamp,
    deletedAt: null,
  };

  await insertItineraryItem(item);
  return item;
}

export async function createCustomItineraryItem(
  userId: string,
  input: CreateCustomItemInput,
): Promise<ItineraryItem> {
  const timestamp = nowIsoString();
  const item: ItineraryItem = {
    id: createId("itinerary"),
    userId,
    kind: "custom",
    title: input.title,
    setId: null,
    groupId: null,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    locationLabel: input.locationLabel ?? null,
    notes: input.notes ?? null,
    status: null,
    isCompleted: false,
    createdAt: timestamp,
    updatedAt: timestamp,
    deletedAt: null,
  };

  await insertItineraryItem(item);
  return item;
}

export async function updateCustomItineraryItem(
  userId: string,
  itemId: string,
  input: UpdateCustomItemInput,
): Promise<ItineraryItem> {
  const db = await getDatabase();
  const existing = await db.getFirstAsync<ItineraryRow>(
    `SELECT * FROM itinerary_items
      WHERE id = ? AND user_id = ? AND kind = 'custom' AND deleted_at IS NULL
      LIMIT 1;`,
    [itemId, userId],
  );

  if (!existing) {
    throw new Error("Custom itinerary item not found");
  }

  const updatedAt = nowIsoString();

  await db.runAsync(
    `UPDATE itinerary_items
      SET title = ?, starts_at = ?, ends_at = ?, location_label = ?, notes = ?, updated_at = ?
      WHERE id = ? AND user_id = ?;`,
    [
      input.title,
      input.startsAt,
      input.endsAt,
      input.locationLabel ?? null,
      input.notes ?? null,
      updatedAt,
      itemId,
      userId,
    ],
  );

  return {
    ...mapItineraryRow(existing),
    title: input.title,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    locationLabel: input.locationLabel ?? null,
    notes: input.notes ?? null,
    updatedAt,
  };
}

export async function removeItineraryItem(userId: string, itemId: string): Promise<ItineraryItem> {
  const db = await getDatabase();
  const existing = await db.getFirstAsync<ItineraryRow>(
    `SELECT * FROM itinerary_items
      WHERE id = ? AND user_id = ? AND deleted_at IS NULL
      LIMIT 1;`,
    [itemId, userId],
  );

  if (!existing) {
    throw new Error("Itinerary item not found");
  }

  const deletedAt = nowIsoString();

  await db.runAsync(
    `UPDATE itinerary_items
      SET deleted_at = ?, updated_at = ?
      WHERE id = ? AND user_id = ?;`,
    [deletedAt, deletedAt, itemId, userId],
  );

  return {
    ...mapItineraryRow(existing),
    deletedAt,
    updatedAt: deletedAt,
  };
}

export async function upsertItineraryItemFromRemote(
  localUserId: string,
  remoteItem: ItineraryItem,
  options?: { preserveLocal?: boolean },
) {
  const local = await getItineraryItem(localUserId, remoteItem.id);

  if (options?.preserveLocal && local && compareDateTimes(local.updatedAt, remoteItem.updatedAt) >= 0) {
    return local;
  }

  const db = await getDatabase();

  await db.runAsync(
    `INSERT INTO itinerary_items (
      id,
      user_id,
      kind,
      title,
      set_id,
      group_id,
      starts_at,
      ends_at,
      location_label,
      notes,
      status,
      is_completed,
      created_at,
      updated_at,
      deleted_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      user_id = excluded.user_id,
      kind = excluded.kind,
      title = excluded.title,
      set_id = excluded.set_id,
      starts_at = excluded.starts_at,
      ends_at = excluded.ends_at,
      location_label = excluded.location_label,
      notes = excluded.notes,
      created_at = excluded.created_at,
      updated_at = excluded.updated_at,
      deleted_at = excluded.deleted_at;`,
    [
      remoteItem.id,
      localUserId,
      remoteItem.kind,
      remoteItem.title,
      remoteItem.setId,
      null,
      remoteItem.startsAt,
      remoteItem.endsAt,
      remoteItem.locationLabel,
      remoteItem.notes,
      null,
      0,
      remoteItem.createdAt,
      remoteItem.updatedAt,
      remoteItem.deletedAt,
    ],
  );

  return {
    ...remoteItem,
    userId: localUserId,
    groupId: null,
    status: null,
    isCompleted: false,
  };
}

export async function listTimelineEntries(userId: string): Promise<TimelineEntry[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    itinerary_id: string;
    kind: string;
    title: string;
    starts_at: string | null;
    ends_at: string | null;
    location_label: string | null;
    notes: string | null;
    set_id: string | null;
    created_at: string;
    updated_at: string;
    reminder_id: string | null;
    reminder_enabled: number | null;
    reminder_minutes_before: number | null;
    scheduled_notification_id: string | null;
  }>(
    `SELECT
        itinerary_items.id AS itinerary_id,
        itinerary_items.kind AS kind,
        itinerary_items.title AS title,
        itinerary_items.starts_at AS starts_at,
        itinerary_items.ends_at AS ends_at,
        itinerary_items.location_label AS location_label,
        itinerary_items.notes AS notes,
        itinerary_items.set_id AS set_id,
        itinerary_items.created_at AS created_at,
        itinerary_items.updated_at AS updated_at,
        reminder_settings.id AS reminder_id,
        reminder_settings.enabled AS reminder_enabled,
        reminder_settings.minutes_before AS reminder_minutes_before,
        reminder_settings.scheduled_notification_id AS scheduled_notification_id
      FROM itinerary_items
      LEFT JOIN reminder_settings
        ON reminder_settings.itinerary_item_id = itinerary_items.id
      WHERE itinerary_items.user_id = ?
        AND itinerary_items.deleted_at IS NULL
        AND itinerary_items.kind IN ('set', 'custom')
      ORDER BY COALESCE(itinerary_items.starts_at, itinerary_items.created_at) ASC, itinerary_items.created_at ASC;`,
    [userId],
  );

  return rows
    .map((row) => ({
      id: row.itinerary_id,
      kind: row.kind as TimelineEntry["kind"],
      title: row.title,
      typeLabel: row.kind === "set" ? "Set" : "Custom",
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      timeLabel: formatTimeRange(row.starts_at, row.ends_at),
      locationLabel: row.location_label,
      notes: row.notes,
      setId: row.set_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      hasReminder: Boolean(row.reminder_id),
      reminderEnabled: Boolean(row.reminder_enabled),
      reminderMinutesBefore: row.reminder_minutes_before,
      reminderLabel:
        row.reminder_minutes_before === null
          ? "Reminder off"
          : formatReminderOffsetLabel(row.reminder_minutes_before),
      isReminderScheduled: Boolean(row.scheduled_notification_id),
      reminderStatusLabel: !row.reminder_id || !row.reminder_enabled
        ? "Reminder off"
        : `${formatReminderOffsetLabel(row.reminder_minutes_before ?? 15)} (${
            row.scheduled_notification_id ? "scheduled" : "not scheduled"
          })`,
      canEdit: row.kind === "custom",
      canDelete: true,
    }))
    .sort((left, right) => compareDateTimes(left.startsAt ?? left.createdAt, right.startsAt ?? right.createdAt));
}

async function insertItineraryItem(item: ItineraryItem) {
  const db = await getDatabase();

  await db.runAsync(
    `INSERT INTO itinerary_items (
      id,
      user_id,
      kind,
      title,
      set_id,
      group_id,
      starts_at,
      ends_at,
      location_label,
      notes,
      status,
      is_completed,
      created_at,
      updated_at,
      deleted_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      item.id,
      item.userId,
      item.kind,
      item.title,
      item.setId,
      item.groupId,
      item.startsAt,
      item.endsAt,
      item.locationLabel,
      item.notes,
      item.status,
      item.isCompleted ? 1 : 0,
      item.createdAt,
      item.updatedAt,
      item.deletedAt,
    ],
  );
}

function mapItineraryRow(row: ItineraryRow): ItineraryItem {
  return {
    id: row.id,
    userId: row.user_id,
    kind: row.kind as ItineraryItem["kind"],
    title: row.title,
    setId: row.set_id,
    groupId: row.group_id,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    locationLabel: row.location_label,
    notes: row.notes,
    status: row.status,
    isCompleted: Boolean(row.is_completed),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}
