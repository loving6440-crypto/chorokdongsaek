import { useState } from 'react'
import { Users, X } from 'lucide-react'
import ProfileForm from './ProfileForm'
import { cleanGreeting, cleanName } from '../game/character'

/** 프로필 수정: 사진 · 이름 · 나이 · 학년을 바꾼다. 스탯과 진행 상황은 그대로다.
 *  관리자 계정은 여기서 '프로필 바꾸기'(계정의 다른 캐릭터로 전환)도 들어갈 수 있다. */
export default function ProfileEditModal({ player, admin = false, onSave, onClose, onSwitchProfile }) {
  const [value, setValue] = useState({
    name: player.name,
    greeting: player.greeting ?? '',
    age: player.age,
    grade: player.grade ?? null,
    avatar: player.avatar,
  })
  const name = cleanName(value.name)
  const ok = name.length > 0
  return (
    <div className="modal-scrim fixed inset-0 z-[70] grid place-items-center overflow-auto p-4">
      <div role="dialog" aria-modal="true" aria-label="프로필 수정" className="w-full max-w-md">
        <div className="mb-2 flex items-center justify-between px-1">
          <h2 className="font-serif text-xl text-gold">프로필 수정</h2>
          <button type="button" onClick={onClose} aria-label="프로필 수정 닫기" className="grid size-8 place-items-center rounded-full bg-edge/10 text-paper/80 hover:bg-edge/20">
            <X size={16} />
          </button>
        </div>
        <ProfileForm title="인적 사항" value={value} onChange={(patch) => setValue((v) => ({ ...v, ...patch }))} />
        {admin && onSwitchProfile && (
          <button
            type="button"
            onClick={onSwitchProfile}
            className="ink-panel mt-3 flex w-full items-center gap-2 rounded-xl p-3 text-left text-sm text-gold hover:bg-gold/10"
          >
            <Users size={15} aria-hidden />
            프로필 바꾸기 (관리자 · 이 계정의 다른 캐릭터로 전환하거나 새로 만들기)
          </button>
        )}
        <div className="mt-3 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="flat-btn-ghost">
            취소
          </button>
          <button
            type="button"
            disabled={!ok}
            onClick={() => onSave({ ...value, name, greeting: cleanGreeting(value.greeting) })}
            className="flat-btn disabled:cursor-not-allowed disabled:opacity-40"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  )
}
