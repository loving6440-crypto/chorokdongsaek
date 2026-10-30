import LocationIntro from '../LocationIntro'
import Battle from './Battle'
import Hike from './Hike'
import Pioneer from './Pioneer'

export default function Gym({ view, ...rest }) {
  if (view === 'intro') return <LocationIntro id="gym" />
  if (view === 'pioneer') return <Pioneer player={rest.player} stats={rest.stats} onHuntAction={rest.onHuntAction} />
  if (view === 'hike')
    return (
      <Hike
        player={rest.player}
        onEnhance={rest.onEnhance}
        onSpecialEnhance={rest.onSpecialEnhance}
        onRemoveSpecial={rest.onRemoveSpecial}
        onMeet={rest.onMeet}
        admin={rest.admin}
        onAdminGive={rest.onAdminGive}
        onGardenAction={rest.onGardenAction}
        onHuntAction={rest.onHuntAction}
        stats={rest.stats}
        onVisit={rest.onVisit}
        onGiveNpc={rest.onGiveNpc}
      />
    )
  return <Battle {...rest} />
}
