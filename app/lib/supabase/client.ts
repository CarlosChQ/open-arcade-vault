"use client";

import { createBrowserClient } from "@supabase/ssr";

import { getSupabaseConfig } from "@/app/lib/supabase/config";
import type { Database } from "@/app/lib/supabase/database.types";

type BrowserClient = ReturnType<typeof createBrowserClient<Database>>;

let browserClient: BrowserClient | null = null;

export function createSupabaseBrowserClient(): BrowserClient {
  if (!browserClient) {
    const { url, publishableKey } = getSupabaseConfig();
    browserClient = createBrowserClient<Database>(url, publishableKey);
  }

  return browserClient;
}
