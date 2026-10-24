import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!url || !key) throw new Error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY — copy .env.example to .env.local')

export const supabase = createClient<Database>(url, key)

export const tourPhotoUrl = (path: string) =>
  supabase.storage.from('tour-photos').getPublicUrl(path).data.publicUrl
