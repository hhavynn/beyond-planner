import { useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from "react-native";
import { useQuery } from "@tanstack/react-query";

import { useAppBootstrap } from "@/app/AppBootstrapProvider";
import { getPendingSyncQueueCount } from "@/db/repositories/syncQueueRepository";
import { listTimelineEntries } from "@/db/repositories/itineraryRepository";
import { getConflictedTimelineEntryIds } from "@/features/plan/conflicts";
import { DateTimeField } from "@/features/plan/components/DateTimeField";
import { ReminderControls } from "@/features/plan/components/ReminderControls";
import {
  createLocalCustomPlanItem,
  deleteLocalPlanItem,
  updateLocalCustomPlanItem,
  updateLocalReminderSetting,
} from "@/features/plan/localActions";
import { TimelineEntry } from "@/features/plan/models";
import {
  dateToIsoString,
  isValidDateRange,
  isoStringToDate,
} from "@/lib/time";
import { queryKeys } from "@/lib/query/queryKeys";
import { KeyValueRow } from "@/ui/KeyValueRow";
import { PrimaryButton } from "@/ui/PrimaryButton";
import { ScreenContainer } from "@/ui/ScreenContainer";
import { SectionCard } from "@/ui/SectionCard";

type CustomItemFormState = {
  title: string;
  startsAt: Date | null;
  endsAt: Date | null;
  locationLabel: string;
  notes: string;
};

const EMPTY_FORM: CustomItemFormState = {
  title: "",
  startsAt: null,
  endsAt: null,
  locationLabel: "",
  notes: "",
};

export function MyPlanScreen() {
  const bootstrap = useAppBootstrap();
  const [formState, setFormState] = useState<CustomItemFormState>(EMPTY_FORM);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [busyItemId, setBusyItemId] = useState<string | null>(null);
  const [busyReminderItemId, setBusyReminderItemId] = useState<string | null>(null);

  const timelineQuery = useQuery<TimelineEntry[]>({
    queryKey: bootstrap.localProfileId ? queryKeys.timeline(bootstrap.localProfileId) : ["timeline", "guest"],
    queryFn: () => listTimelineEntries(bootstrap.localProfileId as string),
    enabled: bootstrap.status === "ready" && Boolean(bootstrap.localProfileId),
  });

  const pendingQueueQuery = useQuery<number>({
    queryKey: bootstrap.localProfileId
      ? queryKeys.pendingSyncCount(bootstrap.localProfileId)
      : ["pending-sync-count", "guest"],
    queryFn: getPendingSyncQueueCount,
    enabled: bootstrap.status === "ready" && Boolean(bootstrap.localProfileId),
  });

  const timelineEntries = timelineQuery.data ?? [];
  const conflictedEntryIds = useMemo(
    () => getConflictedTimelineEntryIds(timelineEntries),
    [timelineEntries],
  );

  function resetForm() {
    setFormState(EMPTY_FORM);
    setEditingItemId(null);
    setFormError(null);
  }

  function beginEdit(entry: TimelineEntry) {
    setEditingItemId(entry.id);
    setFormError(null);
    setFormState({
      title: entry.title,
      startsAt: isoStringToDate(entry.startsAt),
      endsAt: isoStringToDate(entry.endsAt),
      locationLabel: entry.locationLabel ?? "",
      notes: entry.notes ?? "",
    });
  }

  function validateForm() {
    if (!formState.title.trim()) {
      return { error: "Title is required." };
    }

    const normalizedStartsAt = dateToIsoString(formState.startsAt);
    const normalizedEndsAt = dateToIsoString(formState.endsAt);

    if (!normalizedStartsAt) {
      return { error: "Start date and time are required." };
    }

    if (!normalizedEndsAt) {
      return { error: "End date and time are required." };
    }

    if (!isValidDateRange(normalizedStartsAt, normalizedEndsAt)) {
      return { error: "End time must be after start time." };
    }

    return {
      error: null,
      normalizedStartsAt,
      normalizedEndsAt,
    };
  }

  async function handleSubmit() {
    if (!bootstrap.localProfileId) {
      return;
    }

    const validation = validateForm();

    if (validation.error || !validation.normalizedStartsAt || !validation.normalizedEndsAt) {
      setFormError(validation.error ?? "Invalid form state.");
      return;
    }

    setFormError(null);
    setIsSaving(true);

    try {
      const payload = {
        title: formState.title.trim(),
        startsAt: validation.normalizedStartsAt,
        endsAt: validation.normalizedEndsAt,
        locationLabel: formState.locationLabel.trim() || null,
        notes: formState.notes.trim() || null,
      };

      if (editingItemId) {
        await updateLocalCustomPlanItem(bootstrap.localProfileId, editingItemId, payload);
      } else {
        await createLocalCustomPlanItem(bootstrap.localProfileId, payload);
      }

      resetForm();
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(entry: TimelineEntry) {
    if (!bootstrap.localProfileId) {
      return;
    }

    setBusyItemId(entry.id);

    try {
      await deleteLocalPlanItem(bootstrap.localProfileId, entry.id);

      if (editingItemId === entry.id) {
        resetForm();
      }
    } finally {
      setBusyItemId(null);
    }
  }

  async function handleReminderEnabledChange(entry: TimelineEntry, enabled: boolean) {
    if (!bootstrap.localProfileId) {
      return;
    }

    setBusyReminderItemId(entry.id);

    try {
      await updateLocalReminderSetting(bootstrap.localProfileId, entry.id, {
        enabled,
        minutesBefore: entry.reminderMinutesBefore ?? 15,
      }, {
        requestPermissionIfNeeded: enabled && !entry.reminderEnabled,
      });
    } finally {
      setBusyReminderItemId(null);
    }
  }

  async function handleReminderOffsetChange(entry: TimelineEntry, minutesBefore: number) {
    if (!bootstrap.localProfileId) {
      return;
    }

    setBusyReminderItemId(entry.id);

    try {
      await updateLocalReminderSetting(bootstrap.localProfileId, entry.id, {
        enabled: entry.reminderEnabled,
        minutesBefore,
      }, {
        requestPermissionIfNeeded: false,
      });
    } finally {
      setBusyReminderItemId(null);
    }
  }

  if (bootstrap.status !== "ready") {
    return (
      <ScreenContainer>
        <ActivityIndicator />
      </ScreenContainer>
    );
  }

  if (timelineQuery.isLoading || pendingQueueQuery.isLoading) {
    return (
      <ScreenContainer>
        <ActivityIndicator />
        <Text>Loading local plan...</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <SectionCard
        title="My Plan"
        subtitle="SQLite-backed local timeline with reminder editing and local scheduling"
      >
        <KeyValueRow label="Timeline items" value={String(timelineEntries.length)} />
        <KeyValueRow label="Conflicts" value={String(conflictedEntryIds.size)} />
        <KeyValueRow label="Pending sync items" value={String(pendingQueueQuery.data ?? 0)} />
      </SectionCard>

      {conflictedEntryIds.size > 0 ? (
        <SectionCard title="Conflict Warning" subtitle="Some itinerary items overlap in time.">
          <Text>{conflictedEntryIds.size} item(s) are currently in conflict.</Text>
        </SectionCard>
      ) : null}

      <SectionCard
        title={editingItemId ? "Edit Custom Item" : "Add Custom Item"}
        subtitle="Use the native date and time pickers."
      >
        <TextInput
          value={formState.title}
          onChangeText={(value) => setFormState((current) => ({ ...current, title: value }))}
          placeholder="Title"
          style={styles.input}
        />
        <DateTimeField
          label="Start"
          value={formState.startsAt}
          onChange={(value) => setFormState((current) => ({ ...current, startsAt: value }))}
        />
        <DateTimeField
          label="End"
          value={formState.endsAt}
          onChange={(value) => setFormState((current) => ({ ...current, endsAt: value }))}
        />
        <TextInput
          value={formState.locationLabel}
          onChangeText={(value) => setFormState((current) => ({ ...current, locationLabel: value }))}
          placeholder="Location"
          style={styles.input}
        />
        <TextInput
          value={formState.notes}
          onChangeText={(value) => setFormState((current) => ({ ...current, notes: value }))}
          placeholder="Notes"
          style={[styles.input, styles.notesInput]}
          multiline
        />
        {formError ? <Text style={styles.error}>{formError}</Text> : null}
        <View style={styles.buttonRow}>
          <View style={styles.buttonCell}>
            <PrimaryButton
              label={isSaving ? "Saving..." : editingItemId ? "Save Changes" : "Add Custom Item"}
              onPress={handleSubmit}
              disabled={isSaving}
            />
          </View>
          {editingItemId ? (
            <View style={styles.buttonCell}>
              <PrimaryButton label="Cancel" onPress={resetForm} variant="secondary" />
            </View>
          ) : null}
        </View>
      </SectionCard>

      <SectionCard title="Timeline">
        {timelineEntries.length === 0 ? (
          <Text>No itinerary items yet. Add a set from Schedule or create a custom item here.</Text>
        ) : (
          timelineEntries.map((entry) => {
            const isBusy = busyItemId === entry.id;
            const isConflicted = conflictedEntryIds.has(entry.id);
            const reminderBusy = busyReminderItemId === entry.id;

            return (
              <View key={entry.id} style={[styles.timelineRow, isConflicted ? styles.conflictRow : null]}>
                <View style={styles.timelineHeader}>
                  <Text style={styles.timelineTitle}>{entry.title}</Text>
                  <Text style={styles.timelineKind}>{entry.typeLabel}</Text>
                </View>
                <Text style={styles.timelineMeta}>{entry.timeLabel}</Text>
                {entry.locationLabel ? <Text style={styles.timelineMeta}>{entry.locationLabel}</Text> : null}
                {entry.notes ? <Text style={styles.timelineMeta}>{entry.notes}</Text> : null}
                <Text style={styles.timelineMeta}>{entry.reminderStatusLabel}</Text>
                {isConflicted ? <Text style={styles.conflictText}>Conflicts with another plan item.</Text> : null}

                <ReminderControls
                  enabled={entry.reminderEnabled}
                  minutesBefore={entry.reminderMinutesBefore ?? 15}
                  disabled={reminderBusy}
                  onEnabledChange={(enabled) => handleReminderEnabledChange(entry, enabled)}
                  onMinutesBeforeChange={(minutesBefore) => handleReminderOffsetChange(entry, minutesBefore)}
                />

                <View style={styles.buttonRow}>
                  {entry.canEdit ? (
                    <View style={styles.buttonCell}>
                      <PrimaryButton label="Edit" onPress={() => beginEdit(entry)} variant="secondary" />
                    </View>
                  ) : null}
                  <View style={styles.buttonCell}>
                    <PrimaryButton
                      label={entry.kind === "set" ? "Remove from Plan" : "Delete"}
                      onPress={() => handleDelete(entry)}
                      disabled={isBusy}
                      variant="danger"
                    />
                  </View>
                </View>
              </View>
            );
          })
        )}
      </SectionCard>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: "#d4c8b2",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#ffffff",
  },
  notesInput: {
    minHeight: 90,
    textAlignVertical: "top",
  },
  error: {
    color: "#8b2e2e",
    fontSize: 13,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 8,
  },
  buttonCell: {
    flex: 1,
  },
  timelineRow: {
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e6dcc8",
    gap: 8,
  },
  conflictRow: {
    borderBottomColor: "#c86d5b",
  },
  timelineHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  timelineTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: "#2d2a26",
  },
  timelineKind: {
    fontSize: 12,
    color: "#5d564d",
    backgroundColor: "#f0e5cf",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  timelineMeta: {
    color: "#5d564d",
    fontSize: 14,
  },
  conflictText: {
    color: "#8b2e2e",
    fontSize: 13,
    fontWeight: "600",
  },
});
