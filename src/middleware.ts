import { defineMiddleware, sequence } from 'astro:middleware'
import { verifyAccessToken } from './lib/auth/logto'

const i18nRedirect = defineMiddleware(async (context, next) => {
  const { request } = context
  const url = new URL(request.url)
  if (url.pathname !== '/') return next()
  const acceptLanguage = request.headers.get('accept-language') || ''
  const preferredLanguage = acceptLanguage
    .split(',')
    .map((lang) => lang.split(';')[0].trim().toLowerCase())
    .find((lang) => lang === 'es' || lang.startsWith('es-'))
    ? 'es'
    : 'en'
  return Response.redirect(`${url.origin}/${preferredLanguage}`, 302)
})

const distinctId = defineMiddleware(async (context, next) => {
  const cookie = context.cookies.get('distinct_id')?.value
  const id = cookie ?? crypto.randomUUID()
  context.cookies.set('distinct_id', id, { maxAge: 60 * 60 * 24 * 365, path: '/' })
  ;(context.locals as any).distinctId = id
  return next()
})

const authProtect = defineMiddleware(async (context, next) => {
  const url = new URL(context.request.url)
  const path = url.pathname
  const needsAuth = [/^\/dashboard/, /^\/es\/dashboard/, /^\/en\/dashboard/].some((r) => r.test(path))
  if (!needsAuth) return next()
  
  let token = context.request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) {
    token = context.cookies.get('logto_access_token')?.value
  }

  if (!token) return context.redirect('/')
  const env = (context.locals as any).runtime?.env
  try {
    await verifyAccessToken(token, env.LOGTO_ISSUER_ENDPOINT, env.LOGTO_RESOURCE_INDICATOR ?? env.APP_BASE_URL, [])
    return next()
  } catch {
    return context.redirect('/')
  }
})

export const onRequest = sequence(i18nRedirect, distinctId, authProtect)
