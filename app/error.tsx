'use client'

import { Button } from '@/components/ui/button'

// Server error messages are stripped in production; AppError('forbidden') lands here too.
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-lg font-semibold">We couldn&apos;t load this page</h1>
      <p className="text-sm text-muted-foreground">You may not have access, or something went wrong on our side.</p>
      <Button onClick={reset}>Try again</Button>
    </main>
  )
}
