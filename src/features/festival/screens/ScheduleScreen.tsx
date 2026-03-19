import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";

import { useAppBootstrap } from "@/app/AppBootstrapProvider";
import { getFestival, listScheduleSetListItems } from "@/db/repositories/referenceRepository";
import { Festival } from "@/domain/models";
import { addSetPlanItem, removeSetPlanItem, setFavoriteState } from "@/features/festival/localActions";
import { ScheduleSetListItem } from "@/features/festival/models";
import { queryKeys } from "@/lib/query/queryKeys";
import { KeyValueRow } from "@/ui/KeyValueRow";
import { PrimaryButton } from "@/ui/PrimaryButton";
import { ScreenContainer } from "@/ui/ScreenContainer";
import { SectionCard } from "@/ui/SectionCard";

export function ScheduleScreen() {
  const bootstrap = useAppBootstrap();
  const [busySetId, setBusySetId] = useState<string | null>(null);

  const festivalQuery = useQuery<Festival | null>({
    queryKey: ["festival"],
    queryFn: getFestival,
    enabled: bootstrap.status === "ready",
  });

  const scheduleQuery = useQuery<ScheduleSetListItem[]>({
    queryKey: bootstrap.localProfileId ? queryKeys.schedule(bootstrap.localProfileId) : ["schedule", "guest"],
    queryFn: () => listScheduleSetListItems(bootstrap.localProfileId as string),
    enabled: bootstrap.status === "ready" && Boolean(bootstrap.localProfileId),
  });

  async function handleFavoriteToggle(item: ScheduleSetListItem) {
    if (!bootstrap.localProfileId) {
      return;
    }

    setBusySetId(item.setId);

    try {
      await setFavoriteState(bootstrap.localProfileId, item.setId, !item.isFavorite);
    } finally {
      setBusySetId(null);
    }
  }

  async function handlePlanToggle(item: ScheduleSetListItem) {
    if (!bootstrap.localProfileId) {
      return;
    }

    setBusySetId(item.setId);

    try {
      if (item.isInPlan && item.planItemId) {
        await removeSetPlanItem(bootstrap.localProfileId, item.planItemId);
      } else {
        await addSetPlanItem(bootstrap.localProfileId, item.setId);
      }
    } finally {
      setBusySetId(null);
    }
  }

  if (bootstrap.status === "loading" || bootstrap.status === "idle") {
    return (
      <ScreenContainer>
        <ActivityIndicator />
        <Text>Bootstrapping local event data...</Text>
      </ScreenContainer>
    );
  }

  if (bootstrap.status === "error") {
    return (
      <ScreenContainer>
        <Text>Bootstrap failed: {bootstrap.error}</Text>
      </ScreenContainer>
    );
  }

  if (scheduleQuery.isLoading || festivalQuery.isLoading) {
    return (
      <ScreenContainer>
        <ActivityIndicator />
        <Text>Loading local schedule...</Text>
      </ScreenContainer>
    );
  }

  const festival = festivalQuery.data;
  const scheduleItems = scheduleQuery.data ?? [];

  return (
    <ScreenContainer>
      <SectionCard
        title={festival?.editionLabel ?? "Beyond Wonderland SoCal 2026"}
        subtitle="SQLite-backed schedule browsing with local plan and favorite actions"
      >
        <KeyValueRow label="Seeded sets" value={String(scheduleItems.length)} />
        <KeyValueRow label="Favorites" value={String(scheduleItems.filter((item) => item.isFavorite).length)} />
        <KeyValueRow label="In My Plan" value={String(scheduleItems.filter((item) => item.isInPlan).length)} />
      </SectionCard>

      <SectionCard title="Schedule">
        {scheduleItems.length === 0 ? (
          <Text>No seeded sets available.</Text>
        ) : (
          scheduleItems.map((item) => {
            const isBusy = busySetId === item.setId;

            return (
              <View key={item.setId} style={styles.row}>
                <View style={styles.rowHeader}>
                  <Text style={styles.title}>{item.title}</Text>
                  {item.isPlaceholder ? <Text style={styles.badge}>Seed placeholder</Text> : null}
                </View>
                <Text style={styles.meta}>{item.dayLabel}</Text>
                <Text style={styles.meta}>{item.stageLabel}</Text>
                <Text style={styles.meta}>{item.timeLabel}</Text>
                <View style={styles.actionRow}>
                  <View style={styles.action}>
                    <PrimaryButton
                      label={item.isFavorite ? "Unfavorite" : "Favorite"}
                      onPress={() => handleFavoriteToggle(item)}
                      disabled={isBusy}
                      variant={item.isFavorite ? "secondary" : "primary"}
                    />
                  </View>
                  <View style={styles.action}>
                    <PrimaryButton
                      label={item.isInPlan ? "Remove from Plan" : "Add to My Plan"}
                      onPress={() => handlePlanToggle(item)}
                      disabled={isBusy}
                      variant={item.isInPlan ? "danger" : "primary"}
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
  row: {
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e6dcc8",
    gap: 4,
  },
  rowHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: "#2d2a26",
  },
  badge: {
    fontSize: 11,
    color: "#6c655a",
    backgroundColor: "#f0e5cf",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  meta: {
    fontSize: 14,
    color: "#5d564d",
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  action: {
    flex: 1,
  },
});
