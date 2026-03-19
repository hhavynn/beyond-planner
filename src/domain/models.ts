export type Festival = {
  id: string;
  slug: string;
  name: string;
  editionLabel: string;
  timezone: string;
  city: string | null;
  state: string | null;
  contentVersion: number;
};

export type FestivalDay = {
  id: string;
  festivalId: string;
  label: string;
  dateLocal: string | null;
  sortOrder: number;
};

export type Stage = {
  id: string;
  festivalId: string;
  dayId: string | null;
  name: string;
  slug: string;
  areaKind: string | null;
  sortOrder: number;
};

export type Artist = {
  id: string;
  slug: string | null;
  name: string;
};

export type ArtistSet = {
  id: string;
  festivalId: string;
  dayId: string;
  stageId: string;
  artistId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  isPlaceholder: boolean;
};

export type ItineraryItemKind = "set" | "custom" | "meetup" | "logistics";

export type ItineraryItem = {
  id: string;
  userId: string;
  kind: ItineraryItemKind;
  title: string;
  setId: string | null;
  groupId: string | null;
  startsAt: string | null;
  endsAt: string | null;
  locationLabel: string | null;
  notes: string | null;
  status: string | null;
  isCompleted: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type FavoriteSet = {
  userId: string;
  setId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type ReminderSetting = {
  id: string;
  itineraryItemId: string;
  minutesBefore: number;
  enabled: boolean;
  lastScheduledAt: string | null;
  scheduledNotificationId: string | null;
  scheduledFor: string | null;
};

export type GroupCache = {
  id: string;
  name: string;
  inviteCode: string | null;
  ownerUserId: string | null;
  lastSyncedAt: string | null;
};

export type GroupMembershipCache = {
  id: string;
  groupId: string;
  userId: string;
  role: string;
  lastSyncedAt: string | null;
};

export type MeetupItemCache = {
  id: string;
  groupId: string;
  title: string;
  locationLabel: string | null;
  startsAt: string | null;
  endsAt: string | null;
  notes: string | null;
  lastSyncedAt: string | null;
};

export type LogisticsChecklistItem = {
  id: string;
  userId: string;
  title: string;
  notes: string | null;
  isCompleted: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SyncEntityType =
  | "favorite_set"
  | "itinerary_item"
  | "checklist_item"
  | "meetup_item";

export type SyncAction = "upsert" | "delete";

export type SyncQueueItem = {
  id: string;
  entityType: SyncEntityType;
  entityId: string;
  action: SyncAction;
  payloadJson: string;
  status: "pending" | "processing" | "failed" | "completed";
  attempts: number;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AppMetaSnapshot = {
  contentVersion: number | null;
  seededAt: string | null;
};
