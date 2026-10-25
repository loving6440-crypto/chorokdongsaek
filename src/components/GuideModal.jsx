import { useEffect, useMemo, useState } from 'react'
import { BookOpenText, ChevronLeft, ChevronRight, X } from 'lucide-react'

// 안내서 페이지. highlight 는 화면에서 짚어줄 요소의 CSS 선택자.
const PAGES = [
  {
    title: '환영합니다',
    body: [
      '국립 창록고등학교에 오신 것을 환영합니다!',
      '이곳에서 여러분은 육조 스탯을 단련하고, 영력을 키우며, 수업과 동아리 활동으로 하루하루를 보내게 됩니다. 이 안내서는 화면을 돌아다니는 법과 몇 가지 중요한 사실을 짧게 짚어 드립니다.',
    ],
  },
  {
    title: '유의 사항',
    body: [
      <>
        겉으로는 평범한 기숙학교를 표방하고 있지만, 사실 이 학교는 한번 들어오면 함부로{' '}
        <b>나갈 수 없습니다.</b> 교문 밖을 떠도는 <s>검은 안개</s>가 학생들을 위협하기 때문에, 학교의 결계는
        여러분을 그로부터 막아주는 용도도 겸하고 있습니다.
      </>,
    ],
    small: ['신은 여러분을 결코 저버리지 않습니다.', '신은 여러분을 결코 저버리지 않습니다.', '신은 여러분을 결코 저버리지 않습니다.', '신은 여러분을 결코 저버리지 않습니다.'],
  },
  {
    title: '[창록고등학교를 돌아다니는 법]',
    body: ['이제부터 화면 곳곳에 있는 요소들을 하나씩 짚어 드리겠습니다. 아래 버튼으로 한 장씩 넘겨 보세요.'],
  },
  {
    title: '1. 프로필',
    body: ['왼쪽 위, 마름모 모양의 칸에는 여러분의 얼굴과 이름, 학년과 나이가 표시됩니다. 길을 잃었을 때 가장 먼저 확인할 곳입니다.'],
    highlight: '[aria-label="프로필"]',
  },
  {
    title: '2. 체력 · 영력 · 의지력',
    body: ['세 개의 막대는 각각 체력, 영력, 의지력을 나타냅니다. 체력이 0이 되면 전투불능 상태가 되고, 영력은 전투와 성장에, 의지력은 전투 중 특별한 행동에 쓰입니다.'],
    highlight: '[aria-label="자원"]',
  },
  {
    title: '3. 육조 스탯',
    body: ['안목 · 호전 · 인내 · 절제 · 신속 · 이해, 이 여섯 가지 스탯이 여러분의 전투와 생활 전반을 결정합니다. 영력을 들여 하나씩 강화할 수 있습니다.'],
    highlight: '[aria-label="육조 스탯"]',
  },
  {
    title: '4. 지금 있는 곳',
    body: ['작은 마름모에는 지금 머물고 있는 학교 구역이 한자로 표시됩니다. 본관 · 별관 · 기숙사 · 뒷산 · 사당 중 어디에 있는지 한눈에 확인할 수 있습니다.'],
    highlight: '[aria-label="현재 위치"]',
  },
  {
    title: '5. 메뉴',
    body: ['이 네 개의 버튼으로 학교 구역(이동), 신수, 벼룩시장, 사물함 사이를 오갈 수 있습니다.'],
    highlight: '[aria-label="메뉴"]',
  },
  {
    title: '6. 동아리와 주간 활동',
    body: ['매주 월요일 0시에 새로 시작되는 동아리의 주간 활동은 이 [동아리 확인하기] 버튼에서 확인할 수 있습니다. 수업을 듣거나 전투에서 보상을 얻는 등, 평소에 하던 일들이 자연스럽게 활동으로 쌓입니다.'],
    highlight: '[data-guide-club-btn]',
  },
  {
    title: '7. 그 밖에',
    body: ['이 외에도 여러분을 도와줄 영능력과 무기, 다양한 소지품들이 준비되어 있습니다. 하나씩 둘러보며 자신만의 방식을 찾아가 보세요. 창록고등학교에서의 생활을 응원합니다.'],
  },
]

function useHighlightRect(selector) {
  const [rect, setRect] = useState(null)
  useEffect(() => {
    if (!selector) {
      setRect(null)
      return undefined
    }
    const update = () => {
      const el = document.querySelector(selector)
      if (!el) return setRect(null)
      const r = el.getBoundingClientRect()
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height })
    }
    update()
    const t = setInterval(update, 250)
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      clearInterval(t)
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [selector])
  return rect
}

/** [안내서 보기]: 화면 구석구석을 짚어주는 벚꽃빛 튜토리얼 팝업. */
export default function GuideModal({ open, onClose }) {
  const [page, setPage] = useState(0)
  useEffect(() => {
    if (open) setPage(0)
  }, [open])
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') setPage((p) => Math.min(PAGES.length - 1, p + 1))
      if (e.key === 'ArrowLeft') setPage((p) => Math.max(0, p - 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const cur = PAGES[page]
  const rect = useHighlightRect(open ? cur?.highlight : null)

  // 다이얼로그 패널이 짚어주는 요소를 가리지 않도록, 그 요소가 화면 왼쪽 절반에 있으면 패널은 오른쪽에 둔다.
  const panelSide = useMemo(() => {
    if (!rect) return 'center'
    return rect.left + rect.width / 2 < window.innerWidth / 2 ? 'right' : 'left'
  }, [rect])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[95]" role="dialog" aria-modal="true" aria-label="안내서">
      {/* 뒷배경을 살짝 어둡게 (짚어주는 요소는 클릭이 가능하도록 pointer-events 를 꺼 둔다) */}
      <div className="absolute inset-0 bg-black/55" style={{ pointerEvents: 'none' }} />

      {rect && (
        <div
          className="pointer-events-none absolute z-[96] rounded-xl ring-4 ring-[#ff8fb3] transition-all duration-300"
          style={{
            top: rect.top - 8,
            left: rect.left - 8,
            width: rect.width + 16,
            height: rect.height + 16,
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.55), 0 0 22px 4px rgba(255,143,179,0.85)',
          }}
        />
      )}

      <div
        className={`absolute z-[97] flex max-h-[80vh] w-[min(380px,90vw)] flex-col overflow-hidden rounded-2xl border-2 border-[#ff8fb3] shadow-2xl ${
          panelSide === 'right'
            ? 'top-1/2 right-4 -translate-y-1/2'
            : panelSide === 'left'
              ? 'top-1/2 left-4 -translate-y-1/2'
              : 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'
        }`}
        style={{ background: 'linear-gradient(165deg, #ffeaf2 0%, #ffd9e8 55%, #ffc6dc 100%)', color: '#241018' }}
      >
        <div className="flex items-center justify-between gap-2 border-b border-[#ff8fb3]/50 px-4 py-2.5">
          <p className="flex items-center gap-1.5 font-serif text-base font-bold text-[#8a2a55]">
            <BookOpenText size={16} aria-hidden />
            안내서 ({page + 1}/{PAGES.length})
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="안내서 닫기"
            className="grid size-7 place-items-center rounded-lg text-[#8a2a55] hover:bg-[#ff8fb3]/20"
          >
            <X size={15} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto px-4 py-3.5">
          <p className="font-serif text-lg font-bold text-[#6e1c42]">{cur.title}</p>
          <div className="mt-2 space-y-2 text-sm leading-relaxed text-[#241018]">
            {cur.body.map((b, i) => (
              <p key={i}>{b}</p>
            ))}
          </div>
          {cur.small && (
            <div className="mt-3 space-y-0.5 text-[10px] leading-snug text-[#8a2a55]/70">
              {cur.small.map((s, i) => (
                <p key={i}>{s}</p>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-[#ff8fb3]/50 px-4 py-2.5">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[#8a2a55] disabled:opacity-30 hover:bg-[#ff8fb3]/20"
          >
            <ChevronLeft size={14} /> 이전
          </button>
          <div className="flex gap-1" aria-hidden>
            {PAGES.map((_, i) => (
              <span key={i} className={`size-1.5 rounded-full ${i === page ? 'bg-[#8a2a55]' : 'bg-[#8a2a55]/25'}`} />
            ))}
          </div>
          {page === PAGES.length - 1 ? (
            <button type="button" onClick={onClose} className="rounded-lg bg-[#8a2a55] px-3 py-1.5 text-xs font-bold text-[#ffeaf2]">
              닫기
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(PAGES.length - 1, p + 1))}
              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[#8a2a55] hover:bg-[#ff8fb3]/20"
            >
              다음 <ChevronRight size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
