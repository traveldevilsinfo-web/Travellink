import { describe, expect, it } from 'vitest'
import { isBot } from './bot'

describe('isBot', () => {
  it.each([
    'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
    'WhatsApp/2.23.20.0 A',
    'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    'curl/8.4.0',
    'Mozilla/5.0 HeadlessChrome/120.0',
    '',
  ])('flags %s', (ua) => expect(isBot(ua)).toBe(true))

  it.each([
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 312.0.0.34.111 (iPhone15,2; iOS 17_0; en_IN; en-IN; scale=3.00; 1179x2556)',
    'Mozilla/5.0 (Linux; Android 14; SM-A546E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36',
  ])('lets real browsers through: %s', (ua) => expect(isBot(ua)).toBe(false))
})
