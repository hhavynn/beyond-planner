export const queryKeys = {
  schedule: (userId: string) => ["schedule", userId] as const,
  timeline: (userId: string) => ["timeline", userId] as const,
  pendingSyncCount: (userId: string) => ["pending-sync-count", userId] as const,
};
