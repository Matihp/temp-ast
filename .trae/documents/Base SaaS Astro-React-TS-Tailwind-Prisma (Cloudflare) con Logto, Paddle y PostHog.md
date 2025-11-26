## Objetivo

* Convertir el repo actual en una base reutilizable para lanzar \~12 SaaS con SSR en Cloudflare y stack: `Astro + React + TypeScript + Tailwind v4 + Prisma (PostgreSQL)`, añadiendo autenticación con Logto, pagos con Paddle, analítica y flags con PostHog, y un esqueleto para integrar APIs de IA.

## Estado actual (detectado)

* `Astro` SSR con Cloudflare adapter activo (`astro.config.mjs:11`).

* `React 19`, `Tailwind 4`, `wrangler`, `@astrojs/cloudflare` y `@astrojs/react` ya instalados (`package.json:13-26`).

* Prisma con `postgresql` y un modelo `User` mínimo (`prisma/schema.prisma:11-20`).

* Cliente Prisma Node (`src/lib/prisma.ts:1-9`) aún no edge‑ready.

* Middleware de i18n para `es/en` (`src/middleware.ts:1-21`).

## Arquitectura base

* **SSR en Cloudflare**: Mantener `output: 'server'` y `platformProxy.enabled: true` (ya configurado).

* **Capas**:

  * Frontend: Astro + islas React para UI dinámica (dashboard, billing, auth widgets).

  * Backend: Rutas API de Astro (`src/pages/api/**`) y acciones/SSR, orientadas a Workers.

  * Datos: Prisma + PostgreSQL con compatibilidad Edge.

  * Observabilidad: PostHog (cliente y servidor) y logs en Workers.

## Base de datos (Prisma, Edge)

* **Objetivo**: Operar Prisma en Workers sin binarios Rust usando drivers/Accelerate.

* **Cambios**:

  * Ajustar `generator client` para entorno edge (sin binarios) y/o usar `@prisma/client/edge` + `withAccelerate`.

  * `src/lib/prisma.ts`: migrar a `PrismaClient` edge y extensión Accelerate, leyendo `DATABASE_URL` de bindings de Cloudflare.

  * Recomendado: `Prisma Postgres` o `Neon/PlanetScale` HTTP driver; alternativo: Prisma Accelerate.

* **Modelado** (mínimo para SaaS):

  * `Organization`, `Member`, `Project` (multi‑tenant opcional), `Plan`, `Subscription`, `Invoice`, `ApiKey`, `UsageEvent`, `FeatureFlag`, `AiJob`, `AiResult`.

  * Mantener `User` y enlazar con `Logto` (`provider`, `subject`, `email`, `name`).

## Autenticación (Logto)

* **Estrategia Cloudflare‑friendly**:

  * Cliente `@logto/browser` para sign‑in/sign‑out con OIDC hosted page.

  * Tokens de acceso enviados en `Authorization: Bearer` a rutas protegidas.

  * **Servidor**: Validación JWT en Workers con JOSE y metadatos OIDC (issuer y JWKS). Referencia: validación JWT y scopes por recurso en Logto docs.

* **Implementación**:

  * Env vars/bindings: `LOGTO_ISSUER_ENDPOINT`, `LOGTO_RESOURCE_INDICATOR`, `LOGTO_CLIENT_ID`, `APP_BASE_URL`.

  * `src/lib/auth/logto.ts`: helper para descargar `jwks_uri` del issuer y verificar `aud`, `scope`, `sub`.

  * `src/middleware.ts`: secuenciar i18n + auth; poblar `context.locals.user` si el token es válido; proteger rutas (`/dashboard`, `/api/**`).

  * UI: componente React de Login/Logout que usa `@logto/browser` y redirige al hosted page.

## Pagos (Paddle Billing)

* **Checkout**: `Paddle.js` en cliente via `loadScript()` y `Paddle.Checkout.open({ items, customData })`.

* **Servidor**: `paddle-billing` (TS, Fetch‑ready) para crear transacciones, consultar suscripciones, cancelar, etc.

* **Webhooks**:

  * Ruta `POST /api/paddle/webhook` (Astro API) verificando `Paddle-Signature` (raw body) y actualizando `Subscription`/`Invoice` con `parseWebhookBody`.

  * Env vars: `PADDLE_API_KEY`, `PADDLE_ENV` (sandbox/live), `PADDLE_WEBHOOK_SECRET`.

* **Planes**: mapear `Plan` ⇄ `PriceId` en Paddle; mostrar pricing con Tailwind y abrir checkout.

## Analítica y Flags (PostHog)

* **Cliente**: `posthog-js` con `client:load` en `Layout.astro` y autocapture opcional.

* **Servidor (Workers)**: `posthog-node` con `flushAt: 1` y `flushInterval: 0`; usar `ctx.waitUntil(posthog.captureImmediate(...))` y `isFeatureEnabled()`.

* **DistinctId**: cookie `distinct_id` en middleware; si autenticado, usar `user.id`.

* **Env vars**: `POSTHOG_API_KEY`, `POSTHOG_HOST`.

## APIs de IA (capa proveedor)

* **Objetivo**: unificar consumo de múltiples APIs (OpenAI, Anthropic, Groq, Cloudflare AI, etc.).

* **Diseño**:

  * `src/lib/ai/providers/<proveedor>.ts`: contrato común (`generate`, `embed`, `transcribe`, etc.) usando `fetch` en Workers.

  * Persistir `AiJob` + `AiResult` + `UsageEvent` (tokens/coste) en Prisma.

  * Rate limiting por `ApiKey`/`User` y cuotas asociadas a `Plan`.

## Frontend

* **Páginas básicas**:

  * Home (`/es`, `/en` ya existen), `Dashboard` (protegido), `Pricing`, `Account`.

  * Componentes React para: Auth, Checkout, Feature Flags toggles, tablas de uso.

* **Estilo**: Tailwind v4 (ya activo) y componentes accesibles; internacionalización reaprovechando `translations/`.

## Backend (rutas y middleware)

* **Rutas**:

  * `src/pages/api/auth/verify.ts` (extraer identidad desde token).

  * `src/pages/api/paddle/**/*` (checkout server helpers y webhook).

  * `src/pages/api/ai/**/*` (proxy a proveedores, guardado de resultados).

* **Middleware**:

  * Secuencia: i18n → auth → distinct\_id → seguridad (CSRF en formularios, CORS para APIs si aplica).

## Seguridad y configuración

* Cloudflare `wrangler.jsonc`: añadir `vars` para `DATABASE_URL`, `LOGTO_*`, `PADDLE_*`, `POSTHOG_*` y usar `wrangler secret` para secretos.

* Cookies: `Secure`, `HttpOnly` (donde corresponda), `SameSite=Lax`.

* Verificación de firmas: Paddle webhooks; JWT OIDC (Logto) con `jwks_uri`.

## DX y despliegue

* Scripts ya existen: `dev`, `build`, `preview`, `deploy`.

* Añadir `pnpm add` de los SDKs: `@logto/browser`, `posthog-js`, `posthog-node`, `paddle-billing`.

* Local: `.dev.vars` para bindings; prod: `wrangler secret put`.

* Tests mínimos de API y validación JWT en Workers.

## Entregables en el repo

* `src/lib/prisma.ts` migrado a edge + Accelerate.

* `src/lib/auth/logto.ts` (verificación JWT + helpers).

* `src/lib/analytics/posthog.{ts,astro}` (cliente/servidor).

* `src/lib/billing/paddle.{ts}` y webhook `src/pages/api/paddle/webhook.ts`.

* Páginas `Pricing`, `Dashboard` y componentes de Auth y Checkout.

* Prisma schema extendido + primera migración.

## Notas de compatibilidad (Cloudflare + Prisma)

* Recomendado usar Prisma Postgres/Accelerate o driver HTTP (Neon/PlanetScale). Ver docs oficiales para Workers y Edge. Configurar `engineType = "client"` y adapters si fuese necesario.

## Siguientes pasos (ejecución)

1. Instalar dependencias (auth/billing/analytics). 2) Migrar Prisma a edge y ampliar el esquema. 3) Implementar validación JWT (Logto) y middleware. 4) Integrar Paddle checkout y webhook. 5) Integrar PostHog cliente/servidor. 6) Crear UI base (pricing/dashboard). 7) Añadir la capa de proveedores de IA y persistencia. 8) Revisar seguridad, env vars y despliegue con `wrangler`.

## Referencias (context7)

* PostHog en Workers: crear cliente y `captureImmediate`/flags (posthog.com docs).

* Logto: validación JWT por `aud`/`scope` (docs oficiales de autorización).

* Paddle Billing: checkout (`Paddle.Checkout.open`), API y verificación de firma de webhooks.

* Prisma Edge + Cloudflare: uso de `@prisma/client/edge` y Accelerate/Prisma Postgres.

