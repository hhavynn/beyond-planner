import { saveFavoriteSet, unsaveFavoriteSet } from "@/db/repositories/favoritesRepository";
import { addSetToPlan, removeItineraryItem } from "@/db/repositories/itineraryRepository";
import { ensureReminderSettingForItem, deleteReminderSettingForItem } from "@/db/repositories/reminderRepository";
import { enqueueSyncMutation } from "@/db/repositories/syncQueueRepository";
import { cancelReminderNotificationForItem } from "@/features/notifications/localNotificationService";
import { localFirstSyncQueueService } from "@/features/sync/LocalFirstSyncQueueService";
import { queryKeys } from "@/lib/query/queryKeys";
import { queryClient } from "@/lib/query/queryClient";

export async function setFavoriteState(userId: string, setId: string, shouldFavorite: boolean) {
  if (shouldFavorite) {
    const favorite = await saveFavoriteSet(userId, setId);
    await enqueueSyncMutation({
      entityType: "favorite_set",
      entityId: setId,
      action: "upsert",
      payload: favorite,
    });
    await invalidateLocalQueries(userId);
    void localFirstSyncQueueService.resumeWhenOnline(userId);
    return favorite;
  }

  const favorite = await unsaveFavoriteSet(userId, setId);
  await enqueueSyncMutation({
    entityType: "favorite_set",
    entityId: setId,
    action: "delete",
    payload: favorite,
  });
  await invalidateLocalQueries(userId);
  void localFirstSyncQueueService.resumeWhenOnline(userId);
  return favorite;
}

export async function addSetPlanItem(userId: string, setId: string) {
  const itineraryItem = await addSetToPlan(userId, setId);
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

export async function removeSetPlanItem(userId: string, itemId: string) {
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

async function invalidateLocalQueries(userId: string) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.schedule(userId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.timeline(userId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.pendingSyncCount(userId) }),
  ]);
}
