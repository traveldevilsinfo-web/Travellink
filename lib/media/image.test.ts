import sharp from 'sharp'
import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
const { sanitizeImage } = await import('./image')

describe('sanitizeImage', () => {
  it('strips EXIF (incl. GPS) and converts to webp', async () => {
    const withExif = await sharp({ create: { width: 64, height: 32, channels: 3, background: '#f00' } })
      .jpeg()
      .withExif({ IFD0: { Artist: 'someone', Copyright: 'x' }, IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '28/1 36/1 0/1' } })
      .toBuffer()
    expect((await sharp(withExif).metadata()).exif).toBeDefined()

    const { buffer, contentType } = await sanitizeImage(withExif)
    const meta = await sharp(buffer).metadata()
    expect(contentType).toBe('image/webp')
    expect(meta.format).toBe('webp')
    expect(meta.exif).toBeUndefined()
    expect(meta.width).toBe(64)
  })

  it('rejects non-images', async () => {
    await expect(sanitizeImage(Buffer.from('<svg onload=alert(1)>'))).rejects.toThrow('not a valid image')
  })
})
