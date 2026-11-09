"use server";

import { headers } from "next/headers";
import { Resend } from "resend";

export type ContactField = "name" | "email" | "message";

export type ContactResult =
  | { status: "idle" }
  | { status: "success"; name: string }
  | {
      status: "error";
      kind: "validation" | "rate-limit" | "config" | "send";
      message: string;
      fields?: Partial<Record<ContactField, string>>;
    };

interface ContactPayload {
  name: string;
  email: string;
  message: string;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const rateLimitStore = new Map<string, RateLimitEntry>();

function readField(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function validate(payload: ContactPayload): Partial<Record<ContactField, string>> {
  const fields: Partial<Record<ContactField, string>> = {};

  if (payload.name.length < 2 || payload.name.length > 80) {
    fields.name = "Escribe un nombre de entre 2 y 80 caracteres.";
  }

  if (
    payload.email.length === 0 ||
    payload.email.length > 254 ||
    !EMAIL_PATTERN.test(payload.email)
  ) {
    fields.email = "Escribe un correo electrónico válido.";
  }

  if (payload.message.length < 10 || payload.message.length > 2000) {
    fields.message = "El mensaje debe tener entre 10 y 2000 caracteres.";
  }

  return fields;
}

function getClientIp(requestHeaders: { get(name: string): string | null }): string {
  const forwarded = requestHeaders.get("x-forwarded-for");

  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  return requestHeaders.get("x-real-ip")?.trim() || "unknown";
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);

  if (!entry || now >= entry.resetAt) {
    rateLimitStore.set(ip, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return false;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return true;
  }

  entry.count += 1;
  return false;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildText({ name, email, message }: ContactPayload): string {
  return [
    "ARCADE VAULT // CONTACTO",
    "",
    `Nuevo mensaje de ${name}`,
    "",
    `Nombre: ${name}`,
    `Correo: ${email}`,
    "",
    "Mensaje:",
    message,
    "",
    "— Enviado desde el formulario de /about",
  ].join("\n");
}

function buildHtml({ name, email, message }: ContactPayload): string {
  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeMessage = escapeHtml(message).replaceAll("\r\n", "\n").replaceAll("\n", "<br />");

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Nuevo mensaje de ${safeName}</title>
  </head>
  <body style="margin:0;padding:24px;background:#0a0a0f;color:#e6e9ff;font-family:'Courier New',Courier,monospace;">
    <div style="max-width:600px;margin:0 auto;padding:28px;background:#0f0f18;border:1px solid rgba(0,245,255,0.2);">
      <p style="margin:0 0 16px;font-size:12px;letter-spacing:2px;color:#00f5ff;">ARCADE VAULT // CONTACTO</p>
      <h1 style="margin:0 0 20px;font-size:20px;line-height:1.4;color:#e6e9ff;">Nuevo mensaje de ${safeName}</h1>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr>
          <td style="padding:8px 0;color:#8a8fb5;width:90px;">Nombre</td>
          <td style="padding:8px 0;color:#e6e9ff;">${safeName}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#8a8fb5;">Correo</td>
          <td style="padding:8px 0;color:#e6e9ff;">${safeEmail}</td>
        </tr>
      </table>
      <div style="margin-top:20px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.08);">
        <p style="margin:0 0 8px;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#8a8fb5;">Mensaje</p>
        <p style="margin:0;font-size:14px;line-height:1.7;color:#e6e9ff;">${safeMessage}</p>
      </div>
    </div>
  </body>
</html>`;
}

export async function sendContactMessage(
  _previousState: ContactResult,
  formData: FormData,
): Promise<ContactResult> {
  const payload: ContactPayload = {
    name: readField(formData, "name"),
    email: readField(formData, "email"),
    message: readField(formData, "message"),
  };

  if (readField(formData, "website")) {
    return { status: "success", name: payload.name || "JUGADOR" };
  }

  const fields = validate(payload);

  if (Object.keys(fields).length > 0) {
    return {
      status: "error",
      kind: "validation",
      message: "Revisa los campos marcados.",
      fields,
    };
  }

  const requestHeaders = await headers();
  const ip = getClientIp(requestHeaders);

  if (isRateLimited(ip)) {
    return {
      status: "error",
      kind: "rate-limit",
      message:
        "Demasiados mensajes seguidos. Espera unos minutos antes de volver a intentarlo.",
    };
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL;
  const from = process.env.CONTACT_FROM_EMAIL;

  if (!apiKey || !to || !from) {
    console.error(
      "Contact form is missing RESEND_API_KEY, CONTACT_TO_EMAIL or CONTACT_FROM_EMAIL.",
    );
    return {
      status: "error",
      kind: "config",
      message:
        "El formulario no está disponible ahora mismo. Intenta de nuevo más tarde.",
    };
  }

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to,
      replyTo: payload.email,
      subject: `[Arcade Vault] Nuevo mensaje de ${payload.name}`,
      text: buildText(payload),
      html: buildHtml(payload),
    });

    if (error) {
      console.error("Resend error:", error);
      return {
        status: "error",
        kind: "send",
        message: "No pudimos enviar tu mensaje. Intenta de nuevo.",
      };
    }
  } catch (error) {
    console.error("Unexpected contact email error:", error);
    return {
      status: "error",
      kind: "send",
      message: "No pudimos enviar tu mensaje. Intenta de nuevo.",
    };
  }

  return { status: "success", name: payload.name };
}
