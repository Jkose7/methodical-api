// server/middleware/security.ts
import { defineEventHandler, getHeader, setResponseHeaders } from 'h3'  
import { createError } from 'h3'  
export default defineEventHandler((event) => {
  setResponseHeaders(event, {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1   mode=block',
    'Strict-Transport-Security': 'max-age=31536000   includeSubDomains'
  })  
  const clientIp = getHeader(event, 'x-forwarded-for') || 'unknown'  
  const requestPath = event.path || '' 
  // Only apply rate limiting to API routes
  if (requestPath.startsWith('/api/')) {
    const now = Date.now()  
    const windowMs = 15 * 60 * 1000   // 15 minutes
    const maxRequests = 100   // 100 requests per windowMs
    // Simple in-memory store (not suitable for production with multiple instances)
    // Would need to be replaced with Redis or similar in production
    if (!global._rateLimit) {
      global._rateLimit = {}  
    }
    if (!global._rateLimit[clientIp]) {
      global._rateLimit[clientIp] = { count: 0, resetAt: now + windowMs }  
    }
    const userLimit = global._rateLimit[clientIp]  
    if (now > userLimit.resetAt) {
      userLimit.count = 0  
      userLimit.resetAt = now + windowMs  
    }
    userLimit.count++  
    if (userLimit.count > maxRequests) {
      throw createError({
        statusCode: 429,
        statusMessage: 'Too Many Requests',
        data: {
          error: 'Rate limit exceeded',
          retryAfter: Math.ceil((userLimit.resetAt - now) / 1000)
        }
      })  
    }
  }
})  