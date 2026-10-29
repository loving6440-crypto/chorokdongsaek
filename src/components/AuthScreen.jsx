import { useState } from 'react'
import { markAdmin, serverFindIds, serverLogin, serverSignup } from '../game/auth'
import { verifyAdminKey } from '../net/online'
import logo from '../assets/logo.png'
import SoundToggle from './SoundToggle'
import ThemeToggle from './ThemeToggle'

const inputClass =
  'w-full rounded border border-edge/20 bg-ink-muted/60 px-3 py-2.5 text-sm text-paper outline-none transition placeholder:text-paper/35 focus:border-gold/50 focus:ring-1 focus:ring-gold/30'
const labelClass = 'mb-1.5 block text-xs tracking-wide text-paper/70'
const primaryBtn =
  'w-full rounded border border-gold/40 bg-gold/15 py-2.5 text-sm font-medium tracking-wide text-gold transition hover:bg-gold/25 disabled:cursor-not-allowed disabled:opacity-40'
const tabClass = (active) =>
  `flex-1 py-2.5 text-sm tracking-wide transition ${
    active
      ? 'border-b-2 border-gold text-gold'
      : 'border-b border-edge/15 text-paper/50 hover:text-paper/80'
  }`

// notice: 위에 띄울 안내 (예: 서버 저장으로 바뀌어 다시 로그인이 필요할 때) · presetId: 아이디 칸에 미리 넣을 값
export default function AuthScreen({ theme, onToggleTheme, onSuccess, notice, presetId }) {
  const [mode, setMode] = useState('login') // 'login' | 'signup' | 'find'
  const [found, setFound] = useState(null) // 아이디 찾기 결과 id 목록
  const [id, setId] = useState(presetId ?? '')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [twitter, setTwitter] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [adminKey, setAdminKey] = useState('')
  const [showAdmin, setShowAdmin] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (mode === 'find') {
      setLoading(true)
      const r = await serverFindIds(twitter)
      setLoading(false)
      if (!r.ok) {
        setFound(null)
        setError(r.error)
      } else setFound(r.ids)
      return
    }
    setLoading(true)

    try {
      // 관리자 키를 적었다면 서버가 먼저 확인한다. 맞으면 이 계정은 관리자가 된다.
      const key = adminKey.trim()
      if (key) {
        const v = await verifyAdminKey(id.trim(), key)
        if (!v.ok) {
          setError(
            v.error === 'bad-key' ? '관리자 키가 맞지 않습니다.' : v.error === 'admin-disabled' ? '이 서버에는 관리자 키가 설정되어 있지 않습니다.' : v.error === 'slow-down' ? '시도가 너무 많습니다. 잠시 뒤에 다시 해 주세요.' : '서버에 연결할 수 없어 관리자 키를 확인하지 못했습니다.',
          )
          setLoading(false)
          return
        }
      }
      if (mode === 'signup') {
        if (password !== password2) {
          setError('비밀번호가 서로 일치하지 않습니다.')
          setLoading(false)
          return
        }
        const result = await serverSignup({ id, password, twitter, adminKey: key || undefined })
        if (!result.ok) {
          setError(result.error)
          setLoading(false)
          return
        }
        onSuccess(key ? markAdmin(result.user.id, key) ?? result.user : result.user)
      } else {
        const result = await serverLogin({ id, password, adminKey: key || undefined })
        if (!result.ok) {
          setError(result.error)
          setLoading(false)
          return
        }
        onSuccess(key ? markAdmin(result.user.id, key) ?? result.user : result.user, { mustReset: result.mustReset })
      }
    } catch {
      setError('처리 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="stage-bg flex min-h-full flex-col items-center justify-center px-4 py-10 text-paper">
      <div className="absolute right-4 top-4 flex items-center gap-2">
        <SoundToggle />
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </div>

      <div className="w-full max-w-md">
        <header className="mb-8 text-center">
          <div className="logo-tag relative mx-auto inline-block px-6 py-3">
            <img src={logo} alt="草綠同色 초록동색" className="block h-24 w-auto select-none" draggable={false} />
            <span className="sparkle absolute -top-3 -right-3 text-2xl" aria-hidden="true" />
            <span className="sparkle absolute -bottom-2 -left-2 text-lg [animation-delay:-1.2s]" aria-hidden="true" />
          </div>
          <p className="mt-4 text-sm text-paper/65">수련생 등록 및 로그인</p>
        </header>

        <div className="ink-panel overflow-hidden rounded-lg border border-edge/10">
          <div className="flex">
            <button type="button" className={tabClass(mode === 'login')} onClick={() => { setMode('login'); setError(''); setFound(null) }}>
              로그인
            </button>
            <button type="button" className={tabClass(mode === 'signup')} onClick={() => { setMode('signup'); setError(''); setFound(null) }}>
              회원가입
            </button>
            <button type="button" className={tabClass(mode === 'find')} onClick={() => { setMode('find'); setError(''); setFound(null) }}>
              아이디 찾기
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 p-6">
            {notice && mode === 'login' && (
              <p className="rounded border border-gold/40 bg-gold/10 px-3 py-2.5 text-xs leading-relaxed text-paper" role="status">
                {notice}
              </p>
            )}
            {mode === 'find' && (
              <>
                <p className="text-xs leading-relaxed text-paper/65">가입할 때 적은 트위터 아이디로 계정 아이디를 찾을 수 있어요. (비밀번호 찾기는 지원하지 않습니다.)</p>
                <div>
                  <label className={labelClass} htmlFor="auth-twitter">
                    트위터 아이디
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-paper/40">@</span>
                    <input id="auth-twitter" className={`${inputClass} pl-7`} value={twitter} onChange={(e) => setTwitter(e.target.value)} placeholder="twitter_id" autoComplete="off" required />
                  </div>
                </div>
                {found && (
                  <div className="rounded border border-gold/40 bg-gold/10 px-3 py-3 text-sm text-paper" role="status" data-found-ids>
                    <p className="text-xs text-paper/65">찾은 아이디</p>
                    {found.map((f) => (
                      <p key={f} className="mt-1 font-serif text-lg text-gold" data-found-id={f}>
                        {f}
                      </p>
                    ))}
                    <button type="button" onClick={() => { setMode('login'); setId(found[0]); setFound(null) }} className="mt-2 text-xs text-paper/70 underline underline-offset-2 hover:text-paper">
                      이 아이디로 로그인하러 가기
                    </button>
                  </div>
                )}
              </>
            )}
            {mode !== 'find' && (<>
            <div>
              <label className={labelClass} htmlFor="auth-id">
                아이디
              </label>
              <input
                id="auth-id"
                className={inputClass}
                value={id}
                onChange={(e) => setId(e.target.value)}
                placeholder="2글자 이상"
                autoComplete="username"
                required
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="auth-pw">
                비밀번호
              </label>
              <input
                id="auth-pw"
                type="password"
                className={inputClass}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="4글자 이상"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
              />
            </div>

            {mode === 'signup' && (
              <>
                <div>
                  <label className={labelClass} htmlFor="auth-pw2">
                    비밀번호 확인
                  </label>
                  <input
                    id="auth-pw2"
                    type="password"
                    className={inputClass}
                    value={password2}
                    onChange={(e) => setPassword2(e.target.value)}
                    placeholder="비밀번호를 다시 입력"
                    autoComplete="new-password"
                    required
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="auth-twitter">
                    트위터 아이디
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-paper/40">
                      @
                    </span>
                    <input
                      id="auth-twitter"
                      className={`${inputClass} pl-7`}
                      value={twitter}
                      onChange={(e) => setTwitter(e.target.value)}
                      placeholder="twitter_id"
                      autoComplete="off"
                      required
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              {!showAdmin ? (
                <button type="button" onClick={() => setShowAdmin(true)} className="text-[11px] text-paper/40 underline-offset-2 hover:text-paper/70 hover:underline">
                  관리자 계정이라면
                </button>
              ) : (
                <>
                  <label className={labelClass} htmlFor="auth-admin">
                    관리자 키 (선택)
                  </label>
                  <input
                    id="auth-admin"
                    type="password"
                    className={inputClass}
                    value={adminKey}
                    onChange={(e) => setAdminKey(e.target.value)}
                    placeholder="관리자만 입력"
                    autoComplete="off"
                  />
                </>
              )}
            </div>

            </>)}

            {error && (
              <p className="rounded border border-crimson/40 bg-crimson/10 px-3 py-2 text-xs text-crimson">
                {error}
              </p>
            )}

            <button type="submit" className={primaryBtn} disabled={loading}>
              {loading ? '처리 중…' : mode === 'login' ? '로그인' : mode === 'find' ? '아이디 찾기' : '가입하고 시작하기'}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-[11px] leading-relaxed text-paper/40">
          데이터는 이 브라우저(컴퓨터)에만 저장됩니다.
          <br />
          새로고침·재실행해도 로그인만 하면 캐릭터가 그대로 이어집니다.
        </p>
      </div>
    </div>
  )
}
