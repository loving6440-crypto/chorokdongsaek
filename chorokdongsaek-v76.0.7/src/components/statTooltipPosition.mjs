/** 커서 기준으로 툴팁을 배치하고 화면 바깥으로 넘치지 않게 보정한다. */
export function tooltipPosition({ x, y, width, height, viewportWidth, viewportHeight, above = false }) {
  const gap = 12
  const margin = 8
  const maxLeft = Math.max(margin, viewportWidth - width - margin)
  const maxTop = Math.max(margin, viewportHeight - height - margin)

  let left = x + gap
  if (left + width > viewportWidth - margin) left = x - width - gap
  left = Math.max(margin, Math.min(left, maxLeft))

  let top = above ? y - height - gap : y + gap
  if (above && top < margin) top = y + gap
  if (!above && top + height > viewportHeight - margin) top = y - height - gap
  top = Math.max(margin, Math.min(top, maxTop))
  return { left, top }
}
