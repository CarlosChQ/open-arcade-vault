# SPEC 03 — Página Acerca de y contacto por correo con Resend

> **Estado:** Aprobado
> **Depende de:** SPEC 02
> **Fecha:** 2026-11-08
> **Objetivo:** Implementar `/about` con fidelidad al template `home-about` y enviar el formulario de contacto por correo real usando Resend.

## Por qué existe esta spec

SPEC 02 dejó la página Acerca de fuera de alcance y omitió su link en el nav. El template `home-about` ya define la pantalla completa, incluido un formulario que solo simulaba el envío. Esta spec cierra ese hueco visual y convierte el formulario en un envío real de correo, sin agregar base de datos ni un panel de mensajes.

## Alcance

**In:**

- Nueva ruta `/about` como server component, con estas secciones en orden:
  - Hero con kicker `▸ ACERCA DE`, título `ACERCA DE ARCADE VAULT` y párrafo de misión.
  - Tres tarjetas highlight: `HECHO CON ❤️ PARA JUGADORES` (magenta), `JUEGOS EN HTML — CORREN EN CUALQUIER NAVEGADOR` (cyan) y `PROYECTO EN CONSTANTE CRECIMIENTO` (green), cada una con su icono pixel.
  - Divisor con dos barras y 24 pixeles parpadeantes.
  - Sección `▸ CONTACTO` con intro, tres tips y formulario de nombre, correo y mensaje.
- Formulario cliente con validación, estado pendiente, animación `shake`, terminal de éxito y terminal de error.
- Server Action `sendContactMessage` en `app/actions/contact.ts` que valida, aplica rate limit y llama a Resend.
- Envío de un solo correo de notificación a `CONTACT_TO_EMAIL`, con `replyTo` igual al correo del usuario.
- Versiones `text` y `html` del mismo correo.
- Honeypot invisible y rate limit en memoria de 5 envíos cada 10 minutos por IP.
- Link `Acerca de` en el nav de desktop y en el panel móvil, activo solo en `/about`.
- Estilos de la página portados desde `references/resources/templates/home-about/styles.css`.
- `metadata` propia de `/about`.
- `.env.template` con las tres variables, excepción en `.gitignore` y sección de variables en `README.md`.
- Dependencia `resend` en `package.json`.

**Fuera de alcance (para futuras specs):**

- Acuse de recibo automático al usuario que escribe.
- Persistencia de mensajes, base de datos, CRM o panel de administración.
- Captcha externo (Cloudflare Turnstile, reCAPTCHA) o moderación de contenido.
- Adjuntos, campos adicionales (teléfono, asunto) o selección de destinatario.
- Autenticación obligatoria para contactar.
- Cambios en el footer, en la landing o en las demás pantallas.
- Tests automatizados, i18n, analítica y monitoreo de entregabilidad.
- Envío de correos transaccionales distintos al formulario de contacto.

## Modelo de datos

No hay persistencia. El formulario usa estado en memoria y la Server Action devuelve un resultado tipado.

```ts
// app/actions/contact.ts
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
  name: string; // 2-80 caracteres, trim
  email: string; // formato email, máximo 254 caracteres
  message: string; // 10-2000 caracteres, trim
}

interface RateLimitEntry {
  count: number;
  resetAt: number; // epoch ms
}
```

Convenciones:

- El campo honeypot se llama `website` y debe llegar vacío.
- El rate limit usa una `Map<string, RateLimitEntry>` a nivel de módulo, con clave por IP.
- La IP se obtiene de `x-forwarded-for` (primer segmento) o `x-real-ip`; si no existe, se usa la clave `"unknown"`.
- Límite: `RATE_LIMIT_MAX = 5` envíos por `RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000`.
- El rate limit se evalúa después de la validación y del honeypot, para no gastar cuota con envíos inválidos.
- Un envío con honeypot lleno devuelve `{ status: "success" }` sin llamar a Resend; el bot no recibe una señal de bloqueo.
- Asunto del correo: `[Arcade Vault] Nuevo mensaje de {name}`.
- `from` es `CONTACT_FROM_EMAIL`, `to` es `CONTACT_TO_EMAIL` y `replyTo` es el correo del usuario.
- El HTML del correo se genera con estilos inline y sin recursos externos; nombre, correo y mensaje se escapan antes de interpolarlos.
- El terminal de éxito imprime el nombre en mayúsculas con `toUpperCase()`.

Variables de entorno:

```bash
RESEND_API_KEY=re_xxxxxxxxx
CONTACT_TO_EMAIL=contacto@tu-dominio.com
CONTACT_FROM_EMAIL=Arcade Vault <no-reply@tu-dominio-verificado.com>
```

## Plan de implementación

1. Instalar `resend` como dependencia. Crear `.env.template` con las tres variables, mantener la excepción `!.env.template` después de `.env*` en `.gitignore` y documentar las variables en `README.md`. Verificar que `npm run build` sigue pasando sin variables definidas.
2. Agregar al final de `app/globals.css` los estilos `.about*`, `.highlight*`, `.div-*`, `.contact-*`, `.terminal-*`, `.term-*`, `.btn.press`, `@keyframes shake` y `@keyframes pxblink`. Reutilizar `.field`, `.kicker`, `.pixel`, `.neon-*`, `.btn.xl`, `.reveal`, `fade-in` y `blink` ya existentes. Verificar que la landing y el auth no cambian.
3. Extender `app/components/reveal.tsx` con una prop opcional `as?: "section" | "div"` (por defecto `"section"`), manteniendo el observer y el fallback actuales. Verificar que el home sigue animando sus secciones.
4. Crear `app/components/about-highlight-icon.tsx` como server component con los SVG pixel `HEART`, `BROWSER` y `PLANT` del template.
5. Crear `app/about/page.tsx` como server component con hero, highlights, divisor, contacto y `metadata`. Envolver el divisor y la sección de contacto con `Reveal`. Incluir el markup estático del formulario, todavía sin envío; verificar la pantalla a 390px y 1440px.
6. Crear `app/actions/contact.ts` con `"use server"`, validación, honeypot, rate limit, escape de HTML y llamada a Resend. Devolver `ContactResult`; no lanzar excepciones al cliente. Verificar con `npx tsc --noEmit`.
7. Mover el markup del formulario a `app/components/contact-form.tsx` como client component: inputs controlados, honeypot `website`, `useActionState`, shake cuando faltan campos, botón deshabilitado mientras `pending`, terminal de éxito y terminal de error sobre el formulario con los datos intactos. El botón `ENVIAR OTRO MENSAJE` remonta el formulario para limpiar el estado. Verificar el envío real con una API key de Resend.
8. Actualizar `app/components/site-nav.tsx`: agregar `isAbout` a `NavChrome`, link `Acerca de` después de `Salón de la Fama` en desktop y móvil, estado activo en `/about` y `isAbout={false}` en `SiteNavFallback`. Verificar que las demás secciones conservan su estado activo.
9. Ejecutar `npx next typegen`, `npx tsc --noEmit`, `npm run lint` y `npm run build`; corregir lo que aparezca hasta que los cuatro pasen.

## Criterios de aceptación

- [ ] `/about` muestra el kicker `▸ ACERCA DE`, el título `ACERCA DE ARCADE VAULT` y el párrafo de misión del template.
- [ ] Las tres tarjetas highlight muestran su icono, su texto y su color magenta, cyan y green.
- [ ] El divisor muestra dos barras, 24 pixeles y la animación `pxblink`.
- [ ] La sección de contacto muestra los tres tips con sus LEDs verde, amarillo y magenta.
- [ ] El formulario muestra los campos `NOMBRE`, `CORREO ELECTRÓNICO` y `MENSAJE` con sus placeholders del template.
- [ ] Enviar con un campo vacío agita el formulario y no invoca la Server Action.
- [ ] Un correo con formato inválido muestra `fields.email` y no invoca Resend.
- [ ] Un mensaje de menos de 10 caracteres muestra `fields.message` y no invoca Resend.
- [ ] Un envío válido deshabilita el botón mientras está pendiente y luego muestra el terminal de éxito.
- [ ] El terminal de éxito muestra `MENSAJE RECIBIDO. TE RESPONDEREMOS PRONTO. GRACIAS, {NOMBRE}.`.
- [ ] El correo llega a `CONTACT_TO_EMAIL` con el asunto `[Arcade Vault] Nuevo mensaje de {nombre}`.
- [ ] El correo incluye las versiones `text` y `html` con nombre, correo y mensaje.
- [ ] Responder al correo desde el cliente escribe a la dirección indicada por el usuario (`replyTo`).
- [ ] Un nombre con `<b>` aparece escapado en el HTML del correo y no se interpreta como markup.
- [ ] Si Resend devuelve un error, se muestra el terminal de error, el formulario conserva nombre, correo y mensaje, y un nuevo envío vuelve a intentarlo.
- [ ] Si falta `RESEND_API_KEY`, se muestra el error de configuración y no se llama a Resend.
- [ ] Un envío con el campo `website` lleno no produce correo y responde como éxito.
- [ ] El sexto envío válido dentro de 10 minutos responde con error de rate limit.
- [ ] `ENVIAR OTRO MENSAJE` vuelve al formulario vacío desde el terminal de éxito.
- [ ] El nav muestra `Acerca de` en desktop y en el panel móvil, después de `Salón de la Fama`.
- [ ] `Acerca de` aparece activo solo en `/about`; Inicio, Biblioteca y Salón conservan sus estados.
- [ ] El logo y los demás links del nav navegan sin cambios.
- [ ] `/about` se ve sin solapamientos a 390px y a 1440px de ancho.
- [ ] No hay errores ni warnings de hidratación en la consola del navegador.
- [ ] `.env.template` existe, no está ignorado por git y coincide con las variables que lee la acción.
- [ ] `README.md` documenta `RESEND_API_KEY`, `CONTACT_TO_EMAIL` y `CONTACT_FROM_EMAIL`.
- [ ] `npm run build` pasa sin `RESEND_API_KEY` definida.
- [ ] `npx tsc --noEmit`, `npm run lint` y `npm run build` terminan sin errores.

## Decisiones tomadas y descartadas

- **Sí:** Server Action en `app/actions/contact.ts`. Evita exponer un endpoint público y la API key, y `useActionState` da estado pendiente sin código extra.
- **Sí:** tres variables de entorno (`RESEND_API_KEY`, `CONTACT_TO_EMAIL`, `CONTACT_FROM_EMAIL`). Permite cambiar remitente y destino sin tocar código y usar un dominio verificado en producción.
- **Sí:** Resend como único proveedor de correo. Es el proveedor pedido y su SDK oficial cubre texto y HTML en una sola llamada.
- **Sí:** solo notificación al equipo, con `replyTo` del usuario. Un solo correo reduce el riesgo de spam y mantiene la conversación en el hilo.
- **Sí:** texto + HTML. El HTML da una lectura cómoda y el texto garantiza compatibilidad si el cliente lo prefiere.
- **Sí:** terminal de error con el formulario intacto. El template no define fallos; reutilizar su lenguaje visual evita inventar un patrón nuevo.
- **Sí:** error de configuración visible cuando falta la API key. Un modo mock ocultaría un despliegue mal configurado.
- **Sí:** honeypot + rate limit en memoria. Frena bots simples y ráfagas sin agregar una base de datos.
- **Sí:** límite por IP obtenida de cabeceras. Es suficiente para un formulario público; no se usa como mecanismo de autenticación.
- **Sí:** `.env.template` versionado y documentado en README. Deja el contrato de configuración a la vista sin filtrar secretos.
- **Sí:** fidelidad 1:1 al template en copy, estructura y estilos. Ya es el criterio de SPEC 01 y SPEC 02.
- **Sí:** `Reveal` acepta `div` además de `section`. El divisor del template es un `div` y la animación debe mantenerse.
- **No:** acuse de recibo al usuario. Duplica llamadas a Resend y puede empeorar la reputación de un dominio nuevo.
- **No:** persistir mensajes o crear un panel de administración. No hay base de datos y el correo ya es el registro.
- **No:** captcha externo. El honeypot y el rate limit cubren el caso esperado sin añadir fricción ni otra cuenta.
- **No:** validar las variables al importar el módulo. Rompería `next build` en CI o en un checkout sin `.env.local`.
- **No:** endpoint `/api/contact`. La Server Action ya cubre el caso y reduce superficie pública.
- **No:** cambiar el footer. El template mantiene el footer actual y el link ya vive en el nav.

## Riesgos identificados

| Riesgo | Mitigación |
| --- | --- |
| Resend exige un dominio verificado; `onboarding@resend.dev` solo envía a la cuenta del dueño | Documentar la verificación de dominio en README y usar un remitente de ejemplo coherente en `.env.template`. |
| El rate limit en memoria se reinicia al reiniciar el server y no se comparte entre instancias | Es una barrera best-effort; Resend también aplica límites. Si se necesita estricto, se migra a KV o base de datos en otra spec. |
| `x-forwarded-for` se puede falsificar | Se usa solo para throttling, nunca para autorización; se toma el primer segmento y se documenta el límite. |
| Inyección de HTML en el correo desde nombre o mensaje | Escapar `&`, `<`, `>`, `"` y `'` antes de interpolar en la plantilla HTML. |
| Falsos positivos del honeypot con gestores de contraseñas o autofill | El campo se llama `website`, va oculto, con `autoComplete="off"` y `tabIndex={-1}`. |
| La API key se filtra al cliente | La importación de `resend` y la lectura de `process.env` viven solo en el archivo `"use server"`; el cliente importa únicamente la acción. |
| `cacheComponents` intenta prerenderizar el resultado del formulario | `/about` es estática; la Server Action es dinámica por definición y no se agregan exports `dynamic`, `revalidate` ni `fetchCache`. |
| El build de producción falla si falta la configuración | La acción valida las variables dentro de la función, no en el top-level del módulo. |
| Correos marcados como spam por un dominio nuevo | README indica configurar SPF y DKIM en Resend; el asunto y el cuerpo son discretos y sin enlaces. |
| El terminal de error muestra detalles internos de Resend | El cliente recibe un mensaje genérico; el error completo se registra solo en `console.error` del servidor. |

## Lo que **no** entra en esta spec

- Acuse de recibo automático al remitente.
- Persistencia de mensajes, base de datos, CRM o panel de administración.
- Captcha externo, moderación o filtros de contenido.
- Adjuntos o campos adicionales en el formulario.
- Autenticación obligatoria para contactar.
- Cambios en el footer o en otras pantallas.
- Tests automatizados, i18n, analítica y monitoreo de entregabilidad.
- Otros correos transaccionales.

Cada uno de esos puntos, si llega, va en su propia spec.
