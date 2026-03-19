import { PropsWithChildren } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AppBootstrapProvider } from "@/app/AppBootstrapProvider";
import { queryClient } from "@/lib/query/queryClient";

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <AppBootstrapProvider>{children}</AppBootstrapProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
