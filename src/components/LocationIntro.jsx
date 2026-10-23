import { LOCATIONS } from '../game/constants'
import { LOCATION_INTRO } from '../game/locationText'

/** 구역에 들어서면 먼저 나오는 묘사(한 줄 소개 + 두 문단). */
export default function LocationIntro({ id }) {
  const loc = LOCATIONS[id]
  return (
    <div>
      <h2 className="flex items-center gap-2 font-serif text-2xl text-gold">
        {loc.name} · {loc.accentLabel} <span className="sparkle text-lg" aria-hidden="true" />
      </h2>
      <p className="mt-1 text-sm text-paper/70">{loc.navNote}</p>
      <div className="ink-panel mt-4 w-full space-y-4 rounded-xl p-5">
        {LOCATION_INTRO[id].map((p, i) => (
          <p key={i} className="text-sm leading-[1.9] break-keep text-paper/85">
            {p}
          </p>
        ))}
      </div>
    </div>
  )
}
