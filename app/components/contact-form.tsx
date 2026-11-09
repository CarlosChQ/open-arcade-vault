"use client";

import { useActionState, useEffect, useRef, useState, type FormEvent } from "react";
import { sendContactMessage, type ContactResult } from "@/app/actions/contact";

const INITIAL_STATE: ContactResult = { status: "idle" };

const ERROR_LABELS = {
  validation: "Validación del formulario",
  "rate-limit": "Límite de envíos alcanzado",
  config: "Servicio no configurado",
  send: "Fallo al transmitir el paquete",
} as const;

export function ContactForm() {
  const [instance, setInstance] = useState(0);

  return (
    <ContactFormInstance
      key={instance}
      onReset={() => setInstance((value) => value + 1)}
    />
  );
}

function ContactFormInstance({ onReset }: { onReset: () => void }) {
  const [state, formAction, pending] = useActionState<ContactResult, FormData>(
    sendContactMessage,
    INITIAL_STATE,
  );
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [shaking, setShaking] = useState(false);
  const shakeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (shakeTimer.current) {
        clearTimeout(shakeTimer.current);
      }
    };
  }, []);

  const triggerShake = () => {
    setShaking(true);

    if (shakeTimer.current) {
      clearTimeout(shakeTimer.current);
    }

    shakeTimer.current = setTimeout(() => {
      setShaking(false);
      shakeTimer.current = null;
    }, 400);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (!name.trim() || !email.trim() || !message.trim()) {
      event.preventDefault();
      triggerShake();
    }
  };

  const fieldErrors = state.status === "error" ? state.fields : undefined;
  const formClassName = "contact-form" + (shaking ? " shake" : "");

  return (
    <form
      className={formClassName}
      action={formAction}
      onSubmit={handleSubmit}
      noValidate
    >
      {state.status === "success" ? (
        <div className="terminal-success" role="status">
          <div className="term-bar">
            <span className="dot r" />
            <span className="dot y" />
            <span className="dot g" />
            <span className="term-title">VAULT-OS // TERMINAL</span>
          </div>
          <div className="term-body">
            <div className="line">
              <span className="prompt">vault@arcade:~$</span> ./send_message
              --to=team
            </div>
            <div className="line dim">[OK] Conectando con servidor…</div>
            <div className="line dim">[OK] Validando contenido…</div>
            <div className="line dim">[OK] Transmitiendo paquete…</div>
            <div className="line success">
              &gt; MENSAJE RECIBIDO. TE RESPONDEREMOS PRONTO. GRACIAS,{" "}
              {state.name.toUpperCase()}.<span className="caret">_</span>
            </div>
            <div style={{ marginTop: 18 }}>
              <button className="btn ghost" type="button" onClick={onReset}>
                ENVIAR OTRO MENSAJE
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {state.status === "error" && (
            <div
              className="terminal-error"
              role="alert"
              style={{ marginBottom: 18 }}
            >
              <div className="term-bar">
                <span className="dot r" />
                <span className="dot y" />
                <span className="dot g" />
                <span className="term-title">VAULT-OS // ERROR</span>
              </div>
              <div className="term-body">
                <div className="line">
                  <span className="prompt">vault@arcade:~$</span> ./send_message
                  --to=team
                </div>
                <div className="line dim">[FAIL] {ERROR_LABELS[state.kind]}</div>
                <div className="line error">
                  &gt; {state.message}
                  <span className="caret">_</span>
                </div>
              </div>
            </div>
          )}

          <div aria-hidden="true" className="contact-honeypot">
            <label htmlFor="contact-website">Website</label>
            <input
              id="contact-website"
              name="website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
            />
          </div>

          <div className="field">
            <label htmlFor="contact-name">NOMBRE</label>
            <input
              id="contact-name"
              name="name"
              type="text"
              placeholder="px_kai"
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              aria-invalid={Boolean(fieldErrors?.name)}
              aria-describedby={
                fieldErrors?.name ? "contact-name-error" : undefined
              }
            />
            {fieldErrors?.name && (
              <div id="contact-name-error" className="contact-field-error">
                {fieldErrors.name}
              </div>
            )}
          </div>

          <div className="field">
            <label htmlFor="contact-email">CORREO ELECTRÓNICO</label>
            <input
              id="contact-email"
              name="email"
              type="email"
              placeholder="jugador@vault.gg"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-invalid={Boolean(fieldErrors?.email)}
              aria-describedby={
                fieldErrors?.email ? "contact-email-error" : undefined
              }
            />
            {fieldErrors?.email && (
              <div id="contact-email-error" className="contact-field-error">
                {fieldErrors.email}
              </div>
            )}
          </div>

          <div className="field">
            <label htmlFor="contact-message">MENSAJE</label>
            <textarea
              id="contact-message"
              name="message"
              rows={5}
              placeholder="Cuéntanos qué tienes en mente…"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              aria-invalid={Boolean(fieldErrors?.message)}
              aria-describedby={
                fieldErrors?.message ? "contact-message-error" : undefined
              }
            />
            {fieldErrors?.message && (
              <div id="contact-message-error" className="contact-field-error">
                {fieldErrors.message}
              </div>
            )}
          </div>

          <button
            className="btn xl press"
            type="submit"
            style={{ width: "100%" }}
            disabled={pending}
            aria-busy={pending}
          >
            {pending ? "ENVIANDO…" : "▶ ENVIAR MENSAJE"}
          </button>
        </>
      )}
    </form>
  );
}
