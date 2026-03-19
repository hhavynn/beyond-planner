import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

import {
  clearReminderScheduleMetadata,
  getReminderSettingForItem,
  getReminderReconcileItem,
  listReminderSettingsForReconcile,
  setReminderScheduledMetadata,
} from "@/db/repositories/reminderRepository";
import {
  formatReminderOffsetLabel,
  getReminderTriggerTime,
  isFutureDateTime,
} from "@/lib/time";

const REMINDER_CHANNEL_ID = "planner-reminders";

let isHandlerConfigured = false;
let isChannelConfigured = false;

export type ReminderScheduleResultStatus =
  | "scheduled"
  | "not_scheduled_permission_denied"
  | "not_scheduled_past_trigger"
  | "not_scheduled_error"
  | "not_scheduled_disabled";

export type ReminderScheduleResult = {
  status: ReminderScheduleResultStatus;
  scheduledNotificationId: string | null;
  scheduledFor: string | null;
};

export async function initializeLocalNotifications() {
  if (!isHandlerConfigured) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    isHandlerConfigured = true;
  }

  if (Platform.OS === "android" && !isChannelConfigured) {
    await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
      name: "Planner Reminders",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
    isChannelConfigured = true;
  }
}

export async function syncReminderNotificationForItem(
  itineraryItemId: string,
  options?: { requestPermissionIfNeeded?: boolean },
): Promise<ReminderScheduleResult> {
  await initializeLocalNotifications();
  const item = await getReminderReconcileItem(itineraryItemId);

  if (!item) {
    return {
      status: "not_scheduled_error",
      scheduledNotificationId: null,
      scheduledFor: null,
    };
  }

  return syncReminderReconcileItem(item, options);
}

export async function reconcileLocalReminderNotifications() {
  await initializeLocalNotifications();
  const items = await listReminderSettingsForReconcile();

  for (const item of items) {
    await syncReminderReconcileItem(item, { requestPermissionIfNeeded: false });
  }
}

export async function cancelReminderNotificationForItem(itineraryItemId: string) {
  const reminder = await getReminderSettingForItem(itineraryItemId);

  if (!reminder) {
    return;
  }

  await cancelNotificationIfPresent(reminder.scheduledNotificationId);
  await clearReminderScheduleMetadata(itineraryItemId);
}

async function syncReminderReconcileItem(
  item: {
    itineraryItemId: string;
    title: string;
    startsAt: string | null;
    enabled: boolean;
    minutesBefore: number;
    scheduledNotificationId: string | null;
    scheduledFor: string | null;
  },
  options?: { requestPermissionIfNeeded?: boolean },
): Promise<ReminderScheduleResult> {
  const expectedScheduledFor = getReminderTriggerTime(item.startsAt, item.minutesBefore);

  if (!item.enabled) {
    await cancelNotificationIfPresent(item.scheduledNotificationId);
    await clearReminderScheduleMetadata(item.itineraryItemId);
    return {
      status: "not_scheduled_disabled",
      scheduledNotificationId: null,
      scheduledFor: null,
    };
  }

  if (!expectedScheduledFor || !isFutureDateTime(expectedScheduledFor)) {
    await cancelNotificationIfPresent(item.scheduledNotificationId);
    await clearReminderScheduleMetadata(item.itineraryItemId);
    return {
      status: "not_scheduled_past_trigger",
      scheduledNotificationId: null,
      scheduledFor: null,
    };
  }

  const permissionGranted = await ensureNotificationPermission(Boolean(options?.requestPermissionIfNeeded));

  if (!permissionGranted) {
    await cancelNotificationIfPresent(item.scheduledNotificationId);
    await clearReminderScheduleMetadata(item.itineraryItemId);
    return {
      status: "not_scheduled_permission_denied",
      scheduledNotificationId: null,
      scheduledFor: null,
    };
  }

  try {
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
    const existingScheduled = item.scheduledNotificationId
      ? scheduledNotifications.some(
          (notification) => notification.identifier === item.scheduledNotificationId,
        )
      : false;

    if (
      existingScheduled &&
      item.scheduledNotificationId &&
      item.scheduledFor === expectedScheduledFor
    ) {
      return {
        status: "scheduled",
        scheduledNotificationId: item.scheduledNotificationId,
        scheduledFor: item.scheduledFor,
      };
    }

    await cancelNotificationIfPresent(item.scheduledNotificationId);

    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: item.title,
        body: formatReminderOffsetLabel(item.minutesBefore),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(expectedScheduledFor),
        ...(Platform.OS === "android" ? { channelId: REMINDER_CHANNEL_ID } : {}),
      },
    });

    await setReminderScheduledMetadata(item.itineraryItemId, identifier, expectedScheduledFor);

    return {
      status: "scheduled",
      scheduledNotificationId: identifier,
      scheduledFor: expectedScheduledFor,
    };
  } catch {
    await clearReminderScheduleMetadata(item.itineraryItemId);
    return {
      status: "not_scheduled_error",
      scheduledNotificationId: null,
      scheduledFor: null,
    };
  }
}

async function ensureNotificationPermission(requestIfNeeded: boolean) {
  const permissions = await Notifications.getPermissionsAsync();

  if (permissions.granted) {
    return true;
  }

  if (!requestIfNeeded) {
    return false;
  }

  const requested = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: false,
      allowSound: true,
    },
  });

  return requested.granted;
}

async function cancelNotificationIfPresent(identifier: string | null) {
  if (!identifier) {
    return;
  }

  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  } catch {
    return;
  }
}
