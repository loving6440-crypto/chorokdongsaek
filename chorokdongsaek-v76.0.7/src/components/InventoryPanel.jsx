import { Backpack } from 'lucide-react'

/** 소지품. 위쪽 칸 안에 들어가는 작은 칸 모음 (아직 아이템이 없다). */
export default function InventoryPanel() {
  return (
    <section>
      <h2 className="flex items-center gap-2 font-serif text-base text-gold">
        <Backpack size={16} aria-hidden />
        소지품
        <span className="font-sans text-[11px] font-normal text-paper/55">획득한 아이템이 이곳에 쌓인다. (준비 중)</span>
      </h2>
      <div className="mt-2 grid grid-cols-6 gap-2 sm:grid-cols-12" aria-label="빈 소지품 칸">
        {Array.from({ length: 12 }, (_, i) => (
          <div key={i} className="aspect-square rounded-lg border-2 border-dashed border-edge/20 bg-shade/20" />
        ))}
      </div>
    </section>
  )
}
