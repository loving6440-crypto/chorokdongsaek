import { useCallback, useEffect, useRef, useState } from 'react'
import { Eye, Flame, Shield, Sparkles, Swords } from 'lucide-react'
import { ACTIONS, INTENTS, TUTOR_ENEMY, enemyTurn, newBattle, playerTurn, scanTurns } from '../../game/battle'
import { Bar } from './battleUi'

const ICONS = { attack: Swords, guard: Shield, charm: Sparkles, scan: Eye, buff: Flame }
const ORDER = ['attack', 'guard', 'charm', 'scan', 'buff']
const FILL = ['jab', 'jab', 'jab', 'jab', 'jab']
const q = (list) => [...list, ...FILL].slice(0, 5)

/** 바리의 초상. */
const PORTRAITS = { normal: '/bari.png', surprise: '/bari-surprise.png', smile: '/bari-smile.png' }

function BariPortrait({ mood = 'normal', className = '' }) {
  return <img src={PORTRAITS[mood] ?? PORTRAITS.normal} alt="바리" className={`rounded-2xl bg-edge/10 object-cover object-top ${className}`} draggable={false} />
}

const BARI = '바리'

/**
 * 튜토리얼 대본. say = 바리의 말(한 줄씩 '다음'), do = 직접 해 보는 턴.
 * do.prep 은 그 턴의 상대 행동을 미리 정해 둔다. (연습이라 상대 행동이 정해져 있다.)
 */
const NODES = [
  {
    say: [
      '안녕하세요! 제 이름은 바리라고 해요. 창록고등학교와는 협력 관계를 맺고 있는 뭐랄까, 프리랜서 퇴마사⋯? 같은 거예요.',
      '지금부터 제가 악귀나 각종 요괴들과 전투하는 법을 알려드릴게요!',
      '어렵겠지만 하나씩 천천히 해 볼게요. 중간에 막히면 언제든 나가셔도 괜찮아요. 아, 다친 건 바로 치료해드릴 거예요!',
    ],
  },
  {
    say: [
      '먼저, 전투에 들어서면 상대의 능력치는 보이지 않아요. 체력 막대의 모양만 보이고, 숫자는 ???로 가려져 있죠?',
      '상대의 능력치는 넷이에요. 행동력(누가 먼저 움직이는가), 공격력, 영력(상대의 기운이자, 쓰러뜨리면 제가 얻는 영력), 체력이요.',
      '두 번째로 싸울 때부터는 체력 숫자가 보여요. 그리고 내 \'안목\'이 상대의 영력보다 높으면, 처음부터 체력이 보이고 두 번째부턴 전부 보인답니다.',
      '전투 중에는 체력이 보이니까 걱정 마세요! 비록 다른 건 안목을 높이지 않는 이상 보이지 않지만요.',
      '안목이 높은 다른 친구에게 물어보는 건 어떨까요?',
    ],
    fx: 'stats',
  },
  {
    say: [
      '턴은 이렇게 돌아와요. 먼저 선공 판정을 해요. 1d10과 1d(신속)을 굴려서 상대의 행동력 이상이면 내가 먼저예요.',
      '신속이 상대의 행동력 이상이면 굴리지 않고 무조건 선공이고요. 선공이 정해지면 그다음부턴 내 턴 → 상대의 턴 → 내 턴… 번갈아 와요.',
      '내 턴에는 위쪽의 칩이 “내 턴”으로 바뀌어요. 그때만 행동을 고를 수 있어요.',
    ],
  },
  {
    say: [
      '상대의 턴에는 상대가 10면체를 굴려서 행동을 정해요. 1~2는 기 모으기, 3~7은 약공, 8~9는 방어 태세, 10은 상대마다 다른 영능력이에요.',
      '기 모으기를 하면 다음 턴엔 반드시 강공이 와요. 강공은 위험하니까 조심하세요… 약공은 일반 공격, 방어 태세에는 내 공격이 절반이 돼요.',
      '내 턴에 할 수 있는 건 다섯 가지예요. 일반 공격, 막기, 부적, 간파, 효험. 하나씩 직접 해 볼 거예요.',
    ],
  },
  {
    do: true,
    allow: ['attack'],
    prompt: '먼저 “일반 공격”을 눌러 보세요. (오른쪽 숫자 키 1)',
    prep: (s) => ({ ...s, queue: q(['jab']) }),
  },
  {
    say: [
      '상대가 하는 행동, 내가 하는 행동, 주사위의 굴림값, 전부 아래의 기록에서 확인할 수 있어요. 스크롤을 내려 보세요!',
      '일반 공격은 안목으로 명중을 굴려요. d(안목+1)에서 1이 나오면 빗나가요. 맞으면 d(호전)×2에 방금 굴린 명중 값을 더한 만큼 피해가 들어가요.',
      '안목이 높을수록 덜 빗나가고 명중 값도 커져요. 호전이 높을수록 한 방이 세지고요. 기록 줄에서 굴림을 확인해 보세요!',
      '상대는 방금 약공으로 반격했어요. 약공은 d(상대의 영력)을 굴려서 1이면 빗나가고, 아니면 d(공격력)+그 값만큼 아파요.',
    ],
  },
  {
    do: true,
    allow: ['guard'],
    prompt: '이번엔 “막기”를 눌러 보세요. (숫자 키 2) 상대는 약공을 할 거예요.',
    prep: (s) => ({ ...s, queue: q(['jab']) }),
  },
  {
    say: [
      '막기를 하면 약공은 절반, 강공은 1/3만 받아요. 거기에 d(호전)만큼 더 막아 줘요.',
      '내 호전이 상대의 공격력보다 높으면 반격이 반드시 들어가요. 낮더라도 호전 굴림이 최대값이면 반격이 나가요!',
      '대신 막기를 하는 턴엔 공격을 못 해요. 언제 막을지 고르는 게 중요해요.',
    ],
  },
  {
    do: true,
    allow: ['attack'],
    prompt: '다시 “일반 공격”으로 상대를 쳐 보세요. 상대는 기를 모을 거예요.',
    prep: (s) => ({ ...s, queue: q(['charge', 'smash']) }),
  },
  {
    say: ['앗, 상대가 기를 모았어요! 다음 턴엔 강공이 와요. 강공은 d10이 1~2면 빗나가고, 아니면 공격력×2에 영력까지 더한 큰 피해예요.', '이럴 땐 막기가 정답이에요. 강공은 막으면 1/3로 줄어요!'],
  },
  {
    do: true,
    allow: ['guard'],
    prompt: '상대의 강공이 와요. “막기”로 받아내 보세요!',
  },
  {
    say: [
      '잘하셨어요! 이제 의지력을 쓰는 기술을 하나씩 해 볼게요. 의지력은 체력처럼 저절로 차지 않아요. 아껴 쓰세요.',
      '아, 전투 중 의지력이 부족할 때는 걱정 마세요. 의지력은 0 미만으로 떨어지지 않아요.',
      '의지력이 현재 내야 할 대가보다 모자라더라도 0까지 떨어지고 그 능력을 사용할 수 있어요.',
      '하지만, 0인 상태에서는 더 이상 그 어떤 것도 사용할 수 없으니 주의해요.',
      '첫 번째는 “간파”예요. 의지력 1로 상대의 다음 행동을 두 턴 앞서 볼 수 있어요. 안목이 상대의 영력보다 높으면 세 턴이에요.',
    ],
  },
  {
    do: true,
    allow: ['scan'],
    prompt: '“간파”를 눌러 보세요. (숫자 키 4) 간파도 한 턴을 써요.',
    prep: (s) => ({ ...s, queue: q(['jab', 'guard', 'jab', 'special']) }),
  },
  {
    // 의지력이 깎였으니 아이템 이야기를 꺼낸다. 사과맛 피크닉을 쥐어 주는 것과 '먹어 보세요'는 한 대사다.
    do: true,
    allow: [],
    wait: 'item',
    prompt: '아이템 항목을 볼래요? 의지력을 올려주는 아이템을 제가 하나 쏙 넣어드렸어요. 한 번 먹어보세요!',
    enter: { give: 'picnic', baseItems: true, spotItems: true },
  },
  {
    say: [
      '의지력이 회복되었죠?',
      '아이템을 먹는 건 순서와 상황에 구애받지 않아요. 갯수 제한도 없는 게 보통이지만, 가끔 제한이 있는 경우도 있어요.',
      '아이템을 쓰거나 얻을 때는 꼭 안의 내용을 잘 살펴보아요!',
    ],
  },
  {
    say: [
      '보이시죠? 상대의 다음 행동이 위쪽에 나열됐어요. 다음은 “방어 태세”네요.',
      '방어 태세 중엔 일반 공격이 절반으로 줄어요. 이럴 때 쓰는 게 “부적”이에요. 부적은 빗나가지 않고, 일반 공격의 정확히 2배 피해를 주고, 방어 태세도 무시해요!',
      '한 전투에 세 장까지고, 의지력은 1d(50−절제)만큼 들어요. 절제가 높을수록 싸게 쓸 수 있어요.',
    ],
  },
  {
    do: true,
    allow: ['charm'],
    prompt: '“부적”을 눌러 보세요. (숫자 키 3) 상대는 방어 태세예요.',
  },
  {
    say: [
      '마지막은 “효험”이에요. 의지력 10을 쓰고, 이번 공격을 두 번 굴려서 더 좋은 쪽을 골라요. 둘 다 나쁘면… 어쩔 수 없지만요.',
      '명중이 불안할 때나, 확실히 큰 피해가 필요할 때 좋아요.',
    ],
  },
  {
    do: true,
    allow: ['buff'],
    prompt: '“효험”을 눌러 보세요. (숫자 키 5)',
  },
  {
    say: [
      '상대는 10분의 1 확률로 영능력을 써요. 예를 들어 저, 바리는 이런 주술을 써요.',
      '제 영능력은 “도깨비불”이에요. 3턴 동안 아무 행동도 하지 않고 기를 모으는 대신, 4배의 공격을 때려요.',
      '이건 강공격이 아니라서 방어해도 절반밖에 방어가 안 된답니다. 무시무시하죠? 이처럼 \'영능력\'이라는 건 상대의 궁극기나 필살기 같은 느낌으로 이해하면 돼요.',
      '여러분도 성장할 수록 이런 영능력을 배울 수 있게 될 거예요!',
    ],
    fx: 'fire',
  },
  {
    say: ['이제 상대도 영능력을 쓸 차례예요. 일단 아무 공격이나 해 볼래요?'],
  },
  {
    do: true,
    allow: ['attack', 'guard'],
    prompt: '“일반 공격”이나 “막기”를 눌러요. 그 뒤 상대가 영능력을 써요.',
    prep: (s) => ({ ...s, queue: q(['special']) }),
  },
  {
    say: [
      '봤죠? 영능력은 이런 식으로 상대가 처음 쓸 때 설명이 함께 나와요. 직접 보기 전까진 이름도, 효과도 알 수 없어요.',
      '그러니까 처음 만나는 상대와의 싸움은 긴장해야 해요… 간파로 봐도 영능력은 ???로만 보인답니다.',
    ],
  },
  {
    say: [
      '그리고 몇 가지 더요. 체력이 0이 되면 “버티기”를 쓸 수 있어요. 의지력을 1만 남기고 전부 써서 체력 1로 일어서는 거예요. 포기하면 의지력은 지킬 수 있어요.',
      '체력과 의지력은 전투가 끝나도 그대로고, 저절로 차지 않아요. 본관 2층의 양호실에 찾아가서 쉬면 1분에 1씩 채워져요.',
      '호전이 절제보다 많이 높으면 가끔 몸이 멋대로 공격해 버려요.',
      '쓰러뜨리면 상대의 영력만큼 제 영력이 늘어요. 보상이 나오는 승리는 하루에 한 번 뿐이니까, 누구를 처리해야 할지 신중하게 정해야 해요!',
      '연습 자체는 하루에 몇 번이건 할 수 있어요.',
    ],
  },
  {
    say: ['자, 마지막으로 상대를 쓰러뜨려 봐요!'],
  },
  {
    do: true,
    allow: ORDER,
    until: 'win',
    prompt: '마무리예요. 마음대로 행동해서 쓰러뜨려 보세요!',
    prep: (s) => ({ ...s, ehp: Math.min(s.ehp, 14), queue: q(['jab']) }),
  },
  {
    say: [
      '수고하셨어요! 이걸로 전투 교육은 끝이에요. 체력이랑 의지력은 제가 전부 채워 드릴게요.',
      '혼자서도 잘하실 거예요. 그래도 위험하다 싶으면… 무리하지 마세요. 다음에 또 만나요!',
    ],
    last: true,
  },
]

// 표정: 대사 첫머리로 장면을 찾아, 줄 번호별로 지정한다. (지정 없으면 기본 표정)
const MOODS = [
  ['안녕하세요', ['smile', 'smile']],
  ['앗, 상대가 기를 모았어요', ['surprise', 'surprise']],
  ['잘하셨어요', ['smile']],
  ['상대는 10분의 1', [null, null, 'surprise', 'smile']],
  ['수고하셨어요', ['smile', 'smile']],
  ['아이템 항목을 볼래요', ['smile']],
  ['의지력이 회복되었죠', ['smile']],
]
const DO_MOODS = { '상대의 강공이 와요': 'surprise', '아이템 항목을 볼래요': 'smile' }
const moodOf = (node, line) => {
  if (node.do) return Object.entries(DO_MOODS).find(([k]) => node.prompt.includes(k))?.[1] ?? 'normal'
  const hit = MOODS.find(([k]) => node.say[0].startsWith(k))
  return hit?.[1][line] ?? 'normal'
}

// 화면 강조: 대사 첫머리로 장면을 찾아, 줄 번호별로 어디를 강조할지 정한다.
const SPOTS = [
  ['먼저, 전투에 들어서면', ['stats', 'stats', 'stats']],
  ['턴은 이렇게', ['chip', 'chip', 'chip']],
  ['상대의 턴에는', ['next', 'next', 'actions']],
  ['상대가 하는 행동', ['log', 'log', 'log', 'log']],
  ['앗, 상대가 기를', ['next', 'next']],
  ['보이시죠', ['next', 'actions', 'actions']],
]
const spotOf = (node, line) => (node.do ? null : (SPOTS.find(([k]) => node.say[0].startsWith(k))?.[1][line] ?? null))

// 대사 속 중요한 말(능력치·행동·용어)은 굵고 밝게, 행동 이름은 밑줄까지 넣어 눈에 띄게 한다.
const ACTION_WORDS = '일반 공격|막기|부적|간파|효험|버티기|도깨비불'
const TERM_WORDS = '안목|호전|인내|절제|신속|이해|행동력|공격력|영력|체력|의지력|기 모으기|강공|약공|방어 태세|영능력|선공 판정|내 턴|상대의 턴|소지품|아이템|양호실|반격'
const RICH = new RegExp(`(${ACTION_WORDS}|${TERM_WORDS})`, 'g')
const ACTION_SET = new Set(ACTION_WORDS.split('|'))
function Rich({ text }) {
  return text.split(RICH).map((t, i) =>
    i % 2 === 0 ? (
      t
    ) : (
      <b key={i} className={`font-bold text-gold ${ACTION_SET.has(t) ? 'underline decoration-gold/70 decoration-2 underline-offset-4' : ''}`}>
        {t}
      </b>
    ),
  )
}

const DELAY = 800

export default function Tutorial({ stats, hp, hpMax, mp, onMp, onHp, itemsUsed = 0, onSpotItems, onGiveItem, onExit, onDone }) {
  const [idx, setIdx] = useState(0)
  const [line, setLine] = useState(0)
  const [b, setB] = useState(() => ({ ...newBattle(TUTOR_ENEMY, stats, Math.random, hp, hpMax), queue: q(['jab']) }))
  const [log, setLog] = useState([])
  const [busy, setBusy] = useState(false)
  const timer = useRef(null)
  const bRef = useRef(b)
  bRef.current = b
  const mpRef = useRef(mp)
  mpRef.current = mp // 의지력은 게임의 실제 값을 따른다. (아이템으로도 바뀐다)
  const itemsRef = useRef(itemsUsed)
  const baseItems = useRef(itemsUsed)
  const spotRef = useRef(onSpotItems)
  spotRef.current = onSpotItems
  useEffect(() => () => spotRef.current?.(false), [])
  useEffect(() => () => clearTimeout(timer.current), [])

  const node = NODES[idx]
  const isDo = !!node.do
  const push = (events) => setLog((l) => [...events.map((e) => ({ ...e, id: Math.random() })), ...l].slice(0, 30))

  const enter = useCallback(
    (i) => {
      const n = NODES[i]
      setIdx(i)
      setLine(0)
      if (n?.prep) setB((cur) => n.prep(cur))
      if (n?.enter?.give) onGiveItem?.(n.enter.give)
      if (n?.enter?.baseItems) baseItems.current = itemsRef.current
      onSpotItems?.(!!n?.enter?.spotItems)
    },
    [onGiveItem, onSpotItems],
  )

  // 소지품에서 아이템을 쓰면 다음 단계로
  itemsRef.current = itemsUsed
  useEffect(() => {
    if (NODES[idx].wait === 'item' && itemsUsed > baseItems.current) enter(idx + 1)
  }, [itemsUsed, idx, enter])

  const next = useCallback(() => {
    if (busy) return
    const n = NODES[idx]
    if (!n.say) return
    if (line + 1 < n.say.length) setLine(line + 1)
    else if (n.last) onDone()
    else enter(idx + 1)
  }, [busy, idx, line, enter, onDone])

  const act = useCallback(
    (action) => {
      const n = NODES[idx]
      const cur = bRef.current
      if (!n.do || busy || !n.allow.includes(action)) return
      setBusy(true)
      // 연습을 끝까지 볼 수 있도록, 기술을 쓸 의지력이 모자라면 바리가 조금 채워 준다.
      let mpNow = mpRef.current
      if ((action === 'charm' || action === 'scan' || action === 'buff') && mpNow < 1) {
        onMp?.(10)
        mpNow = 10
        push([{ kind: 'warn', text: '(의지력이 0이라 바리가 연습용으로 조금 채워 주었다.)' }])
      }
      const ctx = { stats, mp: mpNow, noRash: true }
      const r = playerTurn(cur, action, ctx)
      onMp?.(-r.mpCost)
      mpNow -= r.mpCost
      mpRef.current = mpNow
      setB(r.state)
      push(r.events)
      const won = r.state.over === 'win'
      timer.current = setTimeout(() => {
        let s = r.state
        if (!won) {
          const e = enemyTurn(s, { stats, mp: mpNow })
          s = e.state
          const drain = Math.min(mpNow, e.mpDrain)
          onMp?.(-drain)
          mpNow = Math.max(0, mpNow - drain)
          mpRef.current = mpNow
          // 연습이라 쓰러지지 않는다.
          if (s.php <= 0) s = { ...s, php: 1 }
          s = { ...s, pendingDeath: false, over: null }
          push(
            e.events
              .filter((ev) => ev.kind !== 'end')
              .map((ev) => (ev.kind === 'special' ? { ...ev, kind: 'warn', text: `✦ 영능력 《${ev.label}》 — ${ev.note} (처음 본 비기는 이렇게 설명이 붙는다.)` } : ev)),
          )
        }
        setB(s)
        onHp?.(s.php)
        setBusy(false)
        if (n.until === 'win' && !won) return
        enter(idx + 1)
      }, won ? 400 : DELAY)
    },
    [idx, busy, stats, enter, onMp, onHp],
  )

  useEffect(() => {
    const onKey = (e) => {
      if (e.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(e.target.tagName) && e.key === ' ') return
      if (e.key === 'Enter' || e.key === ' ') {
        if (!NODES[idx].do) next()
        e.preventDefault?.()
        return
      }
      const i = ['1', '2', '3', '4', '5'].indexOf(e.key)
      if (i >= 0) act(ORDER[i])
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [idx, next, act])

  const shown = Math.min(b.known, 3)
  const have = Math.floor(mp)
  const text = isDo ? node.prompt : node.say[line]
  const spot = spotOf(node, line)

  return (
    <section aria-label="전투 교육 과정" className="relative flex flex-col">
      <div className="flex items-center justify-between gap-2 order-first">
        <h2 className="font-serif text-xl text-gold">전투 교육 과정</h2>
        <button type="button" onClick={onExit} className="rounded-full bg-edge/10 px-3 py-1 text-xs text-paper/80 hover:bg-edge/20">
          나가기
        </button>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="ink-panel rounded-xl p-4">
          <div className="flex items-baseline justify-between">
            <p className="font-serif text-lg text-paper">{b.enemy.name}</p>
            <p className="text-xs text-paper/70">체력 ???</p>
          </div>
          <div className="mt-2">
            <Bar value={b.ehp} max={b.enemy.hp} tone="bg-crimson" label="상대 체력" hidden />
          </div>
          <p className={`mt-2 grid grid-cols-3 gap-x-2 rounded-lg p-1 text-[11px] text-paper/70 ${spot === 'stats' ? 'spot-wide bg-ink-muted' : ''}`}>
            <span>공격력 ???</span>
            <span>행동력 ???</span>
            <span>영력 ???</span>
          </p>
          <div className={`mt-3 rounded-lg bg-edge/[0.07] px-3 py-2 text-sm text-paper/85 ${spot === 'next' ? 'spot-wide' : ''}`} aria-label="상대의 다음 행동">
            <p className="text-[11px] text-paper/55">상대의 다음 행동</p>
            {shown > 0 ? (
              <ol className="mt-1 flex flex-wrap gap-1.5">
                {b.queue.slice(0, shown).map((k, i) => (
                  <li key={i} className={`rounded-full px-2.5 py-0.5 text-xs ${k === 'smash' ? 'bg-crimson/25 text-crimson' : 'bg-edge/10'}`}>
                    {i + 1}. {INTENTS[k].label}
                    {k === 'special' && ' · ???'}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-1 text-xs text-paper/60">알 수 없다. 간파로 읽을 수 있다.</p>
            )}
          </div>
        </div>
        <div className="ink-panel rounded-xl p-4">
          <div className="flex items-baseline justify-between">
            <p className="font-serif text-lg text-paper">나</p>
            <p className="text-xs tabular-nums text-paper/70">체력 {b.php} / {b.phpMax}</p>
          </div>
          <div className="mt-2">
            <Bar value={b.php} max={b.phpMax} tone="bg-mana" label="내 체력" />
          </div>
          <p className="mt-1 text-[10px] text-paper/50">체력과 의지력은 실제로 줄어든다. 교육을 마치면 모두 회복된다.</p>
          <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
            <span className="flat-chip">의지력 {have}</span>
            <span className="flat-chip">부적 {b.charms}장</span>
            <span className={`flat-chip ${isDo && !busy ? '!bg-gold-fill !text-ink' : ''} ${spot === 'chip' ? 'spot' : ''}`}>{busy ? '상대의 턴…' : isDo ? '내 턴' : '설명 중'}</span>
          </div>
        </div>
      </div>

      {/* 미연시풍 대화창 */}
      <div className="ink-panel order-first mt-3 flex items-end gap-3 rounded-2xl p-3 sm:p-4 md:order-none" aria-live="polite" aria-label="바리의 말">
        <BariPortrait mood={moodOf(node, line)} className="size-28 shrink-0 sm:size-36" />
        <div className="min-w-0 flex-1">
          <p className="inline-block rounded-full bg-gold-fill px-3 py-0.5 text-xs font-medium text-ink light:text-ink">{BARI}</p>
          {node.fx === 'fire' && (
            <p className="mt-2 rounded-lg bg-crimson/20 px-3 py-1.5 text-xs text-crimson">
              🔥 도깨비불 — 기 모으기 ×3턴(행동 없음) → 일반 공격 ×4 (막아도 1/2 피해)
            </p>
          )}
          <p className="mt-2 min-h-[4.5rem] text-sm leading-[1.85] break-keep text-paper/95">
            <Rich text={text} />
          </p>
          <div className="mt-1 flex items-center justify-between gap-2">
            <span className="text-[10px] text-paper/45">
              {isDo ? '' : `${line + 1} / ${node.say.length}`}
            </span>
            {!isDo && (
              <button type="button" onClick={next} className="flat-btn !py-1 text-sm">
                {node.last && line + 1 === node.say.length ? '교육 마치기' : '다음 ▶'}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-5" role="group" aria-label="행동 선택">
        {ORDER.map((id, i) => {
          const Icon = ICONS[id]
          const allowed = isDo && !busy && node.allow.includes(id)
          return (
            <button
              key={id}
              type="button"
              disabled={!allowed}
              onClick={() => act(id)}
              className={`tilt flex flex-col items-start gap-1 rounded-xl bg-edge/[0.07] p-3 text-left enabled:hover:bg-gold-fill/20 disabled:opacity-35 ${allowed ? 'spot !bg-gold-fill/25 !opacity-100' : ''} ${spot === 'actions' ? 'spot' : ''}`}
            >
              <span className="flex items-center gap-1.5 text-sm font-medium text-paper">
                <Icon size={15} aria-hidden className="text-gold" />
                {ACTIONS[id].label}
                <span className="text-[10px] text-paper/40">{i + 1}</span>
              </span>
              <span className="text-[10.5px] leading-snug text-paper/60">
                {id === 'scan' ? `의지력 1. 다음 ${scanTurns(stats, b.enemy)}턴의 행동을 본다.` : ACTIONS[id].note}
              </span>
            </button>
          )
        })}
      </div>

      <ul className={`mt-3 max-h-40 space-y-1 overflow-auto rounded-xl bg-shade/30 p-3 font-mono text-[11px] leading-relaxed ${spot === 'log' ? 'spot-wide' : ''}`} aria-label="전투 기록">
        {log.map((l) => (
          <li key={l.id} className={l.kind === 'enemy' ? 'text-crimson' : l.kind === 'warn' ? 'text-gold' : 'text-paper/80'}>
            {l.text}
          </li>
        ))}
      </ul>
    </section>
  )
}
