/** 관리자 수여 채팅 칭호. 관리자 권한은 이 텍스트와 무관하며 서버의 키 검증으로만 결정된다. */
export const CHAT_TITLE_MAX = 12
const RESERVED = new Set(['관리자', '운영자', '파티장', 'GM', 'SYSTEM', 'ADMIN'])
/** 빈 문자열은 칭호 해제. 유효하지 않으면 null을 반환한다. */
export function cleanChatTitle(value) {
  if (typeof value !== 'string') return null
  const title = value.trim().normalize('NFC')
  if (!title) return ''
  if ([...title].length > CHAT_TITLE_MAX || !/^[\p{L}\p{N}_ ·-]+$/u.test(title)) return null
  if (RESERVED.has(title.toUpperCase())) return null
  return title
}
/** 기존 메시지까지 일관되게 표시하도록, 필요한 사람의 칭호만 안전하게 갱신한다. */
export function retitleMessages(messages, id, title) {
  if (!Array.isArray(messages)) return messages
  return messages.map((msg) => msg?.from?.id === id
    ? { ...msg, from: { ...msg.from, title: title || undefined } }
    : msg)
}
