import { BookOpen } from 'lucide-react'

const THROWS = [
  ['빽도', '표시 윳가지 1개만 자빠지고(평평한 면 위) 나머지 셋은 엎어짐', '1칸 뒤로'],
  ['도', '1개만 자빠짐(표시 윳가지가 아닐 때)', '1칸'],
  ['개', '2개가 자빠짐', '2칸'],
  ['걸', '3개가 자빠짐', '3칸'],
  ['윳', '4개 모두 자빠짐', '4칸 + 한 번 더 던지기'],
  ['모', '4개 모두 엎어짐(자빠진 게 없음)', '5칸 + 한 번 더 던지기'],
]

/** 패 놀이터 윷놀이 옆에 띄우는 규칙 설명서. */
export default function YutRules() {
  return (
    <aside className="ink-panel w-full shrink-0 rounded-xl p-4 lg:w-72" aria-label="윷놀이 규칙">
      <p className="flex items-center gap-1.5 font-serif text-base text-gold">
        <BookOpen size={15} aria-hidden />
        윷놀이 규칙
      </p>

      <p className="mt-3 text-[11px] tracking-widest text-paper/50">윳가지 네 개를 던진 결과</p>
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
        <li>• 네 말이 전부 판을 한 바퀴 돌아 완주하면 이긴다.</li>
      </ul>

      <p className="mt-3 text-[11px] tracking-widest text-paper/50">지름길</p>
      <ul className="mt-1.5 space-y-1.5 text-xs leading-relaxed text-paper/75">
        <li>• 귀퉁이(5번 자리)에 서면 그대로 가거나, 중앙을 거쳐 15번 자리로 바로 나오는 지름길을 고를 수 있다.</li>
        <li>• 다른 귀퉁이(10번 자리)에 서면 그대로 가거나, 중앙을 거쳐 곧장 완주하는 지름길을 고를 수 있다.</li>
        <li>• 중앙에 정확히 서면 15번 쪽으로 나갈지, 완주 쪽으로 나갈지 고른다.</li>
        <li>• 가는 길에 분기점을 지나게 되면(정확히 서지 않아도) 그 자리에서 멈춰 방향을 고른다.</li>
      </ul>

      <p className="mt-3 rounded-lg bg-edge/[0.07] px-2.5 py-2 text-[11px] leading-relaxed text-paper/55">
        이 판은 2가지를 단순화했다: 업기는 늘 자동이고(따로 고르지 않음), 빽도는 바깥 테두리 위의 말에만 쓸 수 있다(지름길·중앙 위에서는 쓸 수 없음).
      </p>
    </aside>
  )
}
