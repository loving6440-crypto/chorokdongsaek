/** 오목 규칙 설명 — RulesModal 안에 넣는 내용만 담는다. */
export default function OmokRules() {
  return (
    <div>
      <p className="mt-1 text-xs leading-relaxed text-paper/80">
        15×15 바둑판에 두 사람이 번갈아 돌을 하나씩 놓는다. 먼저 두는 쪽이 흑돌, 다음이 백돌이다.
      </p>

      <p className="mt-3 text-[11px] tracking-widest text-paper/50">이기는 법</p>
      <ul className="mt-1.5 space-y-1.5 text-xs leading-relaxed text-paper/75">
        <li>• 가로·세로·대각선 중 어느 한 방향으로든 자기 돌 5개를 먼저 끊기지 않고 이으면 이긴다.</li>
        <li>• 6개 이상 이어져도(장목) 이긴 것으로 친다 — 이 판에서는 6목을 막는 금지수를 두지 않는다.</li>
        <li>• 판이 모두 채워질 때까지 아무도 5개를 잇지 못하면 무승부다.</li>
      </ul>

      <p className="mt-3 text-[11px] tracking-widest text-paper/50">두는 법</p>
      <ul className="mt-1.5 space-y-1.5 text-xs leading-relaxed text-paper/75">
        <li>• 이미 돌이 있는 자리에는 둘 수 없다. 한 번 놓은 돌은 움직이거나 빼지 않는다.</li>
        <li>• 내 차례일 때만 판의 교차점을 눌러 둘 수 있다.</li>
      </ul>

      <p className="mt-3 rounded-lg bg-edge/[0.07] px-2.5 py-2 text-[11px] leading-relaxed text-paper/55">
        이 판은 단순화했다: 흑돌에게 3-3, 4-4, 장목 등을 금지하는 렌주룰은 적용하지 않는다 — 누구든 5개(또는 그 이상) 이으면 바로 이긴다.
      </p>
    </div>
  )
}
