import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Clock, Zap } from 'lucide-react'
import NpcDialog from './NpcDialog'
import { isOpenAt, resolveEntries, splitWinLose, visibleChoices, withName } from '../game/scene'

// 굵게 · 기울임 글자만 화면 글꼴 설정과 상관없이 조선일보명조(없으면 명조 계열)로 쓴다. 나머지 글은 화면 글꼴 그대로. (index.css .script-myeongjo)
export const SCRIPT_FONT = 'script-myeongjo'

/**
 * 시트의 글자 연출을 그대로 옮긴다: ***굵게+기울임***, **굵게**, *기울임*, ~~흔들림~~. 줄바꿈은 그대로 둔다.
 * (v-B.07: 굵게·기울임은 시트에서 굵게·기울임인 곳에만 쓴다)
 */
export function Rich({ text }) {
  return String(text)
    .split(/(\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|~~[^~]+~~|\*[^*\n]+\*)/)
    .map((t, i) => {
      if (t.startsWith('***') && t.length > 6) return <b key={i} className={`${SCRIPT_FONT} font-bold italic`} data-rich="bi">{t.slice(3, -3)}</b>
      if (t.startsWith('**') && t.length > 4) return <b key={i} className={`${SCRIPT_FONT} font-bold`} data-rich="b">{t.slice(2, -2)}</b>
      if (t.startsWith('~~') && t.length > 4) return <span key={i} className="scene-jitter" data-jitter>{t.slice(2, -2)}</span>
      if (t.startsWith('*') && t.length > 2) return <em key={i} className={`${SCRIPT_FONT} italic`} data-rich="i">{t.slice(1, -1)}</em>
      return t
    })
}
/** 꾸밈 표기를 뺀 글 (로그 · aria) */
export const plainOf = (text) => String(text).replace(/\*+|~~/g, '')


export const Paras = ({ list, jitter = false }) =>
  list.map((t, i) => (
    <p key={i} className={`whitespace-pre-line text-sm leading-[1.9] break-keep text-paper/90 ${i ? 'mt-3' : ''} ${jitter ? 'scene-jitter' : ''}`} data-scene-para>
      <Rich text={t} />
    </p>
  ))

/** NPC 표정: npc.faces[face] 가 있으면 그 그림, 없으면 기본 그림 */
const faceSrc = (npc, face) => (face && npc.faces?.[face]) || npc.src

const fmtLeft = (ms) => {
  const s = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/** 화면 어디든 누르면 fn 을 부른다(이 장면이 뜬 그 클릭은 건너뛴다). */
function useAnyClick(on, fn) {
  const ref = useRef(fn)
  ref.current = fn
  useEffect(() => {
    if (!on) return undefined
    let armed = false
    const t = setTimeout(() => { armed = true }, 0)
    const h = () => { if (armed) ref.current() }
    document.addEventListener('click', h)
    return () => { clearTimeout(t); document.removeEventListener('click', h) }
  }, [on])
}

/** 의지력을 쓰거나 기다려야 결과가 나오는 선택지. */
function CostBox({ node, ctx, costKey }) {
  const { mp = 0, wait = 0 } = node.cost
  const [revealed, setRevealed] = useState(null) // { paras, notice }
  const [err, setErr] = useState('')
  const [now, setNow] = useState(() => Date.now())
  const until = ctx.player?.exploreWaits?.[costKey] ?? 0
  const waiting = until > 0
  useEffect(() => {
    if (!waiting) return undefined
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [waiting])

  const reveal = () => {
    if (node.action) {
      const r = ctx.act(node.action.kind, node.action) ?? {}
      if (r.error) return setErr(r.error)
      if (node.action.kind === 'goblinPlay') {
        const { win, lose } = splitWinLose(node.result ?? '')
        return setRevealed({ paras: [r.win ? `**승리 :** ${win}` : `**패배 :** ${lose}`], notice: r.notice, win: r.win })
      }
      return setRevealed({ paras: r.paras ?? [], notice: r.notice })
    }
    setRevealed({ paras: [].concat(node.result ?? []).map((t) => withName(t, ctx.name)) })
  }
  const quick = () => {
    setErr('')
    const r = ctx.act('spendMp', { amount: mp, reason: node.name })
    if (r?.error) return setErr(r.error)
    reveal()
  }
  const startWait = () => {
    setErr('')
    const r = ctx.act('waitStart', { key: costKey, minutes: wait, label: node.name })
    if (r?.error) setErr(r.error)
    setNow(Date.now())
  }
  const claim = () => {
    setErr('')
    const r = ctx.act('waitClaim', { key: costKey })
    if (r?.error) return setErr(r.error)
    reveal()
  }

  if (revealed) {
    return (
      <div className="mt-3" data-cost-result>
        <Paras list={revealed.paras} />
        {revealed.notice && <p className="mt-3 rounded-lg border border-gold/30 px-3 py-2 text-xs text-gold" data-scene-notice>{revealed.notice}</p>}
        {node.repeat && (
          <button type="button" className="flat-btn-ghost mt-3 text-xs" onClick={() => setRevealed(null)} data-cost-again>
            한 번 더
          </button>
        )}
      </div>
    )
  }
  const left = until - now
  return (
    <div className="mt-3 rounded-xl bg-shade/25 p-3" data-cost-box={costKey}>
      {node.costNote && <p className="text-xs leading-relaxed text-paper/70">{node.costNote}</p>}
      {waiting ? (
        left > 0 ? (
          <p className="mt-1 flex items-center gap-1.5 text-xs text-gold" data-cost-waiting>
            <Clock size={13} aria-hidden /> 기다리는 중… 남은 시간 {fmtLeft(left)}
          </p>
        ) : (
          <button type="button" className="flat-btn mt-2 text-xs" onClick={claim} data-cost-claim>
            결과를 본다
          </button>
        )
      ) : (
        <div className="mt-2 flex flex-wrap gap-2">
          {wait > 0 && (
            <button type="button" className="flat-btn text-xs" onClick={startWait} data-cost-wait>
              <Clock size={13} aria-hidden /> {wait}분 기다린다
            </button>
          )}
          {mp > 0 && (
            <button type="button" className="flat-btn-ghost text-xs" onClick={quick} disabled={(ctx.player?.mp ?? 0) < mp} data-cost-quick>
              <Zap size={13} aria-hidden /> {node.quickLabel ?? '바로 한다'} (의지력 {mp})
            </button>
          )}
        </div>
      )}
      {err && <p className="mt-2 text-xs text-crimson" role="alert">{err}</p>}
    </div>
  )
}

/** 장면 하나의 글(과 효과). */
function Output({ node, paras, ctx, costKey, renderWidget, onEnd }) {
  const [page, setPage] = useState(0)
  const [typed, setTyped] = useState(-1) // -1: 아직, 0..n: 타이핑 중, n: 끝
  const seq = node.seq ?? null
  const typeText = node.typeAfter ? withName(node.typeAfter, ctx.name) : ''
  const closed = node.night && !isOpenAt(node.night, Date.now())

  // 순서대로: 누를 때마다 다음 장. 끝까지 보면 end.
  useAnyClick(!!seq && !closed, () => {
    if (page < seq.length - 1) setPage((p) => p + 1)
    else onEnd(node.end ?? 'back')
  })
  // 화면을 누르면 곧바로 빠져나간다.
  useAnyClick(!!node.clickExit && !closed, () => onEnd(node.end ?? 'root'))
  // 한 번 누르면 이어지는 글이 타이핑된다. 다 쳐지면 end.
  useAnyClick(!!typeText && typed < 0, () => setTyped(0))
  useEffect(() => {
    if (typed < 0 || !typeText) return undefined
    if (typed >= typeText.length) {
      const t = setTimeout(() => onEnd(node.end ?? 'home'), 1600)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setTyped((n) => n + 1), 45)
    return () => clearTimeout(t)
  }, [typed, typeText]) // eslint-disable-line react-hooks/exhaustive-deps

  if (closed) return <Paras list={[node.night.closed]} />
  const jitter = node.fx === 'jitter'
  return (
    <div data-scene-output={node.id}>
      {node.npc ? (
        paras.length > 0 && (
          <NpcDialog npc={node.npc.name} src={faceSrc(node.npc, paras.face)} face={paras.face} dataNpc={node.npc.id}>
            <Rich text={paras.join('\n')} />
          </NpcDialog>
        )
      ) : (
        <Paras list={paras} jitter={jitter} />
      )}
      {typeText && (
        <p className="whitespace-pre-line text-sm leading-[1.9] break-all text-paper/90" data-typewriter>
          {typed < 0 ? <span className="text-[11px] text-paper/40">(화면을 누르면 이어서 읽힌다)</span> : <span className={`${node.typeBold || node.typeItalic ? SCRIPT_FONT : ''} ${node.typeBold ? 'font-bold' : ''} ${node.typeItalic ? 'italic' : ''}`} data-typed>{typeText.slice(0, typed)}</span>}
          {typed >= 0 && typed < typeText.length && <span className="scene-caret" aria-hidden>▍</span>}
        </p>
      )}
      {seq && (
        <div className={paras.length ? 'mt-3' : ''} data-scene-seq={page}>
          {node.npc ? (
            <NpcDialog npc={node.npc.name} src={node.npc.src} dataNpc={node.npc.id}>
              <Rich text={withName(seq[page], ctx.name)} />
            </NpcDialog>
          ) : (
            <Paras list={[withName(seq[page], ctx.name)]} />
          )}
          <p className="mt-2 text-[11px] text-paper/40">{page < seq.length - 1 ? '(화면을 누르면 다음으로)' : '(화면을 누르면 돌아간다)'}</p>
        </div>
      )}
      {node.clickExit && <p className="mt-2 text-[11px] text-paper/35">(화면을 누르면 돌아간다)</p>}
      {node.cost && <CostBox node={node} ctx={ctx} costKey={costKey} />}
      {node.notice && <p className="mt-3 rounded-lg border border-gold/30 px-3 py-2 text-xs text-gold" data-scene-notice>{node.notice}</p>}
      {node.widget && renderWidget?.(node)}
    </div>
  )
}

/** NPC 대사 하나를 뽑는다. 대사는 '문자열' 또는 { text, face }. 고른 표정은 배열의 face 로 넘긴다. */
const pickLine = (node, name) => {
  const l = node.lines[Math.floor(Math.random() * node.lines.length)]
  const out = [withName(typeof l === 'string' ? l : l.text, name)]
  if (typeof l === 'object' && l.face) out.face = l.face
  return out
}

/** 장면의 글을 지금 상태로 풀어 낸다(확률 문구는 여기서 한 번만 굴린다). */
function resolveNode(node, ctx, seedBase) {
  if (node.lines?.length) return pickLine(node, ctx.name)
  return resolveEntries(node.text ?? [], ctx.stats, `${seedBase}|${node.id}`, Date.now()).map((t) => withName(t, ctx.name))
}

/**
 * 장소 하나(root)를 둘러보는 화면. 선택지를 누르면 그 아래로 들어가거나(선택지가 또 있을 때),
 * 그 자리 아래에 결과 글을 보여 준다.
 *  ctx = { stats, player, name, act(kind, payload) }
 *  scope: 대기 타이머 · 하루 문구에 쓰는 이름표(예: 'mainHall:b1:archiveB')
 */
export default function Scene({ root, ctx, scope, onHome, renderWidget, onOpen, onShow, hideRootText = false }) {
  const [path, setPath] = useState([root])
  const [leaf, setLeaf] = useState(null) // { node, paras, n }
  const leafRef = useRef(null)
  useEffect(() => {
    if (leaf) leafRef.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' })
  }, [leaf])
  const cur = path.at(-1)
  const seedBase = scope ?? root.id
  const curParas = useMemo(() => resolveNode(cur, ctx, seedBase), [cur]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!hideRootText || path.length > 1) onShow?.(cur, curParas)
  }, [cur]) // eslint-disable-line react-hooks/exhaustive-deps

  const end = (kind) => {
    if (kind && typeof kind === 'object' && kind.goto) return ctx.act('goto', { location: kind.goto })
    if (kind === 'home') return onHome?.()
    if (kind === 'root') {
      setLeaf(null)
      return setPath([root])
    }
    if (kind === 'back-branch') {
      setLeaf(null)
      return setPath((p) => (p.length > 1 ? p.slice(0, -1) : p))
    }
    if (leaf) return setLeaf(null)
    if (path.length > 1) setPath((p) => p.slice(0, -1))
  }
  const choose = (c) => {
    onOpen?.(c, path.length)
    if (c.choices?.length) {
      setLeaf(null)
      setPath((p) => [...p, c])
      return
    }
    const paras = resolveNode(c, ctx, seedBase)
    setLeaf((l) => ({ node: c, paras, n: (l?.n ?? 0) + 1 }))
    onShow?.(c, paras)
  }
  const closedNow = cur.night && !isOpenAt(cur.night, Date.now())
  const choices = closedNow ? [] : visibleChoices(cur, ctx.stats)
  const costKey = (n) => `${seedBase}:${n.id}`

  return (
    <div data-scene={cur.id}>
      {path.length > 1 && (
        <button type="button" className="mb-2 inline-flex items-center gap-1 text-xs text-paper/60 hover:text-paper" onClick={() => end('back-branch')} data-scene-back>
          <ArrowLeft size={13} aria-hidden /> {plainOf(path.at(-2).name)}(으)로
        </button>
      )}
      {path.length > 1 && <p className="text-[11px] tracking-widest text-gold"><Rich text={cur.name} /></p>}
      {!(hideRootText && path.length === 1) && (
        <div className={path.length > 1 ? 'mt-2' : ''}>
          <Output key={`${cur.id}`} node={cur} paras={curParas} ctx={ctx} costKey={costKey(cur)} renderWidget={renderWidget} onEnd={end} />
        </div>
      )}
      {choices.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label={`${plainOf(cur.name)}에서 살펴보기`}>
          {choices.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={leaf?.node.id === c.id}
              onClick={() => choose(c)}
              data-scene-choice={c.id}
              className={`tilt rounded-full px-3.5 py-1.5 text-left text-sm text-paper ${leaf?.node.id === c.id ? 'bg-gold-fill/30' : 'bg-edge/[0.07] hover:bg-gold-fill/20'}`}
            >
              <Rich text={c.name} />
              {c.caption && <span className="ml-1.5 text-[10px] text-paper/50">{c.caption}</span>}
            </button>
          ))}
        </div>
      )}
      {leaf && (
        <div ref={leafRef} className="mt-4 border-t border-edge/15 pt-4" aria-live="polite">
          <p className="text-[11px] tracking-widest text-gold"><Rich text={leaf.node.name} /></p>
          <div className="mt-2">
            <Output key={`${leaf.node.id}:${leaf.n}`} node={leaf.node} paras={leaf.paras} ctx={ctx} costKey={costKey(leaf.node)} renderWidget={renderWidget} onEnd={end} />
          </div>
        </div>
      )}
    </div>
  )
}
