import type { Metadata } from 'next'
import { signOut } from '@/app/(auth)/login/actions'
import { Button } from '@/components/ui/button'
import { requireUser } from '@/lib/auth/guards'
import { ProfileForm } from './profile-form'

export const metadata: Metadata = { title: 'Profile', robots: { index: false } }

export default async function ProfilePage() {
  const user = await requireUser('/account/profile')
  const { data: profile } = await user.supabase
    .from('profiles')
    .select('full_name, phone, email, city, marketing_opt_in')
    .eq('id', user.id)
    .single()

  return (
    <main className="mx-auto max-w-md px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Your profile</h1>
        <form action={signOut}><Button variant="ghost" size="sm">Sign out</Button></form>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">{profile?.phone ?? profile?.email}</p>
      <ProfileForm
        defaults={{
          fullName: profile?.full_name ?? '',
          city: profile?.city ?? '',
          marketingOptIn: profile?.marketing_opt_in ?? false,
        }}
      />
    </main>
  )
}
