import {
  CreateCustomItemInput,
  createCustomItineraryItem,
  removeItineraryItem,
  updateCustomItineraryItem,
  UpdateCustomItemInput,
} from "@/db/repositories/itineraryRepository";
import {
  deleteReminderSettingForItem,
  ensureReminderSettingForItem,
  getReminderSettingForItem,
  upsertReminderSetting,
} from "@/db/repositories/reminderRepository";
import { enqueueSyncMutation } from "@/db/repositories/syncQueueRepository";
import {
  cancelReminderNotificationForItem,
  syncReminderNotificationForItem,
} from "@/features/notifications/localNotificationService";
import { localFirstSyncQueueService } from "@/features/sync/LocalFirstSyncQueueService";
import { queryKeys } from "@/lib/query/queryKeys";
import { queryClient } from "@/lib/query/queryClient";

export async function createLocalCustomPlanItem(userId: string, input: CreateCustomItemInput) {
  const itineraryItem = await createCustomItineraryItem(userId, input);
  await ensureReminderSettingForItem(itineraryItem.id);
  await enqueueSyncMutation({
    entityType: "itinerary_item",
    entityId: itineraryItem.id,
    action: "upsert",
    payload: itineraryItem,
  });
  await invalidateLocalQueries(userId);
  void localFirstSyncQueueService.resumeWhenOnline(userId);
  return itineraryItem;
}

export async function updateLocalCustomPlanItem(
  userId: string,
  itemId: string,
  input: UpdateCustomItemInput,
) {
  const itineraryItem = await updateCustomItineraryItem(userId, itemId, input);
  await ensureReminderSettingForItem(itineraryItem.id);
  await syncReminderNotificationForItem(itineraryItem.id, { requestPermissionIfNeeded: false });
  await enqueueSyncMutation({
    entityType: "itinerary_item",
    entityId: itineraryItem.id,
    action: "upsert",
    payload: itineraryItem,
  });
  await invalidateLocalQueries(userId);
  void localFirstSyncQueueService.resumeWhenOnline(userId);
  return itineraryItem;
}

export async function deleteLocalPlanItem(userId: string, itemId: string) {
  await cancelReminderNotificationForItem(itemId);
  const itineraryItem = await removeItineraryItem(userId, itemId);
  await deleteReminderSettingForItem(itemId);
  await enqueueSyncMutation({
    entityType: "itinerary_item",
    entityId: itemId,
    action: "delete",
    payload: itineraryItem,
  });
  await invalidateLocalQueries(userId);
  void localFirstSyncQueueService.resumeWhenOnline(userId);
  return itineraryItem;
}

export async function updateLocalReminderSetting(
  userId: string,
  itineraryItemId: string,
  input: { enabled: boolean; minutesBefore: number },
  options?: { requestPermissionIfNeeded?: boolean },
) {
  const reminder = await upsertReminderSetting(itineraryItemId, input);
  await syncReminderNotificationForItem(itineraryItemId, {
    requestPermissionIfNeeded: options?.requestPermissionIfNeeded ?? false,
  });
  await invalidateLocalQueries(userId);
  return (await getReminderSettingForItem(itineraryItemId)) ?? reminder;
}

async function invalidateLocalQueries(userId: string) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.schedule(userId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.timeline(userId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.pendingSyncCount(userId) }),
  ]);
}
