import { getDatabase } from "@/db/client";
import { ReminderSetting } from "@/domain/models";
import { createId } from "@/lib/id";
import { nowIsoString } from "@/lib/time";

type ReminderRow = {
  id: string;
  itinerary_item_id: string;
  minutes_before: number;
  enabled: number;
  last_scheduled_at: string | null;
  scheduled_notification_id: string | null;
  scheduled_for: string | null;
};

export type ReminderReconcileItem = {
  itineraryItemId: string;
  title: string;
  startsAt: string | null;
  enabled: boolean;
  minutesBefore: number;
  scheduledNotificationId: string | null;
  scheduledFor: string | null;
};

export async function ensureReminderSettingForItem(itineraryItemId: string): Promise<ReminderSetting> {
  const db = await getDatabase();
  const existing = await db.getFirstAsync<ReminderRow>(
    "SELECT * FROM reminder_settings WHERE itinerary_item_id = ?;",
    [itineraryItemId],
  );

  if (existing) {
    return mapReminderRow(existing);
  }

  const reminder: ReminderSetting = {
    id: createId("reminder"),
    itineraryItemId,
    minutesBefore: 15,
    enabled: false,
    lastScheduledAt: null,
    scheduledNotificationId: null,
    scheduledFor: null,
  };

  await db.runAsync(
    `INSERT INTO reminder_settings (
      id,
      itinerary_item_id,
      minutes_before,
      enabled,
      last_scheduled_at,
      scheduled_notification_id,
      scheduled_for
    ) VALUES (?, ?, ?, ?, ?, ?, ?);`,
    [
      reminder.id,
      reminder.itineraryItemId,
      reminder.minutesBefore,
      reminder.enabled ? 1 : 0,
      reminder.lastScheduledAt,
      reminder.scheduledNotificationId,
      reminder.scheduledFor,
    ],
  );

  return reminder;
}

export async function getReminderSettingForItem(itineraryItemId: string): Promise<ReminderSetting | null> {
  const db = await getDatabase();
  const existing = await db.getFirstAsync<ReminderRow>(
    "SELECT * FROM reminder_settings WHERE itinerary_item_id = ?;",
    [itineraryItemId],
  );

  return existing ? mapReminderRow(existing) : null;
}

export async function listReminderSettingsForReconcile(): Promise<ReminderReconcileItem[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    itinerary_item_id: string;
    title: string;
    starts_at: string | null;
    enabled: number;
    minutes_before: number;
    scheduled_notification_id: string | null;
    scheduled_for: string | null;
  }>(
    `SELECT
        itinerary_items.id AS itinerary_item_id,
        itinerary_items.title AS title,
        itinerary_items.starts_at AS starts_at,
        reminder_settings.enabled AS enabled,
        reminder_settings.minutes_before AS minutes_before,
        reminder_settings.scheduled_notification_id AS scheduled_notification_id,
        reminder_settings.scheduled_for AS scheduled_for
      FROM reminder_settings
      INNER JOIN itinerary_items
        ON itinerary_items.id = reminder_settings.itinerary_item_id
      WHERE itinerary_items.deleted_at IS NULL;`,
  );

  return rows.map((row) => ({
    itineraryItemId: row.itinerary_item_id,
    title: row.title,
    startsAt: row.starts_at,
    enabled: Boolean(row.enabled),
    minutesBefore: row.minutes_before,
    scheduledNotificationId: row.scheduled_notification_id,
    scheduledFor: row.scheduled_for,
  }));
}

export async function getReminderReconcileItem(
  itineraryItemId: string,
): Promise<ReminderReconcileItem | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{
    itinerary_item_id: string;
    title: string;
    starts_at: string | null;
    enabled: number;
    minutes_before: number;
    scheduled_notification_id: string | null;
    scheduled_for: string | null;
  }>(
    `SELECT
        itinerary_items.id AS itinerary_item_id,
        itinerary_items.title AS title,
        itinerary_items.starts_at AS starts_at,
        reminder_settings.enabled AS enabled,
        reminder_settings.minutes_before AS minutes_before,
        reminder_settings.scheduled_notification_id AS scheduled_notification_id,
        reminder_settings.scheduled_for AS scheduled_for
      FROM reminder_settings
      INNER JOIN itinerary_items
        ON itinerary_items.id = reminder_settings.itinerary_item_id
      WHERE itinerary_items.id = ?
        AND itinerary_items.deleted_at IS NULL
      LIMIT 1;`,
    [itineraryItemId],
  );

  if (!row) {
    return null;
  }

  return {
    itineraryItemId: row.itinerary_item_id,
    title: row.title,
    startsAt: row.starts_at,
    enabled: Boolean(row.enabled),
    minutesBefore: row.minutes_before,
    scheduledNotificationId: row.scheduled_notification_id,
    scheduledFor: row.scheduled_for,
  };
}

export async function upsertReminderSetting(
  itineraryItemId: string,
  input: { enabled: boolean; minutesBefore: number },
): Promise<ReminderSetting> {
  const existing = await ensureReminderSettingForItem(itineraryItemId);
  const db = await getDatabase();
  const updated: ReminderSetting = {
    ...existing,
    enabled: input.enabled,
    minutesBefore: input.minutesBefore,
  };

  await db.runAsync(
    `UPDATE reminder_settings
      SET enabled = ?, minutes_before = ?
      WHERE itinerary_item_id = ?;`,
    [updated.enabled ? 1 : 0, updated.minutesBefore, itineraryItemId],
  );

  return updated;
}

export async function setReminderScheduledMetadata(
  itineraryItemId: string,
  scheduledNotificationId: string,
  scheduledFor: string,
) {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE reminder_settings
      SET scheduled_notification_id = ?, scheduled_for = ?, last_scheduled_at = ?
      WHERE itinerary_item_id = ?;`,
    [scheduledNotificationId, scheduledFor, nowIsoString(), itineraryItemId],
  );
}

export async function clearReminderScheduleMetadata(itineraryItemId: string) {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE reminder_settings
      SET scheduled_notification_id = NULL, scheduled_for = NULL, last_scheduled_at = NULL
      WHERE itinerary_item_id = ?;`,
    [itineraryItemId],
  );
}

export async function deleteReminderSettingForItem(itineraryItemId: string) {
  const db = await getDatabase();
  await db.runAsync("DELETE FROM reminder_settings WHERE itinerary_item_id = ?;", [itineraryItemId]);
}

function mapReminderRow(row: ReminderRow): ReminderSetting {
  return {
    id: row.id,
    itineraryItemId: row.itinerary_item_id,
    minutesBefore: row.minutes_before,
    enabled: Boolean(row.enabled),
    lastScheduledAt: row.last_scheduled_at,
    scheduledNotificationId: row.scheduled_notification_id,
    scheduledFor: row.scheduled_for,
  };
}
