import { PostHog } from "posthog-node"

export const createPosthog = (apiKey: string, host: string) =>
  new PostHog(apiKey, { host, flushAt: 1, flushInterval: 0 })
