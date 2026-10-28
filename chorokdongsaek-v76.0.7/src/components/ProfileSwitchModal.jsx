import { useEffect, useState } from 'react'
import { Check, Plus, Trash2, X } from 'lucide-react'
import { listProfiles } from '../game/auth'
import { gradeOf } from '../game/character'
import Avatar from './Avatar'

/** 프로필 바꾸기 (관리자 전용): 여러 캐릭터 중 하나를 골라 바꾸거나, 새 캐릭터를 만든다. */
export default function ProfileSwitchModal({ userId, onSwitch, onCreate, onDelete, onClose }) {
  const [tick, setTick] = useState(0)
  const [askDel, setAskDel] = useState(null)
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  const list = listProfiles(userId) // tick 이 바뀌면 다시 읽는다
  void tick

  return (
    <div className="modal-scrim fixed inset-0 z-[70] grid place-items-center p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="프로필 바꾸기" className="ink-panel flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-2 border-b border-edge/15 px-4 py-3">
          <h2 className="font-serif text-lg text-gold">프로필 바꾸기</h2>
          <button type="button" onClick={onClose} aria-label="프로필 바꾸기 닫기" className="grid size-8 place-items-center rounded-lg bg-edge/10 text-paper/80 hover:bg-edge/20">
            <X size={16} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto p-4">
          <p className="text-[11px] text-paper/55">관리자 계정은 캐릭터를 여러 명 둘 수 있다. 캐릭터마다 진행 상황이 따로 저장된다.</p>
          <ul className="mt-3 space-y-2" aria-label="프로필 목록">
            {list.map((p) => (
              <li key={p.pid} data-profile={p.pid} data-active={p.active ? '1' : '0'} className={`flex items-center gap-3 rounded-xl p-2.5 ${p.active ? 'bg-gold-fill/20' : 'bg-edge/[0.07]'}`}>
                <button
                  type="button"
                  disabled={p.active || p.empty}
                  onClick={() => onSwitch(p.pid)}
                  aria-label={p.active ? `${p.name} (지금 캐릭터)` : `${p.name}(으)로 바꾸기`}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left enabled:hover:opacity-80"
                >
                  <Avatar avatar={p.avatar} size={44} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-serif text-base text-paper">{p.name}</span>
                    <span className="block text-[11px] text-paper/55">{p.empty ? '캐릭터를 만들다 만 프로필' : `${gradeOf({ age: p.age, grade: p.grade })}학년 · ${p.age}세`}</span>
                  </span>
                  {p.active && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-gold-fill px-2 py-0.5 text-[10px] text-ink light:text-ink">
                      <Check size={11} aria-hidden />
                      지금
                    </span>
                  )}
                </button>
                {!p.active &&
                  (askDel === p.pid ? (
                    <span className="flex shrink-0 items-center gap-1">
                      <button type="button" onClick={() => { onDelete(p.pid); setAskDel(null); setTick((t) => t + 1) }} className="rounded bg-crimson px-2 py-1 text-[11px] text-white">
                        지우기
                      </button>
                      <button type="button" onClick={() => setAskDel(null)} className="rounded border border-edge/25 px-2 py-1 text-[11px] text-paper/80">
                        취소
                      </button>
                    </span>
                  ) : (
                    <button type="button" onClick={() => setAskDel(p.pid)} aria-label={`${p.name} 프로필 지우기`} className="grid size-8 shrink-0 place-items-center rounded-lg text-paper/45 hover:bg-crimson/15 hover:text-crimson">
                      <Trash2 size={15} />
                    </button>
                  ))}
              </li>
            ))}
          </ul>
        </div>
        <div className="border-t border-edge/15 px-4 py-3">
          <button type="button" onClick={onCreate} className="flat-btn w-full justify-center">
            <Plus size={15} aria-hidden />
            새 캐릭터 만들기
          </button>
        </div>
      </div>
    </div>
  )
}
