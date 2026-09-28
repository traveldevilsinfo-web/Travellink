import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { error } = await createAdminClient().from('app_settings').select('key').limit(1)
  return NextResponse.json({ ok: !error, db: error ? 'down' : 'ok' }, { status: error ? 503 : 200 })
}
