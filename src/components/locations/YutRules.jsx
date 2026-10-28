const THROWS = [
  ['빽도', '표시 윳가지 1개만 자빠지고(평평한 면 위) 나머지 셋은 엎어짐', '1칸 뒤로'],
  ['도', '1개만 자빠짐(표시 윳가지가 아닐 때)', '1칸'],
  ['개', '2개가 자빠짐', '2칸'],
  ['걸', '3개가 자빠짐', '3칸'],
  ['윳', '4개 모두 자빠짐', '4칸 + 한 번 더 던지기'],
  ['모', '4개 모두 엎어짐(자빠진 게 없음)', '5칸 + 한 번 더 던지기'],
]

/** 윷놀이 규칙 설명 — RulesModal 안에 넣는 내용만 담는다(틀은 공통 모달이 맡는다). */
export default function YutRules() {
  return (
    <div>
      <p className="mt-1 text-[11px] tracking-widest text-paper/50">윳가지 네 개를 던진 결과</p>
      <table className="mt-1.5 w-full text-xs">
        <tbody>
          {THROWS.map(([name, cond, move]) => (
            <tr key={name} className="border-b border-edge/10 last:border-0">
              <td className="py-1 pr-2 font-serif text-paper">{name}</td>
              <td className="py-1 pr-2 text-paper/55">{cond}</td>
              <td className="py-1 text-right text-gold">{move}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="mt-3 text-[11px] tracking-widest text-paper/50">말 움직이기</p>
      <ul className="mt-1.5 space-y-1.5 text-xs leading-relaxed text-paper/75">
        <li>• 윳·모가 나오면 한 번 더 던진다. 던진 값은 모아 두고, 이번 차례에 내 말 어느 것에나 순서 없이 골라 쓸 수 있다.</li>
        <li>• 내 말이 있는 자리에 내 말이 또 가면 자동으로 업혀서 함께 움직인다(한 번에 같은 수만큼).</li>
        <li>• 내 말이 상대 말이 있는 자리에 정확히 서면 그 말을 잡아 시작점으로 돌려보내고, 한 번 더 던진다.</li>
        <li>• 대기 중인 말은 완주 지점(0번)을 건너뛰고 1번 칸부터 이동한다. 처음부터 모(5칸)를 쓰면 5번 꼭짓점에 정확히 도착한다.</li>
        <li>• 네 말이 전부 판을 한 바퀴 돌아 완주하면 이긴다.</li>
      </ul>

      <p className="mt-3 text-[11px] tracking-widest text-paper/50">지름길</p>
      <ul className="mt-1.5 space-y-1.5 text-xs leading-relaxed text-paper/75">
        <li>• 5번 꼭짓점에 정확히 멈춘 말은 다음 이동에서 직진하거나 중앙으로 향하는 지름길을 고를 수 있다.</li>
        <li>• 10번 꼭짓점에 정확히 멈춘 말은 다음 이동에서 직진하거나 중앙으로 향하는 지름길을 고를 수 있다.</li>
        <li>• 중앙에 정확히 멈춘 말은 다음 이동에서 15번 방향이나 완주 방향을 고를 수 있다.</li>
        <li>• 이동 중 꼭짓점을 지나칠 때는 선택할 수 없다. 도중에 멈추지 않고 원래 이동하던 방향으로 계속 간다.</li>
      </ul>

      <p className="mt-3 rounded-lg bg-edge/[0.07] px-2.5 py-2 text-[11px] leading-relaxed text-paper/55">
        이 판은 2가지를 단순화했다: 업기는 늘 자동이고(따로 고르지 않음), 빽도는 바깥 테두리 위의 말에만 쓸 수 있다(지름길·중앙 위에서는 쓸 수 없음).
      </p>
    </div>
  )
}
