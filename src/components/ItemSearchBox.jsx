import { Search, X } from 'lucide-react'

/** 아이템 검색 입력칸 (소지품·물품보관함 공용). */
export default function ItemSearchBox({ value, onChange, label = '아이템 검색', count, total, className = '' }) {
  return <div className={`flex items-center gap-2 ${className}`}>
    <label className="flex min-w-0 flex-1 items-center gap-2 rounded-lg bg-shade/50 px-2 py-1.5 ring-1 ring-edge/20 focus-within:ring-gold/50">
      <Search size={14} aria-hidden className="shrink-0 text-paper/50" />
      <input type="search" aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} placeholder="이름·분류·초성(ㄱㄹㄴ)으로 찾기" className="min-w-0 flex-1 bg-transparent text-sm text-paper outline-none placeholder:text-paper/35" />
      {value && <button type="button" aria-label="검색어 지우기" onClick={() => onChange('')} className="shrink-0 text-paper/50 hover:text-paper"><X size={14} aria-hidden /></button>}
    </label>
    {value && total != null && <span className="shrink-0 text-[11px] tabular-nums text-paper/55" aria-live="polite">{count}/{total}</span>}
  </div>
}
