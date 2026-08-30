import { OpenPanel } from "@openpanel/web"

/**
 * Product analytics. The client id is public by design and ships in the
 * bundle; the client secret is server-side only and never belongs here.
 * With no id configured the module is inert, so local runs and forks stay
 * silent instead of posting to someone else's project.
 */
// the project only accepts its own origin, so a dev run would collect 401s
// and nothing else
const clientId = import.meta.env.PROD
  ? (import.meta.env.VITE_OPENPANEL_CLIENT_ID as string | undefined)
  : undefined

export const analytics = clientId
  ? new OpenPanel({
      clientId,
      trackScreenViews: true,
      trackOutgoingLinks: true,
      trackAttributes: true,
    })
  : null

/** Record a product event, e.g. an export or a preset being applied. */
export function track(name: string, properties?: Record<string, unknown>) {
  analytics?.track(name, properties)
}
