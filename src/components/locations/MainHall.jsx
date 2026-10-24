import { COURSES } from '../../game/constants'
import { lessonOf } from '../../game/progress'
import { LESSON_DAILY_ATTEMPTS } from '../../game/courseInfo'
import LocationIntro from '../LocationIntro'
import Explore from './Explore'

// view: 'intro' | 'class'. 본관에 새로 들어설 때마다 intro 부터 시작하도록 Game 이 들고 있는다.
export default function MainHall({ player, view, onOpenCourse, onInvestigate, onEnter, onLockerMove, onLockerOpen }) {

  if (view === 'intro') return <LocationIntro id="mainHall" />
  if (view === 'explore') return <Explore stats={player.stats} player={player} onInvestigate={onInvestigate} onEnter={onEnter} onLockerMove={onLockerMove} onLockerOpen={onLockerOpen} />

  return (
    <section>
      <h2 className="flex items-center gap-2 font-serif text-2xl text-gold">
        수업 <span className="sparkle text-lg" aria-hidden="true" />
      </h2>
      <p className="mt-1 text-sm text-paper/65">
        과목 카드를 열면 설명과 오늘의 수업 상태가 나온다. 게임은 하루 {LESSON_DAILY_ATTEMPTS}회까지 시도할 수 있다.
      </p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {COURSES.map((course) => {
          const st = lessonOf(player, course.id)
          const waiting = st.waitUntil && st.waitUntil > Date.now()
          return (
            <button
              key={course.id}
              type="button"
              onClick={() => onOpenCourse(course)}
              className="ink-panel tilt rounded-xl p-4 text-left hover:bg-gold-fill/15"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="inline-block rounded-full bg-gold-fill/20 px-2 py-px text-[10px] tracking-widest text-gold">과목</p>
                {st.done ? (
                  <span className="rounded-full border border-emerald-500/50 px-1.5 py-px text-[10px] text-emerald-400 light:text-emerald-700">
                    오늘 완료
                  </span>
                ) : waiting ? (
                  <span className="rounded-full border border-gold/50 px-1.5 py-px text-[10px] text-gold">대기 중</span>
                ) : course.id !== 'divination-fortune' ? (
                  <span className="text-[10px] text-paper/45">
                    {Math.max(0, LESSON_DAILY_ATTEMPTS - st.used)}/{LESSON_DAILY_ATTEMPTS}회 남음
                  </span>
                ) : null}
              </div>
              <p className="mt-1 font-serif text-lg text-paper">{course.title}</p>
              <p className="mt-1 text-xs text-gold/80">{course.game}</p>
              <p className="mt-2 text-xs leading-relaxed text-paper/55">{course.note}</p>
            </button>
          )
        })}
      </div>
    </section>
  )
}
