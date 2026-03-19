import { createClient } from "@supabase/supabase-js";

import { supabaseSecureStore } from "@/features/auth/secureStore";
import { env, isSupabaseConfigured } from "@/lib/env";

export const supabase = isSupabaseConfigured()
  ? createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: {
        storage: supabaseSecureStore,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;
