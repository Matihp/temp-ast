import { useEffect, useState } from "react"
import LogtoClient from "@logto/browser"

export default function LoginButton() {
  const [client, setClient] = useState<LogtoClient | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const c = new LogtoClient({
      endpoint: (globalThis as any).LOGTO_ISSUER_ENDPOINT,
      appId: (globalThis as any).LOGTO_CLIENT_ID,
    })
    setClient(c)
    c.isAuthenticated().then(setIsAuthenticated)
  }, [])

  const onLogin = async () => {
    if (!client) return
    await client.signIn(window.location.origin)
  }

  const onLogout = async () => {
    if (!client) return
    await client.signOut(window.location.origin)
    setIsAuthenticated(false)
  }

  return (
    <button onClick={isAuthenticated ? onLogout : onLogin}>
      {isAuthenticated ? "Cerrar sesión" : "Iniciar sesión"}
    </button>
  )
}
