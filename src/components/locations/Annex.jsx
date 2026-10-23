import LocationIntro from '../LocationIntro'

const TOMES = [
  { title: '창록고 연혁', body: '위장된 공립 기숙학교. 실제로는 무속 전승을 잇는 국립 기관이다.' },
  { title: '오방색 배치', body: '본관-청, 별관-백, 기숙사-흑, 뒷산-적, 사당-황. 방위와 제례가 겹친다.' },
  { title: '영력 수련 요결', body: '신속에 비례해 영력이 쌓인다. 환산하면 육조 스탯을 키울 수 있다.' },
]

export default function Annex({ view }) {
  if (view === 'intro') return <LocationIntro id="annex" />
  return (
    <section>
      <p className="text-xs tracking-widest text-paper/45">열람실 · 고서적</p>
      <ul className="mt-2 w-full space-y-3">
        {TOMES.map((tome) => (
          <li key={tome.title} className="ink-panel rounded-md border-edge/20 p-4">
            <p className="font-serif text-paper">{tome.title}</p>
            <p className="mt-1 text-sm leading-relaxed text-paper/65">{tome.body}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
