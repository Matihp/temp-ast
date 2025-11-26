/// <reference types="astro/client" />
type ENV = {
  DATABASE_URL: string
  POSTHOG_API_KEY: string
  POSTHOG_HOST: string
  LOGTO_ISSUER_ENDPOINT: string
  LOGTO_CLIENT_ID: string
  LOGTO_RESOURCE_INDICATOR: string
  PADDLE_API_KEY: string
  PADDLE_WEBHOOK_SECRET: string
  OPENAI_API_KEY: string
}
type Runtime = import("@astrojs/cloudflare").Runtime<ENV>
declare namespace App {
  interface Locals extends Runtime {}
}
