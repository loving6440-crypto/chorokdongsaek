/** 루미큐브 규칙 설명 — RulesModal 안에 넣는 내용만 담는다. */
export default function RummikubRules() {
  return (
    <div>
      <p className="mt-1 text-xs leading-relaxed text-paper/80">
        2~4인. 1~13 숫자 × 빨강·파랑·검정·노랑 4색이 2장씩, 조커 2장 — 모두 106장을 쓴다. 인원대로 나눠 가진 패로 시작해서, 번갈아
        가며 조합을 만들어 테이블에 내려놓고, 손패를 먼저 다 비우면 이긴다.
      </p>

      <p className="mt-3 text-[11px] tracking-widest text-paper/50">조합 두 가지</p>
      <ul className="mt-1.5 space-y-1.5 text-xs leading-relaxed text-paper/75">
        <li>• 그룹 — 같은 숫자, 서로 다른 색 3~4장 (예: 빨강7·파랑7·검정7).</li>
        <li>• 런 — 같은 색, 이어지는 숫자 3장 이상 (예: 노랑5·노랑6·노랑7).</li>
        <li>• 조커는 어떤 타일도 대신할 수 있다. 낼 때 무엇을 대신하는지(색·숫자) 정해서 낸다.</li>
      </ul>

      <p className="mt-3 text-[11px] tracking-widest text-paper/50">첫 조합과 턴</p>
      <ul className="mt-1.5 space-y-1.5 text-xs leading-relaxed text-paper/75">
        <li>• 내가 처음으로 패를 내는 턴에는, 새로 내는 조합(들)의 숫자 합이 30점 이상이어야 한다(조커는 대신하는 숫자 값으로 센다).</li>
        <li>• 첫 조합을 내기 전까지는 테이블에 이미 있는 조합을 손댈 수 없다 — 내 손패에서 새 조합만 낼 수 있다.</li>
        <li>• 첫 조합을 낸 뒤에는 테이블의 조합을 자유롭게 재배열할 수 있다 — 쪼개기·합치기·조커 빼내 쓰기까지 전부 가능하다.
          다만 그 턴이 끝났을 때 테이블의 모든 타일이 빠짐없이, 유효한 조합 안에 들어 있어야 한다.</li>
        <li>• 낼 게 없으면(또는 내지 않기로 하면) 더미에서 한 장을 가져오고 턴을 마친다.</li>
      </ul>

      <p className="mt-3 rounded-lg bg-edge/[0.07] px-2.5 py-2 text-[11px] leading-relaxed text-paper/55">
        이 판은 2가지를 단순화했다: 조커를 되찾아 쓴 바로 그 턴에 다시 내야 한다는 규칙은 없다(들고 있다가 나중에 내도 된다). 또한 시간 제한은 없다.
      </p>
    </div>
  )
}
