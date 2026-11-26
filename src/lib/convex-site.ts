export function convexSiteUrl() {
  const convexUrl = import.meta.env.VITE_CONVEX_URL
  if (!convexUrl) throw new Error('VITE_CONVEX_URL is not set')
  return convexUrl.replace('.convex.cloud', '.convex.site')
}
