// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js'
import { PUBLIC_SUPABASE_DB_URL, PUBLIC_SUPABASE_DB_PUBLIC_KEY } from '$env/static/public'

const supabaseUrl = PUBLIC_SUPABASE_DB_URL
const supabaseKey = PUBLIC_SUPABASE_DB_PUBLIC_KEY

export const supabase = createClient(supabaseUrl, supabaseKey) 