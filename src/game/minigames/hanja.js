// 자연수 → 한자 수사. 2048 타일 표기용.  2 → 二, 16 → 十六, 128 → 百二十八, 2048 → 二千四十八
const DIGITS = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九']

/** 1 ~ 9999 */
function section(n) {
  const th = Math.floor(n / 1000)
  const h = Math.floor(n / 100) % 10
  const t = Math.floor(n / 10) % 10
  const o = n % 10
  let out = ''
  // 십·백·천 앞의 一 은 생략한다. (十六, 百二十八, 千二十四)
  if (th) out += (th > 1 ? DIGITS[th] : '') + '千'
  if (h) out += (h > 1 ? DIGITS[h] : '') + '百'
  if (t) out += (t > 1 ? DIGITS[t] : '') + '十'
  if (o) out += DIGITS[o]
  return out
}

export function toHanja(n) {
  if (!Number.isFinite(n) || n <= 0) return '零'
  let out = ''
  const man = Math.floor(n / 10000)
  const rest = n % 10000
  if (man) out += (man === 1 ? '一' : section(man)) + '萬' // 萬 앞의 一 은 남긴다. (一萬)
  if (rest) out += section(rest)
  return out
}

/**
 * 타일에 넣기 좋게 한자 수사를 한 줄 또는 두 줄로 나눈다.
 * 4글자까지는 한 줄, 5글자부터는 千·百·十·萬 뒤에서 끊어 두 줄이 되도록 가장 균형 잡힌 지점을 고른다.
 *   二百五十六 → ['二百', '五十六']   二千四十八 → ['二千', '四十八']
 */
export function toHanjaLines(n) {
  const text = toHanja(n)
  const chars = [...text]
  if (chars.length <= 4) return [text]
  const UNITS = new Set(['千', '百', '十', '萬'])
  let best = null
  for (let i = 1; i < chars.length; i++) {
    if (!UNITS.has(chars[i - 1])) continue
    const longest = Math.max(i, chars.length - i)
    if (!best || longest < best.longest) best = { i, longest }
  }
  if (!best) return [text]
  return [chars.slice(0, best.i).join(''), chars.slice(best.i).join('')]
}
