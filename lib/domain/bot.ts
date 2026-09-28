/**
 * Link-preview bots and crawlers (clicks are still logged, flagged is_bot, and excluded from stats).
 * Instagram's in-app browser ("Instagram 3xx…") is a real person and must NOT match.
 */
const BOT = /bot|crawl|spider|slurp|facebookexternalhit|facebookcatalog|meta-externalagent|whatsapp|telegrambot|twitterbot|linkedinbot|discordbot|skypeuripreview|embedly|quora link preview|pinterest|vkshare|headless|python-requests|curl\/|wget\/|go-http-client|axios\/|node-fetch|preview/i

export function isBot(userAgent: string | null | undefined): boolean {
  if (!userAgent || userAgent.length < 10) return true
  return BOT.test(userAgent)
}
