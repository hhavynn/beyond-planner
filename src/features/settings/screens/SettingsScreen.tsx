import { useEffect, useState } from "react";
import { ActivityIndicator, Text } from "react-native";

import { useAppBootstrap } from "@/app/AppBootstrapProvider";
import { getAppMetaSnapshot } from "@/db/repositories/appMetaRepository";
import { listPendingSyncQueueItems } from "@/db/repositories/syncQueueRepository";
import { AppMetaSnapshot } from "@/domain/models";
import { isSupabaseConfigured } from "@/lib/env";
import { formatTimestamp } from "@/lib/time";
import { KeyValueRow } from "@/ui/KeyValueRow";
import { ScreenContainer } from "@/ui/ScreenContainer";
import { SectionCard } from "@/ui/SectionCard";

export function SettingsScreen() {
  const bootstrap = useAppBootstrap();
  const [meta, setMeta] = useState<AppMetaSnapshot | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (bootstrap.status !== "ready") {
      return;
    }

    async function loadState() {
      const [appMeta, pendingQueue] = await Promise.all([
        getAppMetaSnapshot(),
        listPendingSyncQueueItems(),
      ]);

      setMeta(appMeta);
      setPendingCount(pendingQueue.length);
    }

    void loadState();
  }, [bootstrap.status]);

  if (bootstrap.status !== "ready") {
    return (
      <ScreenContainer>
        <ActivityIndicator />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <SectionCard title="App State" subtitle="Foundation bootstrap and environment summary">
        <KeyValueRow label="Local profile" value={bootstrap.localProfileId ?? "Unavailable"} />
        <KeyValueRow label="Supabase configured" value={isSupabaseConfigured() ? "Yes" : "No"} />
        <KeyValueRow label="Content version" value={String(meta?.contentVersion ?? "n/a")} />
        <KeyValueRow label="Seeded at" value={formatTimestamp(meta?.seededAt ?? null)} />
        <KeyValueRow label="Pending sync items" value={String(pendingCount)} />
      </SectionCard>

      <SectionCard title="Stubbed Areas">
        <Text>Anonymous auth flow is configured at the client layer, but not yet executed.</Text>
        <Text>Remote sync is queued locally only.</Text>
        <Text>Groups and remote collaboration are still stubbed.</Text>
      </SectionCard>
    </ScreenContainer>
  );
}
