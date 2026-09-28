import 'server-only'
import sharp from 'sharp'
import { AppError } from '@/lib/errors'

/**
 * Re-encodes an upload: honours EXIF orientation, then drops ALL metadata (GPS, camera, owner)
 * because sharp only keeps metadata when .withMetadata() is called (ARCHITECTURE §8.5).
 */
export async function sanitizeImage(input: Buffer, { maxWidth = 2400, format = 'webp' as 'webp' | 'jpeg' } = {}) {
  try {
    const img = sharp(input, { failOn: 'error', limitInputPixels: 50_000_000 }).rotate().resize({ width: maxWidth, withoutEnlargement: true })
    const out = format === 'webp' ? img.webp({ quality: 82 }) : img.jpeg({ quality: 88, mozjpeg: true })
    return { buffer: await out.toBuffer(), contentType: `image/${format}` as const, ext: format === 'webp' ? 'webp' : 'jpg' }
  } catch {
    throw new AppError('invalid_input', 'That file is not a valid image')
  }
}
