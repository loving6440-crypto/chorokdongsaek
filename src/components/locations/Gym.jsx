import LocationIntro from '../LocationIntro'
import Battle from './Battle'
import Hike from './Hike'

export default function Gym({ view, ...rest }) {
  if (view === 'intro') return <LocationIntro id="gym" />
  if (view === 'hike')
    return (
      <Hike
        player={rest.player}
        onEnhance={rest.onEnhance}
        onMeet={rest.onMeet}
        admin={rest.admin}
        onAdminGive={rest.onAdminGive}
        onGather={rest.onGather}
        onVisit={rest.onVisit}
        onGiveNpc={rest.onGiveNpc}
      />
    )
  return <Battle {...rest} />
}
