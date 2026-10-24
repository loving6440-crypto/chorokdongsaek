import LocationIntro from '../LocationIntro'
import Battle from './Battle'
import Armory from './Armory'

export default function Gym({ view, ...rest }) {
  if (view === 'intro') return <LocationIntro id="gym" />
  if (view === 'hike') return <Armory player={rest.player} onEnhance={rest.onEnhance} onMeet={rest.onMeet} admin={rest.admin} onAdminGive={rest.onAdminGive} />
  return <Battle {...rest} />
}
