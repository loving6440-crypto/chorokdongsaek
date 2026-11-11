import { useState } from 'react'
import { Mail, Flame } from 'lucide-react'

const LETTER_LINES = [
  '귀하에겐 영능력이 있는 것으로 판명났으며, 이에 따라 국립 창록고등학교에서는 본교에서의 교육 및 임시보호 형태의 거주를 제안하는 바입니다. 제공이 된 서류의 빈칸을 빠짐없이 기술한 후, 종이의 아무 끄트머리에 정자로 이름을 적어둔 뒤 인근 불에 태울 경우 서류가 교내로 전송됩니다.',
  '귀하의 입학을 고대하고 있겠습니다.',
]

/**
 * 인트로가 끝난 뒤, 캐릭터 생성으로 들어가기 전에 보여 주는 초대장 연출.
 * 봉투를 열어보고, 편지를 다 읽은 뒤 끄트머리를 눌러 넘기면 신입생 등록으로 넘어간다.
 */
export default function InvitationLetter({ onDone }) {
  const [open, setOpen] = useState(false)
  const [leaving, setLeaving] = useState(false)

  const finish = () => {
    if (leaving) return
    setLeaving(true)
    setTimeout(() => onDone?.(), 650)
  }

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center overflow-hidden px-4 text-[#f4efdc] select-none"
      style={{
        backgroundColor: '#050a1a',
        opacity: leaving ? 0 : 1,
        transition: 'opacity 650ms ease',
      }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 55% 50% at 50% 42%, rgba(247,220,136,0.14), transparent 70%)',
        }}
      />

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="tilt relative flex flex-col items-center gap-4 rounded-2xl border border-[#f7dc88]/25 bg-[#f4efdc]/[0.04] px-10 py-12 text-center transition hover:bg-[#f7dc88]/[0.06]"
        >
          <Mail size={40} className="text-[#f7dc88]/85" aria-hidden />
          <p className="font-myeongjo text-lg tracking-wide text-[#f7dc88]">학교에서 보낸 편지가 도착했다</p>
          <p className="text-xs text-[#f4efdc]/55">눌러서 열어본다</p>
        </button>
      ) : (
        <div
          className="intro-paragraph w-full max-w-xl rounded-2xl border border-[#f7dc88]/20 bg-[#f4efdc]/[0.05] p-7 sm:p-9"
          style={{ boxShadow: '0 0 60px rgba(247,220,136,0.08)' }}
        >
          <p className="text-center text-[11px] tracking-[0.3em] text-[#f7dc88]/60">국립 창록고등학교</p>
          <div className="mt-5 space-y-4">
            {LETTER_LINES.map((line, i) => (
              <p key={i} className="font-myeongjo text-[15px] leading-[2] break-keep text-[#f4efdc]/90">
                {line}
              </p>
            ))}
          </div>
          <div className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={finish}
              className="flex items-center gap-2 rounded-full border border-[#f7dc88]/35 px-6 py-2 text-sm text-[#f7dc88] transition hover:bg-[#f7dc88]/10"
            >
              <Flame size={14} aria-hidden />
              끄트머리를 불에 태운다
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
