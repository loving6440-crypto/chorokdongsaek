import { Mountain, ShoppingBag, BedDouble, BookOpen, Compass, Swords, GraduationCap, Moon, Signpost, MessageCircle, Utensils } from 'lucide-react'

/**
 * 구역별 활동 목록. 화면 위쪽 '활동' 칸에 버튼으로 나오고,
 * 고른 활동에 따라 아래 칸의 화면이 바뀐다.
 * action: true 이면 화면을 바꾸지 않고 그 자리에서 바로 실행하는 활동.
 */
export const ACTIVITIES = {
  mainHall: [
    { id: 'intro', label: '둘러보기', icon: BookOpen },
    { id: 'class', label: '수업', icon: GraduationCap },
    { id: 'explore', label: '본관 탐사', icon: Compass },
  ],
  annex: [
    { id: 'intro', label: '둘러보기', icon: BookOpen },
    { id: 'explore', label: '별관 탐사', icon: Compass },
  ],
  dorm: [
    { id: 'intro', label: '둘러보기', icon: BookOpen },
    { id: 'my-room', label: '내 기숙사', icon: BedDouble },
    { id: 'store', label: '매점', icon: ShoppingBag },
    { id: 'cafeteria', label: '급식실', icon: Utensils },
  ],
  gym: [
    { id: 'intro', label: '둘러보기', icon: BookOpen },
    { id: 'battle', label: '퇴마 실습', icon: Swords },
    { id: 'hike', label: '산 탐색', icon: Mountain },
  ],
  infirmary: [
    { id: 'intro', label: '둘러보기', icon: BookOpen },
    { id: 'rest', label: '휴식 · 상담', icon: BedDouble },
  ],
  shrine: [
    { id: 'intro', label: '둘러보기', icon: BookOpen },
    { id: 'sign', label: '표지판', icon: Signpost },
    { id: 'guard', label: '문지기와 대화', icon: MessageCircle },
  ],
}
