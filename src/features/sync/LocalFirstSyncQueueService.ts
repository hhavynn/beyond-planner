import { FavoriteSet, ItineraryItem, SyncQueueItem } from "@/domain/models";
import {
  upsertFavoriteSetFromRemote,
} from "@/db/repositories/favoritesRepository";
import {
  getItineraryItem,
  upsertItineraryItemFromRemote,
} from "@/db/repositories/itineraryRepository";
import {
  listPendingSyncQueueItems,
  markSyncQueueItemCompleted,
  markSyncQueueItemFailed,
  markSyncQueueItemProcessing,
  resetProcessingSyncQueueItems,
} from "@/db/repositories/syncQueueRepository";
import { cancelReminderNotificationForItem } from "@/features/notifications/localNotificationService";
import { SyncFlushResult, SyncQueueService } from "@/features/sync/types";
import { queryKeys } from "@/lib/query/queryKeys";
import { queryClient } from "@/lib/query/queryClient";
import { supabase } from "@/lib/supabase/client";

type RemoteFavoriteRow = {
  user_id: string;
  set_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type RemoteItineraryRow = {
  id: string;
  user_id: string;
  kind: "set" | "custom";
  title: string;
  set_id: string | null;
  starts_at: string | null;
  ends_at: string | null;
  location_label: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export class LocalFirstSyncQueueService implements SyncQueueService {
  async enqueuePendingChange(_item: SyncQueueItem) {
    return Promise.resolve();
  }

  async flushPendingChanges(localUserId: string): Promise<SyncFlushResult> {
    if (!supabase) {
      return {
        processed: 0,
        failed: 0,
        skipped: 0,
        status: "deferred_no_session",
      };
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const authUserId = session?.user.id;

    if (!authUserId) {
      return {
        processed: 0,
        failed: 0,
        skipped: 0,
        status: "deferred_no_session",
      };
    }

    await resetProcessingSyncQueueItems();
    const queueItems = await listPendingSyncQueueItems();

    let processed = 0;
    let failed = 0;
    let skipped = 0;

    for (const item of queueItems) {
      if (item.entityType !== "favorite_set" && item.entityType !== "itinerary_item") {
        skipped += 1;
        continue;
      }

      try {
        await markSyncQueueItemProcessing(item.id);

        if (item.entityType === "favorite_set") {
          const payload = JSON.parse(item.payloadJson) as FavoriteSet;
          await this.pushFavorite(authUserId, payload);
        } else {
          const payload = JSON.parse(item.payloadJson) as ItineraryItem;
          await this.pushItineraryItem(authUserId, payload);
        }

        await markSyncQueueItemCompleted(item.id);
        processed += 1;
      } catch (error) {
        failed += 1;
        await markSyncQueueItemFailed(
          item.id,
          error instanceof Error ? error.message : "Unknown sync error",
        );
      }
    }

    try {
      await this.pullRemoteSnapshot(localUserId, authUserId);
      await invalidateLocalSyncQueries(localUserId);
    } catch {
      failed += 1;
    }

    return {
      processed,
      failed,
      skipped,
      status: failed > 0 ? "partial_failure" : "synced",
    };
  }

  async resumeWhenOnline(localUserId: string) {
    try {
      await this.flushPendingChanges(localUserId);
    } catch {
      return;
    }
  }

  private async pushFavorite(authUserId: string, payload: FavoriteSet) {
    const remoteRow: RemoteFavoriteRow = {
      user_id: authUserId,
      set_id: payload.setId,
      created_at: payload.createdAt,
      updated_at: payload.updatedAt,
      deleted_at: payload.deletedAt,
    };

    const { error } = await supabase!.from("user_favorite_sets").upsert(remoteRow, {
      onConflict: "user_id,set_id",
    });

    if (error) {
      throw error;
    }
  }

  private async pushItineraryItem(authUserId: string, payload: ItineraryItem) {
    const remoteRow: RemoteItineraryRow = {
      id: payload.id,
      user_id: authUserId,
      kind: payload.kind === "set" ? "set" : "custom",
      title: payload.title,
      set_id: payload.setId,
      starts_at: payload.startsAt,
      ends_at: payload.endsAt,
      location_label: payload.locationLabel,
      notes: payload.notes,
      created_at: payload.createdAt,
      updated_at: payload.updatedAt,
      deleted_at: payload.deletedAt,
    };

    const { error } = await supabase!.from("user_itinerary_items").upsert(remoteRow, {
      onConflict: "id",
    });

    if (error) {
      throw error;
    }
  }

  private async pullRemoteSnapshot(localUserId: string, authUserId: string) {
    const [favoritesResult, itineraryResult] = await Promise.all([
      supabase!
        .from("user_favorite_sets")
        .select("*")
        .eq("user_id", authUserId),
      supabase!
        .from("user_itinerary_items")
        .select("*")
        .eq("user_id", authUserId),
    ]);

    if (favoritesResult.error) {
      throw favoritesResult.error;
    }

    if (itineraryResult.error) {
      throw itineraryResult.error;
    }

    for (const row of favoritesResult.data as RemoteFavoriteRow[]) {
      await upsertFavoriteSetFromRemote(localUserId, {
        userId: localUserId,
        setId: row.set_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        deletedAt: row.deleted_at,
      }, {
        preserveLocal: true,
      });
    }

    for (const row of itineraryResult.data as RemoteItineraryRow[]) {
      const localBeforeMerge = await getItineraryItem(localUserId, row.id);

      await upsertItineraryItemFromRemote(
        localUserId,
        {
          id: row.id,
          userId: localUserId,
          kind: row.kind,
          title: row.title,
          setId: row.set_id,
          groupId: null,
          startsAt: row.starts_at,
          endsAt: row.ends_at,
          locationLabel: row.location_label,
          notes: row.notes,
          status: null,
          isCompleted: false,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          deletedAt: row.deleted_at,
        },
        {
          preserveLocal: true,
        },
      );

      const didRemoteTombstoneWin =
        Boolean(row.deleted_at) &&
        (!localBeforeMerge || localBeforeMerge.updatedAt < row.updated_at);

      if (didRemoteTombstoneWin) {
        await cancelReminderNotificationForItem(row.id);
      }
    }
  }
}

async function invalidateLocalSyncQueries(localUserId: string) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.schedule(localUserId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.timeline(localUserId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.pendingSyncCount(localUserId) }),
  ]);
}

export const localFirstSyncQueueService = new LocalFirstSyncQueueService();
