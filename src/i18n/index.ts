import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './en.json'
import es from './es.json'

const saved = (() => { try { return localStorage.getItem('lang') } catch { return null } })()
const browser = navigator.language?.toLowerCase().startsWith('en') ? 'en' : 'es'

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, es: { translation: es } },
  lng: saved ?? browser,
  fallbackLng: 'es',
  interpolation: { escapeValue: false },
})

i18n.on('languageChanged', (lng) => {
  try { localStorage.setItem('lang', lng) } catch { /* ignore */ }
  document.documentElement.lang = lng
})

export type Lang = 'en' | 'es'
/** Pick the right column from a bilingual row, e.g. loc(tour, 'name', lang) */
export const loc = <T extends Record<string, unknown>>(row: T, field: string, lang: string) =>
  (row[`${field}_${lang === 'en' ? 'en' : 'es'}`] ?? row[`${field}_es`] ?? '') as string

export default i18n
