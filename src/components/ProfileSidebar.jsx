import { LogOut, Pencil, RotateCcw, Trophy } from 'lucide-react'
import logo from '../assets/logo.png'
import { LOCATIONS } from '../game/constants'
import { spiritGaugeMax } from '../game/progress'
import Avatar from './Avatar'
import { gradeOf } from '../game/character'
import SoundToggle from './SoundToggle'
import ThemeToggle from './ThemeToggle'

// 마름모 조각의 꼭짓점. 일부러 좌우·위아래를 조금씩 어긋나게 잡아 비정형으로 보이게 한다.
/**
 * 모서리를 둥글린 마름모: 둥근 정사각형을 45° 돌려서 만든다(테두리도 그대로 먹는다).
 * 안의 내용은 돌리지 않고 정자세로 둔다.
 */
function Facet({ border, fill, className = '', style, children, label }) {
  return (
    <section
      aria-label={label}
      className={`absolute ${className}`}
      style={style}
    >
      <div
        className="absolute top-1/2 left-1/2 size-[70.7%] transition-colors duration-300"
        style={{
          transform: 'translate(-50%, -50%) rotate(45deg)',
          borderRadius: '24%',
          border: `3px solid ${border}`,
          background: fill ?? 'var(--panel-to)',
        }}
      />
      <div className="relative size-full">{children}</div>
    </section>
  )
}

/** 세로 막대 + 분수 표기(현재 / 최대). 막대마다 높이와 바닥을 달리해 들쭉날쭉하게 놓는다. */
function VBar({ label, value, max, height, lift = 0, fill }) {
  const ratio = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0
  return (
    <div className="flex w-14 flex-col items-center" style={{ marginBottom: lift }}>
      <span className="mb-1.5 text-[11px] tracking-wide text-paper/80">{label}</span>
      <div
        className="relative w-7 overflow-hidden rounded-[0.55rem] bg-shade/50 ring-1 ring-edge/15"
        style={{ height }}
        role="meter"
        aria-label={label}
        aria-valuenow={Math.floor(value)}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div className={`absolute inset-x-0 bottom-0 transition-[height] duration-500 ${fill}`} style={{ height: `${ratio}%` }} />
      </div>
      <span className="mt-1.5 font-serif text-sm leading-none text-paper tabular-nums">{Math.floor(value)}</span>
      <span className="my-0.5 h-px w-8 bg-paper/40" aria-hidden />
      <span className="text-[10px] leading-none text-paper/55 tabular-nums">{max}</span>
    </div>
  )
}

/** 플랫한 돈주머니 (청색 주머니 + 금색 끈·동전). */
function Pouch({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <path d="M11 4.5c1.6 1.6 3.4 2 5 2s3.4-.4 5-2l-1.8 4.6H12.8z" fill="#ffd426" />
      <path d="M12.6 9.1h6.8C25 12.2 28 17 28 21.5 28 26 23.6 28.5 16 28.5S4 26 4 21.5c0-4.5 3-9.3 8.6-12.4z" fill="#2aa6b8" />
      <rect x="11" y="8.2" width="10" height="2.6" rx="1.3" fill="#ffd426" />
      <circle cx="16" cy="20" r="4.6" fill="#ffd426" />
      <rect x="14.6" y="17.6" width="2.8" height="4.8" rx=".6" fill="#2aa6b8" />
    </svg>
  )
}

export default function ProfileSidebar({ player, locationId, theme, onToggleTheme, onLogout, userId, onOpenItems, spotItems, onEditProfile, onOpenCodex, onReplayIntro }) {
  const location = LOCATIONS[locationId]
  const spiritMax = spiritGaugeMax(player.spirit)

  return (
    <aside className="order-1 shrink-0 lg:w-[22rem] lg:overflow-x-hidden lg:overflow-y-auto" aria-label="프로필">
      {/* 352 × 640 고정 구도: 같은 모양의 정마름모를 격자로 맞물려 쌓는다. */}
      <div className="sidebar-canvas relative mx-auto h-[804px] w-[352px]">
        <div aria-hidden className="absolute top-3 left-3 h-[72px] w-[200px] rounded-[50%] border-2 border-gold/35" />
        <div className="logo-tag absolute top-0 left-0 grid h-[72px] w-[200px] place-items-center !rounded-[50%]">
          <img src={logo} alt="草綠同色 초록동색" className="block h-12 w-auto select-none" draggable={false} />
          <span className="sparkle absolute top-1 right-5 text-base" aria-hidden="true" />
        </div>

        <div className="absolute top-1 right-0 flex flex-col items-end gap-2">
          <SoundToggle />
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              title="로그아웃"
              aria-label="로그아웃"
              className="grid size-8 place-items-center rounded border border-edge/20 text-paper/50 transition hover:border-crimson/40 hover:bg-crimson/10 hover:text-crimson"
            >
              <LogOut size={15} />
            </button>
          )}
        </div>

        {/* 프로필: 큰 정마름모 (중심 176,196) */}
        <Facet label="캐릭터" border="var(--panel-border)" className="top-[84px] left-[48px] size-[256px]">
          <div className="flex size-full flex-col items-center pt-[56px]">
            <Avatar avatar={player.avatar} size={72} />
            <p className="mt-2 max-w-[150px] truncate font-serif text-lg tracking-wide text-gold">{player.name}</p>
            <div className="mt-1.5 flex gap-1.5">
              <span className="rounded-md border border-edge/25 px-2 py-0.5 text-xs text-paper/80">{gradeOf(player)}학년</span>
              <span className="rounded-md border border-edge/25 px-2 py-0.5 text-xs text-paper/80">{player.age}세</span>
            </div>
            {userId && <p className="mt-1.5 max-w-[100px] truncate text-[10px] text-paper/35">@{userId}</p>}
          </div>
        </Facet>

        {onEditProfile && (
          <button
            type="button"
            onClick={onEditProfile}
            title="프로필 수정"
            aria-label="프로필 수정"
            className="absolute top-[118px] left-[238px] z-10 grid size-7 place-items-center rounded-full border border-gold/50 bg-ink/70 text-gold transition hover:bg-gold/15"
          >
            <Pencil size={13} />
          </button>
        )}

        {/* 현재 위치 한자: 왼쪽 아래 작은 정마름모 */}
        <Facet
          label="현재 위치"
         
          border={location.accent}
          fill={`color-mix(in srgb, ${location.accent} 18%, var(--panel-to))`}
          className="top-[252px] left-[8px] size-[132px]"
        >
          <div className="grid size-full place-items-center" title={`현재 장소 · ${location.name}`}>
            <div className="text-center">
              <p
                className="font-myeongjo text-[36px] leading-none font-bold"
                style={{ color: location.accent, textShadow: 'none' }}
                aria-label={`${location.name} ${location.hanja}`}
              >
                {location.hanja}
              </p>
              <p className="mt-1 text-[10px] tracking-wide text-paper/60">{location.name}</p>
            </div>
          </div>
        </Facet>

        {/* 기르는 신수: 오른쪽 아래 작은 정마름모 */}
        <Facet
          label="기르는 신수"
         
          border="color-mix(in srgb, var(--c-gold) 55%, transparent)"
          className="top-[252px] left-[212px] size-[132px]"
        >
          <div className="grid size-full place-items-center">
            <div className="text-center">
              <p className="font-serif text-[12px] text-gold/90">기르는 신수</p>
              <p className="mt-0.5 text-[10px] leading-snug text-paper/55">준비 중</p>
            </div>
          </div>
        </Facet>

        {/* 체력 · 영력 · 의지력: 같은 높이의 세 막대를 가지런히 */}
        <div className="absolute bottom-[208px] left-1/2 flex -translate-x-1/2 items-end gap-8" aria-label="자원">
          <VBar label="체력" value={player.hp} max={player.hpMax} height={126} fill="bg-crimson" />
          <VBar label="영력" value={player.spirit} max={spiritMax} height={126} fill="bg-gold-fill" />
          <VBar label="의지력" value={player.mp} max={player.mpMax} height={126} fill="bg-mana" />
        </div>

        {/* 소지금 + 소지품 버튼 */}
        <div
          className="absolute bottom-[154px] left-1/2 flex h-[44px] w-[248px] -translate-x-1/2 items-center gap-3 rounded-2xl bg-shade/50 px-4 ring-1 ring-edge/15"
          aria-label="소지금"
        >
          <Pouch />
          <span className="text-[11px] tracking-wide text-paper/65">소지금</span>
          <span className="ml-auto font-serif text-lg leading-none text-gold tabular-nums" data-money={Math.floor(player.money)}>
            {Math.floor(player.money)}냥
          </span>
        </div>
        <button
          type="button"
          onClick={onOpenItems}
          className={`flat-btn absolute bottom-[96px] left-1/2 h-[48px] w-[248px] -translate-x-1/2 justify-center ${spotItems ? 'spot' : ''}`}
        >
          내 소지품 확인하기
        </button>
        <button
          type="button"
          onClick={onOpenCodex}
          className="flat-btn absolute bottom-[40px] left-1/2 h-[48px] w-[248px] -translate-x-1/2 justify-center"
        >
          <Trophy size={15} aria-hidden />
          업적/도감 확인하기
        </button>
        {/* 맨 왼쪽 아래: 인트로 다시보기 */}
        <button
          type="button"
          onClick={onReplayIntro}
          className="tilt absolute bottom-0 left-0 inline-flex h-8 items-center gap-1.5 rounded-lg border border-edge/25 px-3 text-xs text-paper/70 hover:bg-edge/[0.1] hover:text-paper"
        >
          <RotateCcw size={13} aria-hidden />
          인트로 다시보기
        </button>
      </div>
    </aside>
  )
}
