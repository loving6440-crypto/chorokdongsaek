import { useState } from 'react'
import { login, signup } from '../game/auth'
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

export default function AuthScreen({ theme, onToggleTheme, onSuccess }) {
  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [id, setId] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [twitter, setTwitter] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (mode === 'signup') {
        if (password !== password2) {
          setError('비밀번호가 서로 일치하지 않습니다.')
          setLoading(false)
          return
        }
        const result = signup({ id, password, twitter })
        if (!result.ok) {
          setError(result.error)
          setLoading(false)
          return
        }
        onSuccess(result.user)
      } else {
        const result = login({ id, password })
        if (!result.ok) {
          setError(result.error)
          setLoading(false)
          return
        }
        onSuccess(result.user)
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
            <button type="button" className={tabClass(mode === 'login')} onClick={() => { setMode('login'); setError('') }}>
              로그인
            </button>
            <button type="button" className={tabClass(mode === 'signup')} onClick={() => { setMode('signup'); setError('') }}>
              회원가입
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 p-6">
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

            {error && (
              <p className="rounded border border-crimson/40 bg-crimson/10 px-3 py-2 text-xs text-crimson">
                {error}
              </p>
            )}

            <button type="submit" className={primaryBtn} disabled={loading}>
              {loading ? '처리 중…' : mode === 'login' ? '로그인' : '가입하고 시작하기'}
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
