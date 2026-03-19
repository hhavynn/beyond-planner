import { useEffect, useState } from "react";
import { ActivityIndicator, Text } from "react-native";

import { useAppBootstrap } from "@/app/AppBootstrapProvider";
import { listCachedGroups } from "@/db/repositories/groupCacheRepository";
import { GroupCache } from "@/domain/models";
import { ScreenContainer } from "@/ui/ScreenContainer";
import { SectionCard } from "@/ui/SectionCard";

export function FriendsScreen() {
  const bootstrap = useAppBootstrap();
  const [groups, setGroups] = useState<GroupCache[]>([]);

  useEffect(() => {
    if (bootstrap.status !== "ready") {
      return;
    }

    async function loadGroups() {
      const cachedGroups = await listCachedGroups();
      setGroups(cachedGroups);
    }

    void loadGroups();
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
      <SectionCard title="Friends & Groups" subtitle="Scaffold only for this pass">
        <Text>Cached groups: {groups.length}</Text>
        <Text>Group creation, membership, and meetup flows are intentionally not implemented yet.</Text>
      </SectionCard>
    </ScreenContainer>
  );
}
