import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, X, ZoomIn } from 'lucide-react'
import { cropAvatarDataUrl } from '../game/avatarImage'

const VP = 260 // 자르기 칸(뷰포트) 한 변의 화면 픽셀 크기
const MAX_ZOOM = 4

/**
 * 업로드한 원본 이미지(img) 위에서 사용자가 자를 정사각형 영역을 직접 끌고(이동) 늘려(확대)
 * 고를 수 있게 하는 모달. 완료하면 cropAvatarDataUrl 로 잘라낸 결과 data URL 을 onDone 에 넘긴다.
 * img: HTMLImageElement (loadAvatarImageFile 로 얻은 것)
 */
export default function AvatarCropper({ img, onDone, onCancel }) {
  const minSide = Math.min(img.naturalWidth, img.naturalHeight)
  const [zoom, setZoom] = useState(1) // 1 = 짧은 변이 꼭 맞게 보인다. 커질수록 더 확대되어, 자르는 영역이 좁아진다.
  const scale = useMemo(() => (VP / minSide) * zoom, [minSide, zoom])
  const imgW = img.naturalWidth * scale
  const imgH = img.naturalHeight * scale
  // pan: 뷰포트 안에서 이미지 좌상단의 위치(화면 px). 항상 이미지가 뷰포트를 완전히 덮도록 clamp 한다.
  const [pan, setPan] = useState(() => ({ x: -(imgW - VP) / 2, y: -(imgH - VP) / 2 }))
  const dragRef = useRef(null)
  const prevScaleRef = useRef(scale)

  const clampPan = (p, w, h) => ({
    x: Math.min(0, Math.max(VP - w, p.x)),
    y: Math.min(0, Math.max(VP - h, p.y)),
  })

  // 확대 배율이 바뀌면, 뷰포트 중심이 가리키던 원본 이미지 위의 지점을 그대로 유지한 채 다시 맞춘다.
  useEffect(() => {
    setPan((p) => {
      const oldScale = prevScaleRef.current
      const centerX = (VP / 2 - p.x) / oldScale
      const centerY = (VP / 2 - p.y) / oldScale
      prevScaleRef.current = scale
      return clampPan({ x: VP / 2 - centerX * scale, y: VP / 2 - centerY * scale }, imgW, imgH)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scale])

  const onPointerDown = (e) => {
    dragRef.current = { x: e.clientX, y: e.clientY, pan }
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }
  const onPointerMove = (e) => {
    if (!dragRef.current) return
    const dx = e.clientX - dragRef.current.x
    const dy = e.clientY - dragRef.current.y
    setPan(clampPan({ x: dragRef.current.pan.x + dx, y: dragRef.current.pan.y + dy }, imgW, imgH))
  }
  const onPointerUp = () => {
    dragRef.current = null
  }

  const confirm = () => {
    const size = VP / scale // 원본 픽셀 기준 자르기 영역의 한 변
    const sx = -pan.x / scale
    const sy = -pan.y / scale
    onDone(cropAvatarDataUrl(img, { sx, sy, size }))
  }

  return (
    <div className="modal-scrim fixed inset-0 z-[80] grid place-items-center p-4" onClick={onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="프로필 사진 자르기"
        className="ink-panel w-full max-w-sm rounded-2xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <p className="font-serif text-lg text-gold">사진 자르기</p>
          <button type="button" data-sfx="none" onClick={onCancel} aria-label="닫기" className="rounded p-1 text-paper/50 hover:text-paper">
            <X size={16} />
          </button>
        </div>
        <p className="mt-1 text-[11px] text-paper/55">끌어서 위치를 옮기고, 아래 슬라이더로 확대·축소할 수 있어요.</p>

        <div
          className="mx-auto mt-3 touch-none overflow-hidden rounded-xl bg-shade/40 ring-1 ring-edge/20"
          style={{ width: VP, height: VP, cursor: dragRef.current ? 'grabbing' : 'grab' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          data-avatar-crop-viewport
        >
          <img
            src={img.src}
            alt=""
            draggable={false}
            className="select-none"
            style={{ width: imgW, height: imgH, transform: `translate(${pan.x}px, ${pan.y}px)`, maxWidth: 'none' }}
          />
        </div>

        <div className="mt-3 flex items-center gap-2">
          <ZoomIn size={14} className="shrink-0 text-paper/55" aria-hidden />
          <input
            type="range"
            min={1}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            aria-label="확대"
            className="w-full"
            data-avatar-crop-zoom
          />
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="rounded border border-edge/30 px-3 py-1.5 text-xs text-paper/80 hover:bg-edge/10">
            취소
          </button>
          <button
            type="button"
            onClick={confirm}
            data-avatar-crop-confirm
            className="inline-flex items-center gap-1.5 rounded border border-gold/30 bg-gold/15 px-3 py-1.5 text-xs text-gold hover:bg-gold/25"
          >
            <Check size={13} />
            적용
          </button>
        </div>
      </div>
    </div>
  )
}
