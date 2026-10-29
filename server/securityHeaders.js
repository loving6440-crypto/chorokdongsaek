/**
 * v76.0.16: HTTP 보안 헤더.
 * Render의 Node 웹 서비스는 HTTPS를 엣지에서 종료하므로 X-Forwarded-Proto를 사용한다.
 * CSP는 실제 프런트엔드에서 사용하는 외부 리소스(폰트·YouTube)만 허용한다.
 * 인라인 JS는 허용하지 않으며, 테마 최초 적용은 /theme-bootstrap.js 에서 수행한다.
 */
export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "form-action 'self'",
  // 배경음악용 YouTube IFrame API. 인라인 스크립트와 eval은 허용하지 않는다.
  "script-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://s.ytimg.com",
  // React의 인라인 style 속성이 있어 style-src에만 unsafe-inline이 필요하다.
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
  "font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net data:",
  "img-src 'self' data: blob: https://i.ytimg.com",
  "media-src 'self' blob:",
  "connect-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://*.googlevideo.com",
  "frame-src https://www.youtube.com https://www.youtube-nocookie.com",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
].join('; ')

export const SECURITY_HEADERS = Object.freeze({
  'Content-Security-Policy': CONTENT_SECURITY_POLICY,
  'X-Frame-Options': 'SAMEORIGIN',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=(), midi=(), serial=(), hid=(), accelerometer=(), gyroscope=(), magnetometer=()',
})

export const HSTS = 'max-age=31536000; includeSubDomains'

export function isSecureRequest(req) {
  if (req.socket?.encrypted) return true
  // Render/Fly 등 HTTPS 역방향 프록시에서 원 요청의 프로토콜을 전달한다.
  const forwarded = req.headers?.['x-forwarded-proto']
  return typeof forwarded === 'string' && forwarded.split(',')[0].trim().toLowerCase() === 'https'
}

export function applySecurityHeaders(req, res) {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) res.setHeader(key, value)
  // HSTS는 HTTPS 응답에서만 설정한다 (로컬 HTTP 개발 서버에는 적용하지 않음).
  if (isSecureRequest(req)) res.setHeader('Strict-Transport-Security', HSTS)
}
