/**
 * NPC 대화창(미연시풍). 모든 NPC 가 이 모양을 쓴다: 이름표와 대사가 초상화의 위쪽에 놓인다. (바리의 위치가 기준)
 */
export default function NpcDialog({ npc, src, face, dataNpc, children }) {
  return (
    <div className="ink-panel mt-4 flex items-start gap-3 rounded-2xl p-3 sm:p-4" aria-live="polite" aria-label={`${npc}의 말`} data-npc={dataNpc}>
      {src ? (
        <img
          src={src}
          alt={npc}
          data-face={face}
          className="size-28 shrink-0 rounded-2xl bg-edge/10 object-cover object-top sm:size-36"
          draggable={false}
        />
      ) : (
        // 초상화가 아직 없을 때: 깨진 이미지 대신 이름 첫 글자로 자리를 대신한다.
        <div
          data-face={face}
          data-npc-portrait-placeholder
          aria-hidden
          className="grid size-28 shrink-0 place-items-center rounded-2xl bg-edge/10 font-serif text-3xl text-paper/40 sm:size-36"
        >
          {npc?.[0] ?? '?'}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="inline-block rounded-full bg-gold-fill px-3 py-0.5 text-xs font-medium text-ink light:text-ink">{npc}</p>
        <p className="mt-2 min-h-[4.5rem] text-sm leading-[1.85] break-keep text-paper/95" data-npc-line>
          {children}
        </p>
      </div>
    </div>
  )
}
