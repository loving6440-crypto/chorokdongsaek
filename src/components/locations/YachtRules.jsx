/** 요트 다이스 규칙 설명 — RulesModal 안에 넣는 내용만 담는다. */
export default function YachtRules() {
  return (
    <div>
      <p className="mt-1 text-xs leading-relaxed text-paper/80">
        2~4인. 주사위 5개를 던져 12가지 칸 중 하나를 골라 점수를 채운다. 모두가 12칸을 다 채우면 끝나고, 총점이 가장 높은 사람이 이긴다.
      </p>

      <p className="mt-3 text-[11px] tracking-widest text-paper/50">던지기</p>
      <ul className="mt-1.5 space-y-1.5 text-xs leading-relaxed text-paper/75">
        <li>• 한 차례에 최대 3번까지 던진다. 처음 던진 뒤에는 남길 주사위를 고르고 나머지만 다시 던질 수 있다.</li>
        <li>• 던지기를 끝내면(또는 3번을 다 쓰면) 아직 채우지 않은 칸 하나에 지금 주사위로 점수를 매겨 채운다.</li>
        <li>• 맞는 조합이 안 나와도 빈 칸 하나를 0점으로 채워 "버릴" 수 있다.</li>
      </ul>

      <p className="mt-3 text-[11px] tracking-widest text-paper/50">점수 칸</p>
      <ul className="mt-1.5 space-y-1.5 text-xs leading-relaxed text-paper/75">
        <li>• 숫자 1~6 — 그 숫자가 나온 주사위 개수 × 그 숫자.</li>
        <li>• 초이스 — 주사위 5개의 합.</li>
        <li>• 포커 — 같은 눈이 4개 이상이면 주사위 5개의 합.</li>
        <li>• 풀하우스 — 같은 눈 3개 + 다른 같은 눈 2개면 주사위 5개의 합.</li>
        <li>• 스몰 스트레이트 — 1-2-3-4, 2-3-4-5, 3-4-5-6 중 하나를 모두 갖추면 15점.</li>
        <li>• 라지 스트레이트 — 1-2-3-4-5 또는 2-3-4-5-6을 모두 갖추면 30점.</li>
        <li>• 요트 — 같은 눈 5개가 모두 같으면 50점.</li>
      </ul>

      <p className="mt-3 rounded-lg bg-edge/[0.07] px-2.5 py-2 text-[11px] leading-relaxed text-paper/55">
        조건을 못 맞춘 칸(포커·풀하우스·스트레이트·요트)에 억지로 채우면 0점으로 기록된다.
      </p>
    </div>
  )
}
