import { Download } from 'lucide-react'
import Image from 'next/image'
import { CopyButton } from '@/components/creator/copy-button'

/** Operator-provided hooks, brief and photos for a creator's reel (ARCHITECTURE §20.6, Phase 3). */
export function ContentKit({ hooks, brief, photos, slug }: { hooks: string[]; brief: string | null; photos: string[]; slug: string }) {
  if (!hooks.length && !brief && !photos.length) return null
  return (
    <section>
      <h2 className="mb-2.5 text-lg font-bold">Content kit</h2>
      <div className="flex flex-col gap-5 rounded-2xl border bg-card p-5">
        {hooks.length > 0 && (
          <div className="flex flex-col gap-2">
            <b className="text-sm">Hooks from the operator</b>
            <ul className="flex flex-col gap-2">
              {hooks.map((h) => <li key={h} className="flex items-center gap-2 rounded-xl bg-subtle py-1 pr-1 pl-3.5 text-[15px]"><span className="min-w-0 flex-1">{h}</span><CopyButton text={h} label="Copy hook" /></li>)}
            </ul>
          </div>
        )}
        {brief && <div className="flex flex-col gap-1.5"><b className="text-sm">Brief</b><p className="text-sm whitespace-pre-line text-ink-2">{brief}</p></div>}
        {photos.length > 0 && (
          <div className="flex flex-col gap-2">
            <b className="text-sm">Photos you can use</b>
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {photos.map((src, i) => (
                <li key={src} className="group relative aspect-square overflow-hidden rounded-xl bg-subtle">
                  <Image src={src} alt="" fill sizes="(max-width:640px) 33vw, 180px" className="object-cover" />
                  {/* Supabase serves Content-Disposition: attachment for ?download= (the download attribute is ignored cross-origin) */}
                  <a href={`${src}?download=${slug}-${i + 1}`} className="absolute right-1.5 bottom-1.5 grid size-9 place-items-center rounded-lg bg-white/90 text-ink shadow" aria-label={`Download photo ${i + 1}`}><Download className="size-4" /></a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  )
}
