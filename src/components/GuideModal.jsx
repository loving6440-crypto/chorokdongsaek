import { useEffect, useMemo, useState } from 'react'
import { BookOpenText, ChevronLeft, ChevronRight, X } from 'lucide-react'

// 안내서 페이지. highlight 는 화면에서 짚어줄 요소의 CSS 선택자. (사용자가 준 대사를 그대로 옮긴다.)
const PAGES = [
  {
    title: '환영합니다',
    body: [
      '국립 창록고등학교에 오신 것을 환영합니다! 이곳은 영능력을 타고나거나 개화한 아이들을 위해 설립된 전문 퇴마학교입니다. 여러분은 입학생 또는 전학생으로써 이 학교에 오게 되었습니다. 어제까지의 평화로운 일상은 안녕, 이제부터는 신의 사랑을 만끽하며 무속의 길을 걸어봅시다. 마음껏 들과 산을 돌아다니고, 싸우고, 윷놀이를 던져 가며 하루하루를 즐기세요!',
    ],
  },
  {
    title: '유의 사항',
    body: [
      <>
        겉으로는 일반 기숙학교를 표방하고 있지만, 이 학교가 허락해주는 순간이 오기 전까지, 또는 여러분이 어엿한
        무속인이 되기 전까지 이곳에서 <b>나갈 수 없습니다.</b> 하지만 걱정 마세요! <s>검은 안개</s>가 여러분을
        습격하는 것을 막는 용도도 있으니까요. <b>외부에 그 어떤 재앙, 비극, 절망이 있더라도 이 학교에 있는 이상
        여러분은 절대적으로 안전합니다.</b>
      </>,
    ],
    small: [
      '신은 여러분을 결코 저버리지 않습니다.',
      '신은 여러분을 결코 저버리지 않습니다.',
      '신은 여러분을 결코 저버리지 않습니다.',
      '신은 여러분을 결코 저버리지 않습니다.',
    ],
  },
  {
    title: '[창록고등학교를 돌아다니는 법]',
    body: ['처음 오신 분들에게는 학교가 낯설게 느껴질 수 있습니다.'],
  },
  {
    title: '1.',
    body: ['이곳은 여러분의 인적 사항을 적거나 수정할 수 있는 곳입니다. 양옆으로 현재 위치, 신수의 상태가 표시됩니다.'],
    highlight: '[aria-label="프로필"]',
  },
  {
    title: '2.',
    body: [
      '이곳은 여러분의 상태를 표시하는 곳입니다. 체력은 전투 또는 조사 중에 여러 사유로 깎이며, 의지력은 영능력을 사용할 때 깎입니다. 영력은 [육조 스탯]을 올리는 데에 사용하는 자가발전을 위한 자산이나, 가끔 특수 제작에 쓰이기도 합니다.',
    ],
    highlight: '[aria-label="자원"]',
  },
  {
    title: '3.',
    body: [
      '이곳은 여러분의 현재 능력치를 표시하는 곳입니다. 각 설명은 스탯 이름을 클릭하여 확인해주세요. 전투는 물론 조사, 일상생활 등 다양한 곳에 영향을 주는 스탯들입니다. 영력을 소모하면 육조 스탯을 성장시킬 수 있습니다. 체력이 0이 되면 전투불능 상태가 되며 [쇠약]이라는 상태이상이 붙으니 주의하세요.',
    ],
    highlight: '[aria-label="육조 스탯"]',
  },
  {
    title: '4.',
    body: [
      '이곳은 여러분의 현재 위치를 표시하는 곳입니다. 학교 시설 곳곳에 NPC와 상호작용 가능한 시설이 숨겨져 있으니, 즐겁게 탐험해보세요. 닳은 체력과 의지력 채우기, 동아리 가입하기, 제작하기, 구매하기 등 다양한 활동이 가능한 구역들이 있습니다. 곳곳에서 아이템을 취득하거나, 이벤트가 생기는 경우도 적잖게 있습니다.',
    ],
    highlight: '[aria-label="활동 선택"]',
  },
  {
    title: '5.',
    body: [
      '이 버튼을 통해 활동을 정할 수 있습니다. 학교를 조사하거나, 신수의 상태를 열람하거나, 서버 전체에 공유되는 경매장에 물건을 사고팔거나, 쪽지/아이템 등을 친구에게 선물할 수 있습니다.',
    ],
    highlight: '[aria-label="메뉴"]',
  },
  {
    title: '6.',
    body: ['기본적으로 창록고등학교는 [일일 퀘스트], [주간 퀘스트] 위주로 돌아갑니다.'],
  },
  {
    title: '7.',
    body: ['일일 퀘스트는 본관 > 수업에서 진행할 수 있는 영력 보상 미니게임, 뒷산 > 퇴마 실습에서 진행할 수 있는 전투로 나뉩니다.'],
    highlight: '[aria-label="활동 선택"]',
  },
  {
    title: '8.',
    body: ['주간 퀘스트는 별관의 다양한 곳에서 가입할 수 있는 동아리를 통해 진행할 수 있습니다. 동아리 가입 후 해당 버튼을 눌러 내용을 확인할 수 있습니다.'],
    highlight: '[data-guide-club-btn]',
  },
  {
    title: '9.',
    body: ['곳곳에서 다양한 영능력, 무구, 아이템 등을 획득해 더 강한 퇴마사가 되어봅시다! 여러분의 즐거운 고등학교 생활을 창록이 응원합니다.'],
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
