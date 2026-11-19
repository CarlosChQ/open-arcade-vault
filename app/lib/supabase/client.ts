"use client";

import { createBrowserClient } from "@supabase/ssr";

import { getSupabaseConfig } from "@/app/lib/supabase/config";

type BrowserClient = ReturnType<typeof createBrowserClient>;

let browserClient: BrowserClient | null = null;

export function createSupabaseBrowserClient(): BrowserClient {
  if (!browserClient) {
    const { url, publishableKey } = getSupabaseConfig();
    browserClient = createBrowserClient(url, publishableKey);
  }

  return browserClient;
}
