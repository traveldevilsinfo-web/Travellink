import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-3 px-4 py-8">
      <Skeleton className="h-8 w-40" />
      {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-16 w-full" />)}
    </main>
  )
}
