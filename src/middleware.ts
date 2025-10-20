import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async (context, next) => {
  const { request } = context;
  const url = new URL(request.url);
  
  // Skip middleware for non-root paths
  if (url.pathname !== '/') {
    return next();
  }
  
  // Get browser language
  const acceptLanguage = request.headers.get('accept-language') || '';
  const preferredLanguage = acceptLanguage
    .split(',')
    .map(lang => lang.split(';')[0].trim().toLowerCase())
    .find(lang => lang === 'es' || lang.startsWith('es-')) ? 'es' : 'en';
  
  // Redirect to the appropriate language path
  return Response.redirect(`${url.origin}/${preferredLanguage}`, 302);
});