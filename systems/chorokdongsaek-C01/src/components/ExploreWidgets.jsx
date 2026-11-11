import { useEffect, useState } from 'react'
import { BedDouble, KeyRound } from 'lucide-react'
import { fetchStudents } from '../net/online'
import { gradeOf } from '../game/character'
import { LOCKED_TEXT, canOpenLocker } from '../game/locker'
import { RICE_POUCH, goblinTokenToday, hasLostKey, ricePouchText } from '../game/exploreActions'
import { GOBLIN_TOKEN, countOf, itemOf } from '../game/items'
import { LOST_KEY } from '../game/itemsB07'
import Locker from './Locker'

/** 본관 3층 교실 · 학생기록부: 그 학년으로 등록된 학생 전원의 명단 */
export function StudentList({ grade, player }) {
  const [state, setState] = useState({ loading: true, names: [] })
  useEffect(() => {
    let alive = true
    fetchStudents(grade).then((r) => {
      if (!alive) return
      if (r?.ok && Array.isArray(r.names)) setState({ loading: false, names: r.names })
      else {
        // 서버에 닿지 않으면(혼자 하는 중) 내 이름만이라도 보여 준다.
        const mine = player?.name && gradeOf(player) === grade ? [player.name] : []
        setState({ loading: false, names: mine, offline: true })
      }
    })
    return () => {
      alive = false
    }
  }, [grade]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="mt-3 rounded-xl bg-shade/25 p-3" data-student-list={grade}>
      <p className="text-[10px] tracking-[0.25em] text-paper/50">{grade}학년 학생기록부</p>
      {state.loading ? (
        <p className="mt-2 text-xs text-paper/55">명단을 펼치는 중…</p>
      ) : state.names.length ? (
        <ol className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-paper/90 sm:grid-cols-3">
          {state.names.map((n, i) => (
            <li key={`${n}-${i}`} className="truncate" data-student>
              <span className="mr-1.5 text-[10px] text-paper/40 tabular-nums">{i + 1}</span>
              {n}
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-2 text-xs text-paper/55">{state.offline ? '서버에 닿지 않아 명단을 펼치지 못했다.' : '아직 이름이 적힌 학생이 없다.'}</p>
      )}
    </div>
  )
}

/** 본관 3층 물품보관소: 자기 학년은 그대로, 다른 학년은 잠겨 있고 열쇠가 있으면 [몰래 열어보기] */
export function LockerSpot({ grade, player, onMove, onOpen, act }) {
  const own = canOpenLocker(player, grade)
  const [msg, setMsg] = useState('')
  const [got, setGot] = useState(false)
  if (own) return <Locker player={player} grade={grade} onMove={onMove} onOpen={onOpen} />
  return (
    <div className="mt-1" data-locker-locked={grade}>
      <p className="whitespace-pre-line text-sm leading-[1.9] break-keep text-paper/90">{LOCKED_TEXT}</p>
      <button
        type="button"
        className="flat-btn mt-3 text-xs"
        data-locker-sneak
        onClick={() => {
          // v-B.18 열쇠는 1회용: 열면 열쇠가 사라지고 [누군가의 가방]이 소지품으로 들어온다
          if (!hasLostKey(player)) { setGot(false); setMsg('쓸만한 도구가 없다. 이 자물쇠를 열 만한 무언가가 있다면…'); return }
          const r = act?.('lockerSneak', { grade })
          if (!r || r.error) { setGot(false); setMsg(r?.error ?? '열 수 없다.'); return }
          setGot(true)
          setMsg(`${itemOf(LOST_KEY)?.name}로 ${grade}학년 물품보관소를 몰래 열었다. 안에 있던 [누군가의 가방]을 챙겼다. 열쇠는 자물쇠에 꽂힌 채 부러져 버렸다.`)
        }}
      >
        <KeyRound size={13} aria-hidden /> 몰래 열어보기
      </button>
      {msg && <p className={`mt-2 text-xs ${got ? 'text-gold' : 'text-paper/60'}`} role="status" data-locker-msg>{msg}</p>}
    </div>
  )
}

/** 도깨비 농장 · 볍씨 주머니 열기 */
export function RicePouch({ player, act }) {
  const [msg, setMsg] = useState('')
  const n = countOf(player, RICE_POUCH)
  return (
    <div className="mt-2" data-rice-pouch>
      <p className="text-xs text-paper/65">지닌 볍씨 주머니 {n}개 · 주머니 수만큼 굴린 주사위(주머니 3개면 3d3)만큼 볍씨가 나온다.</p>
      <button
        type="button"
        className="flat-btn mt-2 text-xs"
        disabled={n <= 0}
        data-rice-open
        onClick={() => {
          const r = act('ricePouch', {})
          setMsg(r?.error ?? ricePouchText(r.pouches, r.grains))
        }}
      >
        볍씨 주머니 열기
      </button>
      {msg && <p className="mt-2 text-sm text-gold" role="status" data-rice-msg>{msg}</p>}
    </div>
  )
}

/** 도깨비들과 놀아주기 · 오늘 증표를 받았는지 */
export function GoblinToday({ player }) {
  const got = goblinTokenToday(player)
  return (
    <p className="mt-2 text-xs text-paper/60" data-goblin-today={got ? 'done' : 'open'}>
      {got ? '오늘의 도깨비 증표는 이미 받았다. (놀이는 계속할 수 있다)' : '오늘 아직 도깨비 증표를 받지 않았다.'} · 지닌 도깨비 증표 {countOf(player, GOBLIN_TOKEN)}개
    </p>
  )
}

/** 양호실로 가서 쉰다 */
export function GotoInfirmary({ act }) {
  return (
    <button type="button" className="flat-btn mt-3 text-xs" onClick={() => act('goto', { location: 'infirmary' })} data-goto-infirmary>
      <BedDouble size={13} aria-hidden /> 침대에 누워 쉰다 (양호실로)
    </button>
  )
}
