// Only these sites may call the checkout function from a browser.
// Override with the ALLOWED_ORIGINS secret (comma-separated) if the domain changes.
const DEFAULT_ORIGINS = ['https://jjtours-app.vercel.app', 'http://localhost:5173']

export const allowedOrigins = (Deno.env.get('ALLOWED_ORIGINS') ?? DEFAULT_ORIGINS.join(','))
  .split(',').map((o) => o.trim()).filter(Boolean)

export const SITE_URL = allowedOrigins[0]

export function corsHeaders(origin: string | null): Record<string, string> {
  const allow = origin && allowedOrigins.includes(origin) ? origin : SITE_URL
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  }
}
