export const money = (cents: number, lang: string, currency = 'usd') =>
  new Intl.NumberFormat(lang === 'en' ? 'en-US' : 'es-PR', { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100)

// All tours run in Puerto Rico time (AST, UTC-4, no DST)
export const tourDateTime = (iso: string, lang: string) =>
  new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'es-PR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Puerto_Rico' }).format(new Date(iso))
