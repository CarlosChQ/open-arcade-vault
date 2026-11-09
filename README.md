## Arcade Vault

Es una plataforma para jugar online y competir por la mayor cantidad de puntos.

## Usa Spec Driven Design

Basado en /spec y /spec-impl

Siguiendo las buenas practicas recomendadas aquí:
https://github.com/Klerith/fernando-skills

## Skills usadas

```bash
npx skills@latest add Klerith/fernando-skills
```
## Commands

- `npm run dev` — Turbopack dev server. If one is already running, Next reports its URL/PID via `.next/dev/lock`; reuse it instead of killing the session.
- `npm run lint` — ESLint flat config. `next build` does **not** lint (Next 16 removed `next lint`).
- `npx next typegen`, then `npx tsc --noEmit` — focused typecheck. `next-env.d.ts` and `.next/types` are generated and gitignored, so run `typegen` first on a clean checkout.
- `npm run build` — production build; includes TypeScript checking.
- No test runner or `test` script exists. No CI/pre-commit config either, so verification is manual.

## Variables de entorno

Copia `.env.template` a `.env.local` y completa los valores:

| Variable | Descripción |
| --- | --- |
| `RESEND_API_KEY` | API key de [Resend](https://resend.com). Si falta, el formulario de contacto responde con un error de configuración y no envía nada. |
| `CONTACT_TO_EMAIL` | Dirección que recibe los mensajes enviados desde `/about`. |
| `CONTACT_FROM_EMAIL` | Remitente del correo, con formato `Nombre <correo@dominio>`. El dominio debe estar verificado en Resend. |

Resend exige un dominio verificado para enviar a cualquier destinatario. `onboarding@resend.dev` solo permite enviar a la dirección de la cuenta del dueño, así que verifica tu dominio y configura sus registros SPF y DKIM en el panel de Resend antes de usar `CONTACT_FROM_EMAIL` en producción.