import { useEffect, useState } from "react"
import LogtoClient from "@logto/browser"

export default function LoginButton() {
  const [client, setClient] = useState<LogtoClient | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const resource = String((globalThis as any).LOGTO_RESOURCE_INDICATOR ?? "").trim()
    const endpoint = String((globalThis as any).LOGTO_ISSUER_ENDPOINT ?? "").trim()
    const appId = String((globalThis as any).LOGTO_CLIENT_ID ?? "").trim()
    if (!endpoint || !/^https?:\/\//.test(endpoint) || !appId) {
      console.error("LoginButton: Invalid configuration", { endpoint, appId, resource })
      setIsLoading(false)
      return
    }
    const c = new LogtoClient({
      endpoint,
      appId,
      resources: resource ? [resource] : [],
    })
    setClient(c)

    const init = async () => {
      try {
        if (window.location.search.includes("code=") && window.location.search.includes("state=")) {
            await c.handleSignInCallback(window.location.href)
            window.history.replaceState({}, document.title, window.location.pathname)
        }
        
        const auth = await c.isAuthenticated()
        setIsAuthenticated(auth)

        if (auth) {
            const token = await c.getAccessToken(resource)
            if (token) {
                 document.cookie = `logto_access_token=${token}; path=/; max-age=3600; SameSite=Lax`
            }
        } else {
             document.cookie = `logto_access_token=; path=/; max-age=0`
        }
      } catch (e) {
        console.error("Auth error", e)
      } finally {
        setIsLoading(false)
      }
    }
    init()
  }, [])

  const onLogin = async () => {
    if (!client) return
    await client.signIn(window.location.origin)
  }

  const onLogout = async () => {
    if (!client) return
    document.cookie = `logto_access_token=; path=/; max-age=0`
    await client.signOut(window.location.origin)
    setIsAuthenticated(false)
  }

  if (isLoading) {
    return (
        <button className="text-gray-500 px-4 py-2 rounded-md text-sm font-medium cursor-wait">
            ...
        </button>
    )
  }

  return (
    <button 
      onClick={isAuthenticated ? onLogout : onLogin}
      className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-4 py-2 rounded-md text-sm font-medium hover:opacity-90 transition-opacity"
    >
      {isAuthenticated ? "Cerrar sesión" : "Iniciar sesión"}
    </button>
  )
}
