#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";

const ENV_FILE = path.join(process.cwd(), ".env.local");
const URL_VAR = "NEXT_PUBLIC_SUPABASE_URL";
const KEY_VAR = "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY";
const REQUEST_TIMEOUT_MS = 10_000;

function fail(message) {
  console.error(`✖ ${message}`);
  process.exit(1);
}

// Minimal `.env.local` parser: enough for KEY=value lines, no extra dependency.
async function readLocalEnv() {
  const values = {};
  let content;

  try {
    content = await readFile(ENV_FILE, "utf8");
  } catch {
    return values;
  }

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separator = trimmed.indexOf("=");

    if (separator === -1) {
      continue;
    }

    const name = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();

    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1);
    }

    values[name] = value;
  }

  return values;
}

function pick(name, localEnv) {
  const fromProcess = process.env[name]?.trim();

  if (fromProcess) {
    return fromProcess;
  }

  return localEnv[name]?.trim() || null;
}

const localEnv = await readLocalEnv();
const url = pick(URL_VAR, localEnv);
const publishableKey = pick(KEY_VAR, localEnv);

if (!url || !publishableKey) {
  fail(
    `Falta configuración de Supabase: define ${URL_VAR} y ${KEY_VAR} en .env.local.`,
  );
}

let healthUrl;

try {
  const baseUrl = new URL(url);

  if (baseUrl.protocol !== "http:" && baseUrl.protocol !== "https:") {
    throw new Error("unsupported protocol");
  }

  healthUrl = `${baseUrl.origin}${baseUrl.pathname.replace(/\/+$/, "")}/auth/v1/health`;
} catch {
  fail(
    `${URL_VAR} no es una URL válida. Debe empezar por https:// (por ejemplo https://tu-proyecto.supabase.co).`,
  );
}

let response;

try {
  response = await fetch(healthUrl, {
    headers: { apikey: publishableKey },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
} catch (error) {
  const reason =
    error instanceof Error && error.message ? `: ${error.message}` : ".";

  fail(
    `No se pudo conectar con Supabase${reason} Revisa ${URL_VAR} y tu conexión de red.`,
  );
}

if (!response.ok) {
  fail(
    `Supabase respondió con estado HTTP ${response.status}. Revisa ${KEY_VAR} y ${URL_VAR}.`,
  );
}

let version = null;

try {
  const body = await response.json();

  if (typeof body?.version === "string" && body.version.trim()) {
    version = body.version.trim();
  }
} catch {
  // A 200 without a readable body still means the URL and key work.
}

const label = version ? (version.startsWith("v") ? version : `v${version}`) : null;

console.log(`✔ Supabase conectado${label ? ` · GoTrue ${label}` : ""}`);
