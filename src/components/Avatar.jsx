/**
 * avatar: { kind: 'image', src } | { kind: 'color', color }
 * 단색 아바타는 글자 없이 색만 채워서 보여준다.
 * (name 은 기존 호출부와의 호환을 위해 받지만 쓰지 않는다.)
 */
export default function Avatar({ avatar, size = 40, className = '' }) {
  const box = { width: size, height: size }

  if (avatar?.kind === 'image') {
    return (
      <img
        src={avatar.src}
        alt=""
        draggable={false}
        className={`shrink-0 rounded-full object-cover ring-1 ring-gold/40 ${className}`}
        style={box}
      />
    )
  }

  return (
    <span
      aria-hidden
      className={`block shrink-0 rounded-full ring-1 ring-gold/40 ${className}`}
      style={{ ...box, backgroundColor: avatar?.color ?? '#1f7a4d' }}
    />
  )
}
