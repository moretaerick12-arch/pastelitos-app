import { createBrowserClient } from '@supabase/ssr'

const DEFAULT_SUPABASE_URL = 'https://dqdgugxoarmqaiygayht.supabase.co'
const DEFAULT_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxZGd1Z3hvYXJtcWFpeWdheWh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY1ODY4OTksImV4cCI6MjEwMjE2Mjg5OX0.CBvdTRSgIY6zFOtNvAEUVQdaBJqrV3isqYHcQHBBjdc'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_KEY
  )
}
