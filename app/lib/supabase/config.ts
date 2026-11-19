export interface SupabaseConfig {
  url: string;
  publishableKey: string;
}

const MISSING_CONFIG_MESSAGE =
  "Supabase no está configurado: define NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY en .env.local.";

function readEnv(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

// Values are read inside the functions so importing this module never throws
// during `next build` when the environment variables are absent.
export function isSupabaseConfigured(): boolean {
  const url = readEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const publishableKey = readEnv(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);

  return Boolean(url && publishableKey);
}

export function getSupabaseConfig(): SupabaseConfig {
  const url = readEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const publishableKey = readEnv(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);

  if (!url || !publishableKey) {
    throw new Error(MISSING_CONFIG_MESSAGE);
  }

  return { url, publishableKey };
}
