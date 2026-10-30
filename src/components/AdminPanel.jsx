import { useEffect, useState } from 'react'
import { Shield, X } from 'lucide-react'
import { STAT_KEYS, STAT_META } from '../game/constants'
import { PSYCHICS } from '../game/battle'
import { SKINS } from '../game/skins2048'
import { SKINS_RUNNER } from '../game/skinsRunner'
import { adminSetBgmPlaylist, adminSetChatTitle, clearEditResult, fetchAllMail, fetchMembers, fetchPendingStories, publishStory, rejectStory, requestEdit } from '../net/online'
import { adminDeleteAccount, adminResetPassword } from '../game/auth'
import { itemsText } from './MailboxPanel'

/** 지급 · 선물 대상으로 고를 수 있는 영능력: 처음부터 있는 [효험]은 뺀다. */
const GRANTABLE_PSYCHICS = PSYCHICS.filter((p) => !p.default)
/** 선물로 고를 수 있는 스킨: 업적으로 거는 기본 스킨(unlock 없음)은 뺀다 — 선물할 게 없으니까. */
const GRANTABLE_SKINS_2048 = SKINS.filter((s) => s.unlock)
const GRANTABLE_SKINS_RUNNER = SKINS_RUNNER.filter((s) => s.unlock)

const fmtAt = (t) => {
  if (!t) return '—'
  const d = new Date(t)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()} ${p(d.getHours())}:${p(d.getMinutes())}`
}
const COURSE_LABEL = { 'talisman-2048': '부적', 'spell-typing': '주문', 'ward-tetris': '결계', 'folklore-spot': '민속', 'exorcism-space': '퇴마' }

/** 회원 목록: 서버에 데이터가 남은 모든 계정 */
function MemberList({ userId, adminKey, onEditTitle }) {
  const [st, setSt] = useState({ loading: true })
  const [q, setQ] = useState('')
  const load = () => {
    setSt({ loading: true })
    fetchMembers(userId, adminKey).then((r) => setSt(r.ok ? { list: r.members, total: r.total } : { error: r.error }))
  }
  useEffect(load, [userId, adminKey]) // eslint-disable-line react-hooks/exhaustive-deps
  const list = (st.list ?? []).filter((m) => !q.trim() || `${m.id} ${m.name}`.toLowerCase().includes(q.trim().toLowerCase()))
  return (
    <section data-members>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p className="text-xs tracking-widest text-paper/55">회원 목록 {st.total != null && `(${st.total}명)`}</p>
        <button type="button" onClick={load} className="rounded border border-edge/25 px-2 py-0.5 text-[11px] text-paper/80 hover:bg-edge/10">새로고침</button>
      </div>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="아이디·이름 검색" aria-label="회원 검색" className="mb-2 w-full rounded border border-edge/25 bg-ink-muted/60 px-2 py-1 text-sm text-paper outline-none focus:border-gold/50" />
      {st.loading && <p className="text-xs text-paper/55">불러오는 중…</p>}
      {st.error && <p className="text-xs text-crimson" role="alert">{st.error === 'bad-key' ? '관리자 키가 확인되지 않았다.' : st.error === 'admin-disabled' ? '서버에 관리자 키가 설정되어 있지 않다.' : '목록을 불러오지 못했다.'}</p>}
      <ul className="space-y-1.5" aria-label="회원 목록">
        {list.map((m) => (
          <li key={m.id} data-member={m.id} className="rounded-lg bg-shade/25 px-3 py-2 text-xs text-paper/85">
            <p className="flex flex-wrap items-center gap-x-2">
              <b className="font-serif text-sm text-paper">{m.name}</b>
              <span className="text-paper/55">@{m.id}</span>
              {m.online && <span className="rounded-full bg-gold-fill/80 px-1.5 text-[10px] text-ink">접속 중</span>}
              {m.admin && <span className="rounded-full bg-crimson/80 px-1.5 text-[10px] text-[#fbf6e9]">관리자</span>}
              {m.chatTitle && <span className="rounded-full bg-gold/20 px-1.5 text-[10px] text-gold">[{m.chatTitle}]</span>}
              <button type="button" onClick={() => onEditTitle?.(m.id)} className="ml-auto rounded border border-gold/30 px-2 py-0.5 text-[10px] text-gold hover:bg-gold/10">칭호 설정</button>
            </p>
            <p className="mt-0.5 text-paper/60">
              {m.grade ? `${m.grade}학년` : '학년 ?'} · {m.age ? `${m.age}세` : '나이 ?'} · 접속 {m.visits}회
            </p>
            <p className="text-paper/50">처음 {fmtAt(m.firstSeen)} · 마지막 {fmtAt(m.lastSeen)}</p>
            {m.greeting && <p className="text-paper/60">“{m.greeting}”</p>}
            {Object.keys(m.scores).length > 0 && (
              <p className="text-paper/50">{Object.entries(m.scores).map(([c, v]) => `${COURSE_LABEL[c] ?? c} ${v}`).join(' · ')}</p>
            )}
          </li>
        ))}
      </ul>
      {!st.loading && !st.error && list.length === 0 && <p className="text-xs text-paper/55">표시할 회원이 없다.</p>}
      <p className="mt-2 text-[10px] leading-relaxed text-paper/45">계정은 각자의 브라우저에 저장되므로, 서버에 한 번이라도 접속한 계정만 보인다. 이 기능이 생기기 전에 가입했더라도 다음에 접속하면 명부에 오른다.</p>
    </section>
  )
}

/** 서버에 영구 저장되는 사용자 채팅 칭호. 접속 여부와 관계없이 아이디로 부여/해제한다. */
function ChatTitleManager({ userId, adminKey, targetId, onTargetId }) {
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)
  const handle = async (value) => {
    if (busy || !targetId.trim()) return setResult({ error: '대상 계정 아이디를 입력해 줘.' })
    setBusy(true)
    setResult(null)
    const r = await adminSetChatTitle(userId, adminKey, targetId.trim(), value)
    setBusy(false)
    if (r.ok) {
      setResult({ text: r.title ? `@${r.target} 계정에 [${r.title}] 칭호를 부여했어.` : `@${r.target} 계정의 칭호를 해제했어.` })
      if (!value) setTitle('')
    } else {
      const messages = {
        'bad-key': '관리자 키가 올바르지 않아.',
        'admin-disabled': '서버에서 관리자 기능이 비활성화되어 있어.',
        'bad-target': '대상 계정 아이디 형식이 올바르지 않아.',
        'no-account': '해당 계정이 존재하지 않아.',
        'bad-title': '칭호는 1~12글자의 한글·영문·숫자·공백·_·-··만 사용할 수 있어. 관리자·파티장 등의 예약 칭호는 사용할 수 없어.',
        'slow-down': '잠시 후 다시 시도해 줘.',
      }
      setResult({ error: messages[r.error] ?? '변경에 실패했어. 서버 연결을 확인해 줘.' })
    }
  }
  return (
    <section data-admin-chat-titles className="rounded-lg border border-gold/20 bg-shade/20 p-3">
      <p className="mb-1.5 text-xs tracking-widest text-paper/70">채팅 칭호 관리</p>
      <p className="mb-3 text-[11px] leading-relaxed text-paper/55">특정 계정의 채팅 이름 앞에 [활자]처럼 칭호를 붙인다. 오프라인 계정도 가능하며 서버에 저장되어 재접속해도 유지된다. [관리자] 표시는 별도야.</p>
      <div className="space-y-2">
        <label className="block text-xs text-paper/80" htmlFor="admin-chat-title-target">대상 계정 아이디</label>
        <input id="admin-chat-title-target" data-chat-title-target value={targetId} onChange={(e) => { onTargetId(e.target.value); setResult(null) }} placeholder="예: player123" autoComplete="off" className="w-full rounded border border-edge/25 bg-ink-muted/60 px-3 py-1.5 text-sm text-paper outline-none focus:border-gold/50" />
        <label className="block text-xs text-paper/80" htmlFor="admin-chat-title-value">부여할 칭호 (최대 12자, 대괄호 제외)</label>
        <input id="admin-chat-title-value" data-chat-title-value value={title} onChange={(e) => { setTitle(e.target.value); setResult(null) }} maxLength={24} placeholder="예: 활자" autoComplete="off" className="w-full rounded border border-edge/25 bg-ink-muted/60 px-3 py-1.5 text-sm text-paper outline-none focus:border-gold/50" />
        <div className="flex flex-wrap gap-2">
          <button type="button" data-chat-title-save disabled={busy || !targetId.trim() || !title.trim()} onClick={() => handle(title)} className="rounded border border-gold/50 px-3 py-1.5 text-xs text-gold hover:bg-gold/10 disabled:opacity-40">{busy ? '처리 중…' : '칭호 부여 / 변경'}</button>
          <button type="button" data-chat-title-remove disabled={busy || !targetId.trim()} onClick={() => handle('')} className="rounded border border-crimson/50 px-3 py-1.5 text-xs text-crimson hover:bg-crimson/10 disabled:opacity-40">칭호 삭제</button>
        </div>
        {result?.error && <p className="text-xs text-crimson" role="alert">{result.error}</p>}
        {result?.text && <p className="text-xs text-gold" role="status">{result.text}</p>}
      </div>
    </section>
  )
}

/** 모든 쪽지 · 선물 내역(관리자 전용) */
function MailAudit({ userId, adminKey }) {
  const [st, setSt] = useState({ loading: true })
  const [who, setWho] = useState('')
  const load = () => {
    setSt((s0) => ({ ...s0, loading: true }))
    fetchAllMail(userId, adminKey, who.trim()).then((r) => setSt(r.ok ? { list: r.mail, total: r.total } : { error: r.error }))
  }
  useEffect(load, [userId, adminKey]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <section data-mail-audit>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p className="text-xs tracking-widest text-paper/55">전체 쪽지 · 선물 내역 {st.total != null && `(${st.total}건)`}</p>
        <button type="button" onClick={load} className="rounded border border-edge/25 px-2 py-0.5 text-[11px] text-paper/80 hover:bg-edge/10">새로고침</button>
      </div>
      <div className="mb-2 flex gap-1.5">
        <input value={who} onChange={(e) => setWho(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load()} placeholder="아이디로 거르기(보낸·받은 사람)" aria-label="쪽지 거르기" className="min-w-0 flex-1 rounded border border-edge/25 bg-ink-muted/60 px-2 py-1 text-sm text-paper outline-none focus:border-gold/50" />
        <button type="button" onClick={load} className="rounded border border-edge/25 px-2 text-xs text-paper/80 hover:bg-edge/10">찾기</button>
      </div>
      {st.loading && <p className="text-xs text-paper/55">불러오는 중…</p>}
      {st.error && <p className="text-xs text-crimson" role="alert">쪽지를 불러오지 못했다.</p>}
      <ul className="max-h-64 space-y-1.5 overflow-auto" aria-label="전체 쪽지">
        {(st.list ?? []).map((m) => (
          <li key={m.id} data-audit-mail={m.id} className="rounded-lg bg-shade/25 px-3 py-2 text-xs text-paper/85">
            <p className="text-paper/60">{fmtAt(m.at)} · <b className="text-paper">{m.from.name}</b>(@{m.from.id}) → <b className="text-paper">{m.to.name}</b>(@{m.to.id}){m.kind === 'gift' && ' · 선물'}</p>
            {m.text && <p className="mt-0.5 whitespace-pre-wrap break-words">{m.text}</p>}
            {m.items && <p className="text-gold/80">{itemsText(m.items)}{m.enh ? ' (무구 강화 포함)' : ''}</p>}
          </li>
        ))}
      </ul>
      {!st.loading && !st.error && (st.list ?? []).length === 0 && <p className="text-xs text-paper/55">내역이 없다.</p>}
    </section>
  )
}

/** 다른 사람의 스탯 · 쇠약 등을 고친다. 상대가 접속 중이어야 하고, 상대가 동의해야만 적용된다. */
function EditOther({ userId, adminKey, online }) {
  const [to, setTo] = useState('')
  const [stats, setStats] = useState({})
  const [clearWeak, setClearWeak] = useState(false)
  const [clearBuffs, setClearBuffs] = useState(false)
  const [refill, setRefill] = useState(false)
  const [addPsychic, setAddPsychic] = useState('')
  const [addSkin2048, setAddSkin2048] = useState('')
  const [addSkinRunner, setAddSkinRunner] = useState('')
  const [msg, setMsg] = useState({ ok: true, text: '' })
  const [busy, setBusy] = useState(false)
  const res = online.editResult
  useEffect(() => {
    if (!res) return
    const label = { accepted: '동의해서 적용되었다.', declined: '거절했다. 아무것도 바뀌지 않았다.', expired: '60초 안에 답이 없어 취소되었다.' }[res.status]
    setMsg({ ok: res.status === 'accepted', text: `${res.targetName}님이 ${label}` })
    setBusy(false)
    clearEditResult()
  }, [res])
  const others = online.online.filter((p) => p.id !== online.me?.id)
  const send = async () => {
    if (!to || busy) return
    const changes = {
      ...(Object.keys(stats).some((k) => String(stats[k]).trim() !== '') ? { stats: Object.fromEntries(Object.entries(stats).filter(([, v]) => String(v).trim() !== '')) } : {}),
      ...(clearWeak ? { clearWeak: true } : {}),
      ...(clearBuffs ? { clearBuffs: true } : {}),
      ...(refill ? { refill: true } : {}),
      ...(addPsychic ? { addPsychic } : {}),
      ...(addSkin2048 ? { addSkin2048 } : {}),
      ...(addSkinRunner ? { addSkinRunner } : {}),
    }
    if (!Object.keys(changes).length) return setMsg({ ok: false, text: '바꿀 항목을 골라 줘.' })
    setBusy(true)
    const r = await requestEdit(userId, adminKey, to, changes)
    if (r.ok) { setMsg({ ok: true, text: '동의를 기다리는 중… (60초)' }); setAddPsychic(''); setAddSkin2048(''); setAddSkinRunner('') }
    else {
      setBusy(false)
      setMsg({ ok: false, text: r.error === 'target-offline' ? '상대가 접속 중이 아니다.' : r.error === 'no-changes' ? '바꿀 항목이 없다.' : '요청을 보내지 못했다.' })
    }
  }
  return (
    <section data-edit-other>
      <p className="mb-1.5 text-xs tracking-widest text-paper/55">다른 사람 상태 고치기 (당사자 동의 필요)</p>
      <select value={to} onChange={(e) => setTo(e.target.value)} aria-label="대상 선택" className="w-full rounded border border-edge/25 bg-ink-muted/60 px-2 py-1.5 text-sm text-paper">
        <option value="">대상 선택 (접속 중인 사람)</option>
        {others.map((p) => <option key={p.id} value={p.id}>{p.name} (@{p.id})</option>)}
      </select>
      <p className="mt-2 text-[11px] text-paper/50">스탯은 비워 두면 그대로다 (1~999).</p>
      <div className="mt-1 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        {STAT_KEYS.map((k) => (
          <label key={k} className="flex items-center justify-between gap-1 rounded-lg bg-shade/25 px-2 py-1 text-xs text-paper/85">
            {STAT_META[k].label}
            <input data-edit-stat={k} type="number" min={1} max={999} value={stats[k] ?? ''} onChange={(e) => setStats((p) => ({ ...p, [k]: e.target.value }))} className="w-14 rounded border border-edge/25 bg-ink-muted/60 px-1 py-0.5 text-right tabular-nums text-paper outline-none" />
          </label>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-paper/85">
        <label className="flex items-center gap-1.5"><input data-edit-weak type="checkbox" checked={clearWeak} onChange={(e) => setClearWeak(e.target.checked)} />[쇠약] 해제</label>
        <label className="flex items-center gap-1.5"><input type="checkbox" checked={clearBuffs} onChange={(e) => setClearBuffs(e.target.checked)} />버프 초기화</label>
        <label className="flex items-center gap-1.5"><input type="checkbox" checked={refill} onChange={(e) => setRefill(e.target.checked)} />체력·의지력 채우기</label>
      </div>
      <label className="mt-2 flex items-center gap-2 text-sm text-paper/85">
        영능력 선물
        <select data-edit-psychic value={addPsychic} onChange={(e) => setAddPsychic(e.target.value)} aria-label="선물할 영능력" className="min-w-0 flex-1 rounded border border-edge/25 bg-ink-muted/60 px-2 py-1 text-sm text-paper">
          <option value="">(선택 안 함)</option>
          {GRANTABLE_PSYCHICS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
      </label>
      <label className="mt-2 flex items-center gap-2 text-sm text-paper/85">
        부적학(2048) 스킨 선물
        <select data-edit-skin2048 value={addSkin2048} onChange={(e) => setAddSkin2048(e.target.value)} aria-label="선물할 2048 스킨" className="min-w-0 flex-1 rounded border border-edge/25 bg-ink-muted/60 px-2 py-1 text-sm text-paper">
          <option value="">(선택 안 함)</option>
          {GRANTABLE_SKINS_2048.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </label>
      <label className="mt-2 flex items-center gap-2 text-sm text-paper/85">
        퇴마 실습 스킨 선물
        <select data-edit-skin-runner value={addSkinRunner} onChange={(e) => setAddSkinRunner(e.target.value)} aria-label="선물할 퇴마 실습 스킨" className="min-w-0 flex-1 rounded border border-edge/25 bg-ink-muted/60 px-2 py-1 text-sm text-paper">
          <option value="">(선택 안 함)</option>
          {GRANTABLE_SKINS_RUNNER.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </label>
      <div className="mt-2 flex items-center gap-2">
        <button type="button" data-edit-send disabled={!to || busy} onClick={send} className="flat-btn disabled:cursor-not-allowed disabled:opacity-40">수정 요청 보내기</button>
        <span className={`text-xs ${msg.ok ? 'text-gold/80' : 'text-crimson'}`} aria-live="polite" data-edit-msg>{msg.text}</span>
      </div>
    </section>
  )
}

/** 계정 문제(비밀번호를 잊음 등)를 겪는 사람에게 임시 비밀번호를 발급한다. */
function PasswordReset({ userId, adminKey }) {
  const [target, setTarget] = useState('')
  const [busy, setBusy] = useState(false)
  const [res, setRes] = useState(null)
  const issue = async () => {
    const id = target.trim()
    if (!id || busy) return
    setBusy(true)
    setRes(null)
    const r = await adminResetPassword(userId, adminKey, id)
    setBusy(false)
    setRes(r.ok ? { ok: true, target: r.target, temp: r.tempPassword } : { ok: false, text: r.error === 'no-account' ? '그런 아이디의 계정이 없다.' : r.error === 'bad-target' ? '아이디 형식이 올바르지 않다.' : '발급하지 못했다.' })
  }
  return (
    <section data-pw-reset>
      <p className="mb-1.5 text-xs tracking-widest text-paper/55">비밀번호를 잊은 계정에 임시 비밀번호 발급</p>
      <p className="mb-2 text-[11px] text-paper/50">원래 비밀번호는 서버도 알 수 없다. 대신 임시 비밀번호를 새로 만들어 준다. 본인이 그걸로 로그인하면 곧바로 새 비밀번호를 정해야 한다. <b className="text-paper/70">게임 속 이름이 아니라 로그인할 때 쓰는 아이디</b>를 넣어야 한다 — 아래 회원 목록에서 @ 뒤에 붙은 게 아이디다.</p>
      <div className="flex gap-1.5">
        <input value={target} onChange={(e) => setTarget(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && issue()} placeholder="대상 아이디" aria-label="대상 아이디" className="min-w-0 flex-1 rounded border border-edge/25 bg-ink-muted/60 px-2 py-1 text-sm text-paper outline-none focus:border-gold/50" />
        <button type="button" data-pw-reset-go disabled={!target.trim() || busy} onClick={issue} className="rounded border border-edge/25 px-3 text-xs text-paper/80 hover:bg-edge/10 disabled:opacity-40">발급</button>
      </div>
      {res?.ok && (
        <p className="mt-2 rounded-lg bg-shade/25 px-3 py-2 text-sm text-paper" data-pw-reset-result>
          <b className="text-paper">{res.target}</b>의 임시 비밀번호: <span className="font-mono text-gold" data-temp-password>{res.temp}</span>
          <br /><span className="text-[11px] text-paper/55">이 비밀번호를 본인에게 전해 주면, 로그인한 뒤 새 비밀번호를 정하게 된다. (지금 한 번만 보인다)</span>
        </p>
      )}
      {res && !res.ok && <p className="mt-2 text-xs text-crimson" role="alert">{res.text}</p>}
    </section>
  )
}

/** 특정 계정을 서버에서 아예 삭제한다(탈퇴). 되돌릴 수 없어서, 누르면 한 번 더 "정말 탈퇴시키겠습니까?"를 물어본다. */
function AccountDelete({ userId, adminKey }) {
  const [target, setTarget] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [res, setRes] = useState(null)
  const askConfirm = () => {
    const id = target.trim()
    if (!id || busy) return
    setRes(null)
    setConfirming(true)
  }
  const cancel = () => setConfirming(false)
  const go = async () => {
    const id = target.trim()
    if (!id || busy) return
    setBusy(true)
    const r = await adminDeleteAccount(userId, adminKey, id)
    setBusy(false)
    setConfirming(false)
    setRes(
      r.ok
        ? { ok: true, target: r.target }
        : { ok: false, text: r.error === 'no-account' ? '그런 아이디의 계정이 없다.' : r.error === 'bad-target' ? '아이디 형식이 올바르지 않다.' : '삭제하지 못했다.' },
    )
    if (r.ok) setTarget('')
  }
  return (
    <section data-account-delete>
      <p className="mb-1.5 text-xs tracking-widest text-paper/55">계정 탈퇴(삭제)</p>
      <p className="mb-2 text-[11px] text-paper/50">계정과 저장된 모든 내용을 서버에서 완전히 지운다. <b className="text-crimson/80">되돌릴 수 없다.</b> <b className="text-paper/70">게임 속 이름이 아니라 로그인할 때 쓰는 아이디</b>를 넣어야 한다.</p>
      <div className="flex gap-1.5">
        <input
          value={target}
          onChange={(e) => { setTarget(e.target.value); setConfirming(false) }}
          onKeyDown={(e) => e.key === 'Enter' && askConfirm()}
          placeholder="대상 아이디"
          aria-label="탈퇴시킬 대상 아이디"
          className="min-w-0 flex-1 rounded border border-edge/25 bg-ink-muted/60 px-2 py-1 text-sm text-paper outline-none focus:border-crimson/50"
        />
        {!confirming ? (
          <button type="button" data-account-delete-go disabled={!target.trim() || busy} onClick={askConfirm} className="rounded border border-crimson/40 px-3 text-xs text-crimson hover:bg-crimson/10 disabled:opacity-40">
            탈퇴
          </button>
        ) : null}
      </div>
      {confirming && (
        <p className="mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-crimson/10 px-3 py-2 text-xs text-crimson" role="alert" data-account-delete-confirm>
          정말 <b>{target.trim()}</b>을(를) 탈퇴시키겠습니까? 되돌릴 수 없습니다.
          <button type="button" data-account-delete-confirm-yes disabled={busy} onClick={go} className="rounded border border-crimson/50 px-2 py-0.5 text-crimson hover:bg-crimson/20 disabled:opacity-40">
            예, 탈퇴시킨다
          </button>
          <button type="button" onClick={cancel} disabled={busy} className="rounded border border-edge/25 px-2 py-0.5 text-paper/70 hover:bg-edge/10 disabled:opacity-40">
            아니오
          </button>
        </p>
      )}
      {res?.ok && <p className="mt-2 rounded-lg bg-shade/25 px-3 py-2 text-sm text-paper" data-account-delete-result><b className="text-paper">{res.target}</b> 계정을 탈퇴시켰다.</p>}
      {res && !res.ok && <p className="mt-2 text-xs text-crimson" role="alert">{res.text}</p>}
    </section>
  )
}

/** 익명 사연 심사: 대기 사연을 골라 '선택해서 신문에 올리기', 내용이 불순하면 반려 */
function StoryReview({ userId, adminKey }) {
  const [st, setSt] = useState({ loading: true })
  const [sel, setSel] = useState({})
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const load = () => {
    setSt((s) => ({ ...s, loading: true }))
    fetchPendingStories(userId, adminKey).then((r) => setSt(r.ok ? { pending: r.pending, published: r.published, date: r.date } : { error: r.error }))
  }
  useEffect(load, [userId, adminKey]) // eslint-disable-line react-hooks/exhaustive-deps
  const chosen = (st.pending ?? []).filter((s) => sel[s.id])
  const publish = async () => {
    if (!chosen.length || busy) return
    setBusy(true)
    let n = 0
    for (const s of chosen) {
      const r = await publishStory(userId, adminKey, s.id)
      if (r.ok) n += 1
    }
    setSel({})
    setMsg(`${n}건을 오늘의 교내 신문에 올렸다.`)
    setBusy(false)
    load()
  }
  const reject = async (s) => {
    if (busy) return
    setBusy(true)
    const r = await rejectStory(userId, adminKey, s.id)
    setMsg(r.ok ? '사연을 반려했다.' : '반려하지 못했다.')
    setBusy(false)
    load()
  }
  return (
    <section data-story-review>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p className="text-xs tracking-widest text-paper/55">익명 사연 심사 {st.pending && `(대기 ${st.pending.length}건)`}</p>
        <button type="button" onClick={load} className="rounded border border-edge/25 px-2 py-0.5 text-[11px] text-paper/80 hover:bg-edge/10">새로고침</button>
      </div>
      {st.error && <p className="text-xs text-crimson" role="alert">사연 목록을 불러오지 못했다.</p>}
      <ul className="space-y-1.5" aria-label="대기 중인 익명 사연">
        {(st.pending ?? []).map((s) => (
          <li key={s.id} data-story-pending={s.id} className="rounded-lg bg-shade/25 px-3 py-2 text-xs text-paper/85">
            <label className="flex items-start gap-2">
              <input type="checkbox" checked={!!sel[s.id]} onChange={(e) => setSel((o) => ({ ...o, [s.id]: e.target.checked }))} aria-label="신문에 올릴 사연 선택" className="mt-0.5" />
              <span className="whitespace-pre-line break-words leading-relaxed">{s.text}</span>
            </label>
            <div className="mt-1.5 flex justify-end">
              <button type="button" disabled={busy} onClick={() => reject(s)} className="rounded border border-crimson/50 px-2 py-0.5 text-[11px] text-crimson hover:bg-crimson/10">반려</button>
            </div>
          </li>
        ))}
      </ul>
      {!st.loading && !st.error && !(st.pending ?? []).length && <p className="text-xs text-paper/55">심사를 기다리는 사연이 없다.</p>}
      <button type="button" disabled={!chosen.length || busy} onClick={publish} className="mt-2 rounded border border-gold/50 px-3 py-1 text-xs text-gold hover:bg-gold/10 disabled:opacity-40" data-story-publish>
        선택해서 신문에 올리기 ({chosen.length})
      </button>
      {msg && <p className="mt-1 text-[11px] text-paper/60" role="status">{msg}</p>}
      {(st.published ?? []).length > 0 && <p className="mt-1 text-[10px] text-paper/45">오늘({st.date}) 신문에 올라간 사연 {st.published.length}건 · 올린 순서대로 #1, #2, #3…</p>}
    </section>
  )
}

// 유튜브 링크(watch?v=, youtu.be/, shorts/, embed/) 또는 영상ID 그 자체에서 영상ID만 뽑아낸다. 못 알아보면 null.
function extractYoutubeId(input) {
  const s = (input || '').trim()
  if (/^[\w-]{10,20}$/.test(s)) return s
  try {
    const u = new URL(s)
    if (/youtu\.be$/.test(u.hostname)) return u.pathname.slice(1).split('/')[0] || null
    if (/youtube\.com$/.test(u.hostname)) {
      const v = u.searchParams.get('v')
      if (v) return v
      const m = u.pathname.match(/\/(shorts|embed)\/([\w-]{10,20})/)
      if (m) return m[2]
    }
  } catch {
    /* URL 형태가 아니면 알아보지 못한다 */
  }
  return null
}

/** 관리자: 배경음악(평소 곡) 유튜브 재생목록을 추가·삭제·순서변경하고 저장한다. */
function BgmManager({ userId, adminKey, playlist }) {
  const [list, setList] = useState(playlist ?? [])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  useEffect(() => setList(playlist ?? []), [playlist])

  const add = () => {
    const id = extractYoutubeId(input)
    if (!id) {
      setMsg('유튜브 링크나 영상ID를 알아볼 수 없다.')
      return
    }
    if (list.some((t) => t.id === id)) {
      setMsg('이미 목록에 있다.')
      return
    }
    setList((l) => [...l, { id, title: '' }])
    setInput('')
    setMsg('')
  }
  const remove = (id) => setList((l) => l.filter((t) => t.id !== id))
  const move = (i, dir) =>
    setList((l) => {
      const j = i + dir
      if (j < 0 || j >= l.length) return l
      const next = [...l]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  const save = async () => {
    setBusy(true)
    const r = await adminSetBgmPlaylist(userId, adminKey, list)
    setBusy(false)
    setMsg(r.ok ? '배경음악 목록을 저장했다. 모두의 화면에 곧바로 반영된다.' : '저장하지 못했다.')
  }
  return (
    <section data-bgm-manager>
      <p className="mb-1.5 text-xs tracking-widest text-paper/55">배경음악(평소 곡) 재생목록</p>
      <p className="mb-2 text-[11px] text-paper/50">
        유튜브 링크나 영상ID를 추가하면, 평소 화면의 배경음악이 이 목록을 순서대로(다 돌면 처음부터) 재생한다. 목록을 비우면 원래 로컬 음악으로 돌아간다. <b className="text-paper/70">[저장]</b>을 눌러야 모두에게 반영된다.
      </p>
      <div className="flex gap-1.5">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="유튜브 링크 또는 영상ID"
          aria-label="유튜브 링크 또는 영상ID"
          className="min-w-0 flex-1 rounded border border-edge/25 bg-ink-muted/60 px-2 py-1 text-sm text-paper outline-none focus:border-gold/50"
        />
        <button type="button" onClick={add} className="rounded border border-edge/25 px-3 text-xs text-paper/80 hover:bg-edge/10">
          추가
        </button>
      </div>
      <ul className="mt-2 space-y-1" aria-label="배경음악 재생목록">
        {list.map((t, i) => (
          <li key={t.id} data-bgm-track={t.id} className="flex items-center gap-1.5 rounded-lg bg-shade/25 px-2 py-1.5 text-xs text-paper/85">
            <span className="min-w-0 flex-1 truncate font-mono">{t.id}</span>
            <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="위로" className="rounded border border-edge/20 px-1.5 text-paper/70 hover:bg-edge/10 disabled:opacity-30">
              ▲
            </button>
            <button type="button" onClick={() => move(i, 1)} disabled={i === list.length - 1} aria-label="아래로" className="rounded border border-edge/20 px-1.5 text-paper/70 hover:bg-edge/10 disabled:opacity-30">
              ▼
            </button>
            <button type="button" onClick={() => remove(t.id)} className="rounded border border-crimson/40 px-1.5 text-crimson hover:bg-crimson/10">
              삭제
            </button>
          </li>
        ))}
      </ul>
      {!list.length && <p className="mt-1 text-xs text-paper/45">등록된 곡이 없다. (지금은 로컬 음악이 흐른다)</p>}
      <button type="button" disabled={busy} onClick={save} className="mt-2 rounded border border-gold/50 px-3 py-1 text-xs text-gold hover:bg-gold/10 disabled:opacity-40" data-bgm-save>
        저장
      </button>
      {msg && (
        <p className="mt-1 text-[11px] text-paper/60" role="status">
          {msg}
        </p>
      )}
    </section>
  )
}

const num = (v, lo, hi, dec = false) => {
  const n = Number(v)
  if (!Number.isFinite(n)) return lo
  return Math.min(hi, Math.max(lo, dec ? n : Math.round(n)))
}

function Field({ id, label, value, onChange, min = 0, max = 9999 }) {
  return (
    <label className="flex items-center justify-between gap-2 rounded-lg bg-shade/25 px-3 py-1.5 text-sm text-paper/85" htmlFor={id}>
      {label}
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-24 rounded border border-edge/25 bg-ink-muted/60 px-2 py-1 text-right text-sm tabular-nums text-paper outline-none focus:border-gold/50"
      />
    </label>
  )
}

/** 관리자 도구: 스탯 · 체력 · 영력 · 의지력을 마음대로 고친다. (소지금은 늘 무한) */
export default function AdminPanel({ player, userId, adminKey, online, onApply, onClose }) {
  const [titleTarget, setTitleTarget] = useState('')
  const chooseTitleTarget = (id) => {
    setTitleTarget(id)
    document.getElementById('admin-chat-title-target')?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }
  const [v, setV] = useState(() => ({
    ...Object.fromEntries(STAT_KEYS.map((k) => [k, player.stats[k]])),
    hp: Math.floor(player.hp),
    hpMax: player.hpMax,
    mp: Math.floor(player.mp),
    mpMax: player.mpMax,
    spirit: Math.floor(player.spirit),
    clearWeak: false,
    acquirePsychic: '',
  }))
  const myPsychics = GRANTABLE_PSYCHICS.filter((p) => !player.psychics?.includes(p.id))
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  const set = (k) => (val) => setV((p) => ({ ...p, [k]: val }))

  const apply = () => {
    const hpMax = num(v.hpMax, 1, 9999)
    const mpMax = num(v.mpMax, 1, 9999)
    onApply({
      stats: Object.fromEntries(STAT_KEYS.map((k) => [k, num(v[k], 1, 999)])),
      hpMax,
      mpMax,
      hp: num(v.hp, 0, hpMax),
      mp: num(v.mp, 0, mpMax),
      spirit: num(v.spirit, 0, 9999999),
      clearWeak: !!v.clearWeak,
      acquirePsychic: v.acquirePsychic || null,
    })
    onClose()
  }
  const fill = () => setV((p) => ({ ...p, hp: num(p.hpMax, 1, 9999), mp: num(p.mpMax, 1, 9999) }))

  return (
    <div className="modal-scrim fixed inset-0 z-[70] grid place-items-center p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="관리자 도구" className="ink-panel flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-2 border-b border-edge/15 px-4 py-3">
          <h2 className="flex items-center gap-2 font-serif text-lg text-gold">
            <Shield size={18} aria-hidden />
            관리자 도구
          </h2>
          <button type="button" onClick={onClose} aria-label="관리자 도구 닫기" className="grid size-8 place-items-center rounded-lg bg-edge/10 text-paper/80 hover:bg-edge/20">
            <X size={16} />
          </button>
        </div>
        <div className="min-h-0 flex-1 space-y-4 overflow-auto p-4">
          <p className="text-[11px] text-paper/55">소지금은 무한이다. 아래 수치는 [적용]을 눌러야 바뀐다. 관리자 계정은 랭킹에 오르지 않는다.</p>
          <section>
            <p className="mb-1.5 text-xs tracking-widest text-paper/55">육조 스탯 (1~999)</p>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {STAT_KEYS.map((k) => (
                <Field key={k} id={`adm-${k}`} label={STAT_META[k].label} value={v[k]} onChange={set(k)} min={1} max={999} />
              ))}
            </div>
          </section>
          <section>
            <p className="mb-1.5 text-xs tracking-widest text-paper/55">체력 · 영력 · 의지력</p>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              <Field id="adm-hp" label="체력" value={v.hp} onChange={set('hp')} />
              <Field id="adm-hpMax" label="체력 최대" value={v.hpMax} onChange={set('hpMax')} min={1} />
              <Field id="adm-mp" label="의지력" value={v.mp} onChange={set('mp')} />
              <Field id="adm-mpMax" label="의지력 최대" value={v.mpMax} onChange={set('mpMax')} min={1} />
              <Field id="adm-spirit" label="영력" value={v.spirit} onChange={set('spirit')} max={9999999} />
            </div>
            <button type="button" onClick={fill} className="mt-2 rounded border border-edge/25 px-3 py-1 text-xs text-paper/80 hover:bg-edge/10">
              체력·의지력 가득 채우기
            </button>
            <label className="mt-2 flex items-center gap-1.5 text-sm text-paper/85">
              <input data-admin-self-weak type="checkbox" checked={!!v.clearWeak} onChange={(e) => setV((p) => ({ ...p, clearWeak: e.target.checked }))} />
              내 [쇠약] 해제
            </label>
          </section>
          <section>
            <p className="mb-1.5 text-xs tracking-widest text-paper/55">영능력</p>
            <label className="flex items-center gap-2 text-sm text-paper/85">
              내가 직접 취득
              <select data-admin-psychic value={v.acquirePsychic} onChange={(e) => setV((p) => ({ ...p, acquirePsychic: e.target.value }))} aria-label="취득할 영능력" className="min-w-0 flex-1 rounded border border-edge/25 bg-ink-muted/60 px-2 py-1 text-sm text-paper">
                <option value="">(선택 안 함)</option>
                {myPsychics.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </label>
            <p className="mt-1 text-[11px] text-paper/50">[적용]을 눌러야 들어온다. 이미 가진 영능력은 목록에서 빠진다. 다른 사람에게 선물하려면 아래 '다른 사람 상태 고치기'를 쓴다.</p>
          </section>
          <ChatTitleManager userId={userId} adminKey={adminKey} targetId={titleTarget} onTargetId={setTitleTarget} />
          <PasswordReset userId={userId} adminKey={adminKey} />
          <AccountDelete userId={userId} adminKey={adminKey} />
          <EditOther userId={userId} adminKey={adminKey} online={online} />
          <BgmManager userId={userId} adminKey={adminKey} playlist={online.bgmPlaylist} />
          <MailAudit userId={userId} adminKey={adminKey} />
          <StoryReview userId={userId} adminKey={adminKey} />
          <MemberList userId={userId} adminKey={adminKey} onEditTitle={chooseTitleTarget} />
        </div>
        <div className="flex justify-end gap-2 border-t border-edge/15 px-4 py-3">
          <button type="button" onClick={onClose} className="flat-btn-ghost">
            취소
          </button>
          <button type="button" onClick={apply} className="flat-btn">
            적용
          </button>
        </div>
      </div>
    </div>
  )
}
