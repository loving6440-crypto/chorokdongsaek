import LocationIntro from '../LocationIntro'
import Battle from './Battle'

export default function Gym({ view, ...rest }) {
  if (view === 'intro') return <LocationIntro id="gym" />
  if (view === 'hike') {
    return (
      <section aria-label="산 탐색">
        <h2 className="font-serif text-2xl text-gold">산 탐색</h2>
        <div className="ink-panel mt-4 w-full rounded-xl p-5">
          <p className="text-sm leading-relaxed text-paper/75">산을 돌아다니며 조사하고 활동하는 곳이다. 아직 준비 중이다.</p>
        </div>
      </section>
    )
  }
  return <Battle {...rest} />
}
