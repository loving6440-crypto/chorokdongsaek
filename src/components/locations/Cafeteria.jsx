import { useCallback, useEffect, useState } from 'react'
import { Newspaper, Send, Utensils } from 'lucide-react'
import { ALLERGENS, CAFETERIA, STORY_MAX, kstDate, menuOf } from '../../game/meals'
import { fetchNewspaper, submitStory } from '../../net/online'

const ERR = {
  empty: '내용을 적어 주세요.',
  'too-long': `사연은 ${STORY_MAX}자까지 적을 수 있어요.`,
  'slow-down': '잠시 후에 다시 투고해 주세요. (1시간에 5건까지)',
  full: '투고함이 가득 찼어요. 관리자가 비울 때까지 기다려 주세요.',
  'not-connected': '서버에 연결되어 있지 않아요. 잠시 후 다시 시도해 주세요.',
}

const dishLine = (m) => [m.rice, m.soup, m.main, ...m.sides, m.kimchi]

function MealCard({ meal }) {
  const key = meal.slot.id
  return (
    <article data-meal={key} className="rounded-xl bg-shade/25 p-3">
      <p className="flex items-baseline justify-between">
        <b className="font-serif text-base text-gold">{meal.slot.label}</b>
        <span className="text-[10px] text-paper/50">{meal.slot.time}</span>
      </p>
      <ul className="mt-1.5 space-y-0.5 text-sm text-paper/85">
        {dishLine(meal).map((d, i) => (
          <li key={i} className={i === 2 ? 'font-medium text-[#e0884a]' : ''}>
            {d.name}
            {d.allergens.length > 0 && <sup className="ml-0.5 text-[9px] text-paper/45">{d.allergens.join('.')}</sup>}
          </li>
        ))}
        <li className="text-paper/70">
          후식 · {meal.extra.name}
          {meal.extra.allergens.length > 0 && <sup className="ml-0.5 text-[9px] text-paper/45">{meal.extra.allergens.join('.')}</sup>}
        </li>
        {meal.afterSchool && (
          <li className="text-paper/70">
            방과후 · {meal.afterSchool.name}
            {meal.afterSchool.allergens.length > 0 && <sup className="ml-0.5 text-[9px] text-paper/45">{meal.afterSchool.allergens.join('.')}</sup>}
          </li>
        )}
      </ul>
      {meal.allergens.length > 0 && (
        <p className="mt-1.5 text-[10px] leading-snug text-paper/45">알레르기: {meal.allergens.map((n) => `${n}.${ALLERGENS[n]}`).join(' ')}</p>
      )}
    </article>
  )
}

/** 기숙사 · 급식실: 그날의 교내 신문 + 익명 사연 투고함 + 그날의 급식 식단표. */
export default function Cafeteria({ online, onSubmitted }) {
  const [date] = useState(() => kstDate())
  const menu = menuOf(date)
  const [paper, setPaper] = useState({ loading: true, stories: [] })
  const [text, setText] = useState('')
  const [note, setNote] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    fetchNewspaper(date).then((r) => setPaper(r.ok ? { stories: r.stories } : { stories: [], error: true }))
  }, [date])
  useEffect(() => {
    load()
    const t = setInterval(load, 30000)
    return () => clearInterval(t)
  }, [load])

  const send = async (e) => {
    e.preventDefault()
    if (busy) return
    const body = text.trim()
    if (!body) return setNote({ ok: false, text: ERR.empty })
    setBusy(true)
    const r = await submitStory(body)
    setBusy(false)
    if (r.ok) {
      setText('')
      setNote({ ok: true, text: '투고함에 넣었어요. 관리자가 살펴보고 신문에 올릴지 정해요. (쓴 사람은 알려지지 않아요)' })
      onSubmitted?.()
    } else setNote({ ok: false, text: ERR[r.error] ?? '투고하지 못했어요.' })
  }

  const [, m, d] = date.split('-')
  return (
    <section aria-label="급식실">
      <h2 className="flex items-center gap-2 font-serif text-2xl text-gold">
        <Utensils size={22} aria-hidden />
        {CAFETERIA.name}
      </h2>
      <p className="mt-1 text-sm text-paper/70" data-cafeteria-oneline>{CAFETERIA.oneLine}</p>

      <div className="mt-4 grid gap-3 md:grid-cols-[1.4fr_1fr]">
        <div className="ink-panel rounded-xl p-4" data-newspaper>
          <p className="flex items-center gap-2 font-serif text-lg text-paper">
            <Newspaper size={18} aria-hidden className="text-gold" />
            그날의 교내 신문
          </p>
          <p className="text-[11px] text-paper/50">{Number(m)}월 {Number(d)}일자</p>
          {paper.stories.length === 0 ? (
            <p className="mt-3 min-h-24 rounded-lg border border-dashed border-edge/25 px-3 py-6 text-center text-sm text-paper/45" data-newspaper-empty>
              {paper.loading ? '신문을 가져오는 중…' : '아직 실린 이야기가 없다.'}
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {paper.stories.map((s) => (
                <li key={s.no} data-story={s.no} className="rounded-lg bg-shade/25 px-3 py-2">
                  <p className="text-xs font-bold text-gold">#{s.no}</p>
                  <p className="mt-0.5 whitespace-pre-line break-words text-sm leading-relaxed text-paper/85">{s.text}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <form onSubmit={send} className="ink-panel rounded-xl p-4" data-story-box>
          <p className="font-serif text-lg text-paper">익명 사연 투고함</p>
          <p className="mt-1 text-[11px] leading-relaxed text-paper/55">아무 이야기나 적어 넣어 보세요. 관리자가 확인해서 신문에 올려요. 쓴 사람은 알려지지 않고, #1, #2, #3 순서로만 실려요.</p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, STORY_MAX))}
            rows={5}
            aria-label="익명 사연"
            placeholder="사연을 적어 주세요"
            className="mt-2 w-full rounded border border-edge/25 bg-ink-muted/60 px-2 py-1.5 text-sm text-paper outline-none focus:border-gold/50"
          />
          <div className="mt-1 flex items-center justify-between text-[11px] text-paper/50">
            <span>{text.length} / {STORY_MAX}</span>
            <button type="submit" disabled={busy || !online} className="flat-btn flex items-center gap-1 disabled:opacity-40">
              <Send size={13} aria-hidden /> 투고하기
            </button>
          </div>
          {!online && <p className="mt-1 text-[11px] text-paper/50">서버에 연결되면 투고할 수 있어요.</p>}
          {note && (
            <p role="status" className={`mt-1 text-[11px] ${note.ok ? 'text-gold' : 'text-crimson'}`}>
              {note.text}
            </p>
          )}
        </form>
      </div>

      <div className="ink-panel mt-3 rounded-xl p-4" data-menu>
        <p className="font-serif text-lg text-paper">급식 식단표</p>
        <p className="text-[11px] text-paper/50">{Number(m)}월 {Number(d)}일 · 아침 / 점심 / 저녁 · 위첨자는 알레르기 번호</p>
        <div className="mt-2 grid gap-2 md:grid-cols-3">
          {menu.map((meal) => (
            <MealCard key={meal.slot.id} meal={meal} />
          ))}
        </div>
      </div>
    </section>
  )
}
