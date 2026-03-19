import { TimelineEntry } from "@/features/plan/models";
import { rangesOverlap } from "@/lib/time";

export function getConflictedTimelineEntryIds(entries: TimelineEntry[]) {
  const conflictedEntryIds = new Set<string>();

  for (let index = 0; index < entries.length; index += 1) {
    const current = entries[index];

    for (let nextIndex = index + 1; nextIndex < entries.length; nextIndex += 1) {
      const next = entries[nextIndex];

      if (rangesOverlap(current.startsAt, current.endsAt, next.startsAt, next.endsAt)) {
        conflictedEntryIds.add(current.id);
        conflictedEntryIds.add(next.id);
      }
    }
  }

  return conflictedEntryIds;
}
