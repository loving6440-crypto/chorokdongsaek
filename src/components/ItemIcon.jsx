import { itemOf } from '../game/items'
import { EXTRA_BG, EXTRA_ICONS } from './icons2'
import { V79_ICONS } from './icons79'
import { V79_EXTRA_ICONS } from './icons79extra'
import HwatuFace from './minigames/HwatuFace'
import { GARDEN_ITEM_ICONS } from './icons79garden'

/**
 * 아이템 아이콘: 플랫 디자인의 원형 배지.
 *
 * - CUSTOM_ICONS 에 같은 id 로 그려 둔 그림이 있으면 그걸 쓴다.
 * - 없으면(새로 추가한 아이템) kind 에 맞는 기본 그림을 id 로 정한 색 위에 자동으로 그린다.
 *   → items.js 에 아이템만 추가해도 아이콘이 따로 없어 빈칸이 되는 일은 없다.
 */

// 배지 바탕색 (플랫 아이콘 세트의 색감)
const BG = {
  blue: '#78b4d8',
  orange: '#e5985a',
  teal: '#6cc1ae',
  red: '#cf5757',
  navy: '#4d5a7a',
  sand: '#e0dccb',
  green: '#7fb77e',
  pink: '#e08aa0',
  purple: '#8f7cc4',
  yellow: '#e6b94f',
}
const AUTO_BG = ['blue', 'orange', 'teal', 'red', 'navy', 'green', 'pink', 'purple', 'yellow']

// 그림에 쓰는 색
const W = '#fbf6e9' // 크림색
const W2 = '#e7dcc2' // 크림색 그늘
const K = '#2f3447' // 먹색
const Y = '#f5c84c' // 노랑
const R = '#d9534f' // 빨강
const G = '#4f9d6b' // 초록
const BR = '#6b4a3a' // 갈색

const hash = (s) => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7)

// ───────── 직접 그린 아이콘 (64×64, 원 안 12~52 영역에 그린다) ─────────
const CUSTOM_ICONS = {
  // 사과맛 피크닉: 빨대 꽂은 팩 + 사과
  picnic: {
    bg: 'green',
    art: (
      <>
        <path d="M36 20 L39 11 H44" fill="none" stroke={R} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="20" y="19" width="24" height="33" rx="4" fill={W} />
        <rect x="20" y="19" width="24" height="4" rx="1.5" fill={W2} />
        <rect x="20" y="48" width="24" height="4" rx="1.5" fill={W2} />
        <circle cx="32" cy="37" r="6.5" fill={R} />
        <path d="M32 30.5 q1 -4.5 5.5 -4.5 q0 4.5 -5.5 4.5z" fill={G} />
        <circle cx="30" cy="35" r="1.3" fill="#fff" opacity=".5" />
      </>
    ),
  },
  // 가나다 초콜릿: 포장을 반쯤 벗긴 판 초콜릿
  chocolate: {
    bg: 'orange',
    art: (
      <>
        <rect x="19" y="11" width="26" height="26" rx="2.5" fill={BR} />
        <path d="M32 11 V37 M19 20 H45 M19 28.5 H45" stroke="#4a3226" strokeWidth="1.6" />
        <rect x="21" y="13" width="9" height="5" rx="1" fill="#8a6350" />
        <path d="M17 31 l3.5 -3.5 3.5 3.5 3.5 -3.5 3.5 3.5 3.5 -3.5 3.5 3.5 3.5 -3.5 3.5 3.5 V51 a2.5 2.5 0 0 1 -2.5 2.5 H19.5 A2.5 2.5 0 0 1 17 51z" fill={W} />
        <rect x="17" y="40" width="30" height="6" fill={R} />
      </>
    ),
  },
  // 컵라면
  ramen: {
    bg: 'red',
    art: (
      <>
        <path d="M25 22 q-3.5 -3.5 0 -7 M32 22 q-3.5 -3.5 0 -7 M39 22 q-3.5 -3.5 0 -7" fill="none" stroke={W} strokeWidth="2.2" strokeLinecap="round" opacity=".85" />
        <path d="M40 30 L48 14 M44 31 L52 17" stroke={Y} strokeWidth="2.2" strokeLinecap="round" />
        <path d="M17.5 29 H46.5 L43 52 H21Z" fill={W} />
        <path d="M18.6 36 H45.4 L44.3 44 H19.7Z" fill={Y} />
        <rect x="15" y="26.5" width="34" height="5" rx="2.5" fill={W2} />
      </>
    ),
  },
  // 만두
  dumpling: {
    bg: 'teal',
    art: (
      <>
        <path d="M12 40 C12 28 22 20 32 20 C42 20 52 28 52 40 C52 46 44 48 32 48 C20 48 12 46 12 40Z" fill={W} />
        <path d="M12 40 C12 46 20 48 32 48 C44 48 52 46 52 40 C52 43 44 44.5 32 44.5 C20 44.5 12 43 12 40Z" fill={W2} />
        <path d="M20 27.5 q2.5 3.5 1.5 8 M26.5 23.5 q2 4.5 1 10 M33 22 q1 5 0 11 M39.5 23.5 q-2 4.5 -1 10 M45.5 27.5 q-2.5 3.5 -1.5 8" fill="none" stroke={W2} strokeWidth="2.2" strokeLinecap="round" />
      </>
    ),
  },
  // 마이쭈: 사탕 포장
  chewy: {
    bg: 'pink',
    art: (
      <>
        <path d="M21 32 L9 22.5 V41.5Z" fill={W2} />
        <path d="M43 32 L55 22.5 V41.5Z" fill={W2} />
        <rect x="19" y="22" width="26" height="20" rx="9" fill={W} />
        <path d="M28 22.3 H34 L30 41.7 H24Z" fill={R} opacity=".9" />
        <path d="M38 22.6 H41 L37 41.4 H34Z" fill={R} opacity=".9" />
        <circle cx="25" cy="27" r="1.6" fill="#fff" opacity=".7" />
      </>
    ),
  },
  // 에너지드링크: 캔 + 번개
  energy: {
    bg: 'navy',
    art: (
      <>
        <rect x="20" y="14" width="24" height="38" rx="4.5" fill={W} />
        <rect x="21.5" y="11.5" width="21" height="4.5" rx="1.8" fill={W2} />
        <rect x="21.5" y="48" width="21" height="4.5" rx="1.8" fill={W2} />
        <path d="M35 19.5 L26 34 H32 L29.5 46 L39.5 29.5 H33.5Z" fill={Y} />
      </>
    ),
  },
  // 멧비둘기 깃털
  'dove-feather': {
    bg: 'blue',
    art: (
      <>
        <path d="M46 11 C30 12 17 25 15 49 C31 47 46 35 46 11Z" fill={W} />
        <path d="M46 11 C47 33 33 46 15 49 C24 41 32 34 38 25 C41 20 44 16 46 11Z" fill={W2} />
        <path d="M47 10 L13 52" fill="none" stroke="#8da5c0" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M37 20 L29 22 M33 26 L24 30 M29 32 L21 37 M25 38 L19 43" fill="none" stroke="#a9bbd0" strokeWidth="1.4" strokeLinecap="round" />
      </>
    ),
  },
  // 너구리 발톱
  'raccoon-claw': {
    bg: 'purple',
    art: (
      <>
        <path d="M19 17 C19 12.5 24 11 29 12 C45 15 53 33 46.5 54 C45 40 37 30 25 27 C21 26 19 22 19 17Z" fill={W} />
        <path d="M19 17 C19 12.5 24 11 29 12 C34 13 38.5 15.5 42 19 C36 18 29 19 24.5 22 C21 21.5 19 20 19 17Z" fill={W2} />
        <path d="M30 28 C37 31 41 37 43 45" fill="none" stroke={W2} strokeWidth="1.6" strokeLinecap="round" />
      </>
    ),
  },
  // 고라니 이빨
  'deer-tooth': {
    bg: 'yellow',
    art: (
      <>
        <path d="M24 12 C29 10.5 37 11 40 15 C40 30 37.5 42 33.5 53 C30 43 24.5 29 24 12Z" fill={W} />
        <path d="M24 12 C29 10.5 37 11 40 15 L39.8 22 C35 20.5 29 20.5 24.6 22Z" fill={W2} />
        <path d="M30 28 C31 34 32.5 40 33 45" fill="none" stroke={W2} strokeWidth="1.8" strokeLinecap="round" />
      </>
    ),
  },
  // 뱀 허물
  'snake-skin': {
    bg: 'green',
    art: (
      <>
        <path d="M20 17 C44 17 44 30 32 32 C20 34 20 47 44 47" fill="none" stroke={W} strokeWidth="9" strokeLinecap="round" />
        <path d="M20 17 C44 17 44 30 32 32 C20 34 20 47 44 47" fill="none" stroke={W2} strokeWidth="3.4" strokeLinecap="round" strokeDasharray="0.1 5.2" />
        <circle cx="19.5" cy="17" r="1.2" fill={K} opacity=".75" />
      </>
    ),
  },
  // 여우 꼬리털: 폭신한 꼬리
  'fox-fur': {
    bg: 'blue',
    art: (
      <>
        <defs>
          <clipPath id="fx-tail">
            <path d="M13 51 C9 37 17 22 31 15 C38 11.5 45 9 53 9 C54 17 51 26 46 34 C40 45 28 53 13 51Z" />
          </clipPath>
        </defs>
        <path d="M13 51 C9 37 17 22 31 15 C38 11.5 45 9 53 9 C54 17 51 26 46 34 C40 45 28 53 13 51Z" fill="#f0a35a" />
        <g clipPath="url(#fx-tail)">
          <circle cx="52" cy="12" r="13" fill={W} />
          <path d="M14 47 C22 40 31 32 39 22" fill="none" stroke="#d98a43" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M20 52 C30 46 38 40 45 31" fill="none" stroke="#d98a43" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M18 42 C23 37 28 32 33 25" fill="none" stroke="#f7c08a" strokeWidth="1.6" strokeLinecap="round" />
        </g>
      </>
    ),
  },
  // 쑥
  mugwort: {
    bg: 'teal',
    art: (
      <>
        <path d="M32 54 V30" stroke={W} strokeWidth="2.6" strokeLinecap="round" />
        {[-42, 42, 0].map((a) => (
          <path
            key={a}
            transform={`translate(32 47) rotate(${a}) scale(1.05)`}
            d="M0 0 C-6 -4 -9 -10 -6 -14 L-9 -15 L-5 -19 L-6 -22 L0 -20 L6 -22 L5 -19 L9 -15 L6 -14 C9 -10 6 -4 0 0Z"
            fill={a === 0 ? W : W2}
          />
        ))}
        <path d="M32 44 V28" stroke="#9fd8c8" strokeWidth="1.3" strokeLinecap="round" />
      </>
    ),
  },
  // 뱀딸기
  'snake-berry': {
    bg: 'sand',
    art: (
      <>
        <path d="M32 22 C43 22 49 31 45 41 C42 49 36 53 32 53 C28 53 22 49 19 41 C15 31 21 22 32 22Z" fill={R} />
        {[[27, 32], [37, 32], [32, 38], [25, 40], [39, 40], [29, 46], [35, 46]].map(([x, y]) => (
          <ellipse key={`${x}${y}`} cx={x} cy={y} rx="1.2" ry="1.7" fill={Y} />
        ))}
        <path d="M32 22 L23 18.5 L28.5 25Z M32 22 L41 18.5 L35.5 25Z M32 22.5 L32 13" fill={G} stroke={G} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
      </>
    ),
  },
  // 홍삼사탕: 붉은 사탕에 새겨진 인삼
  'ginseng-candy': {
    bg: 'navy',
    art: (
      <>
        <circle cx="32" cy="32" r="20" fill="#c0392b" />
        <path d="M18.5 24 A16 16 0 0 1 28 16.5" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" opacity=".45" />
        <circle cx="32" cy="24.5" r="3.4" fill={W} />
        <ellipse cx="32" cy="33.5" rx="3.2" ry="7" fill={W} />
        <path d="M29.5 31 L23.5 29 M34.5 31 L40.5 29 M30.5 39 L26.5 46 M33.5 39 L37.5 46" stroke={W} strokeWidth="2.3" strokeLinecap="round" />
      </>
    ),
  },
  // 부적 조각: 찢어진 누런 부적
  'charm-scrap': {
    bg: 'navy',
    art: (
      <>
        <path d="M21 10 H43 V38 L39 42 L41.5 47 L35 45 L32 54 L28 45 L22 48.5 L24 41 L21 38Z" fill="#f3dfa0" />
        <circle cx="32" cy="17" r="2.6" fill="none" stroke={R} strokeWidth="1.8" />
        <path d="M32 21 V37 M26 26 H38 M27.5 31.5 H36.5" stroke={R} strokeWidth="2" strokeLinecap="round" />
        <path d="M24 13 V35 M40 13 V35" stroke="#e1c875" strokeWidth="1.4" />
      </>
    ),
  },
  // 구겨진 한지
  'crumpled-hanji': {
    bg: 'orange',
    art: (
      <>
        <path d="M13 30 L20 15 L31 20 L41 11 L51 22 L47.5 34 L53 45 L38 51.5 L28 46 L15 51Z" fill={W} />
        <path d="M20 15 L31 20 L26 33 L13 30Z" fill={W2} />
        <path d="M41 11 L51 22 L39 28 L31 20Z" fill={W2} />
        <path d="M26 33 L39 28 L47.5 34 L38 51.5 L28 46Z" fill={W2} opacity=".6" />
        <path d="M31 20 L26 33 L28 46 M39 28 L47.5 34 M26 33 L15 51" fill="none" stroke="#cbbd99" strokeWidth="1.2" strokeLinejoin="round" />
      </>
    ),
  },
  // 부러진 먹: 두 동강 난 먹
  'broken-inkstick': {
    bg: 'blue',
    art: (
      <g transform="rotate(-28 32 32)">
        <path d="M11 24 H30 L33 28 L30 31.5 L34 35 L31 40 H11Z" fill={K} />
        <path d="M37 24 L40 28.5 L37 32.5 L41 36 L38 40 H54 V24Z" fill={K} />
        <rect x="13" y="24" width="3.5" height="16" fill={Y} />
        <rect x="47" y="24" width="3.5" height="16" fill={Y} />
        <path d="M19 28 H27 M43 28 H46" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" opacity=".28" />
      </g>
    ),
  },
  // 갈라진 붓
  'split-brush': {
    bg: 'red',
    art: (
      <>
        <path d="M44 8.5 L50.5 15 L28 37.5 L21.5 31Z" fill={W} />
        <path d="M44 8.5 L47.5 12 L25 34.5 L21.5 31Z" fill={W2} />
        <path d="M23.5 29 L30 35.5 L27.5 38 L21 31.5Z" fill={Y} />
        <path d="M21.5 33.5 L27 39 C24 45 19.5 49.5 11.5 52.5 C13 48 11.5 44 14.5 40.5 C17 38 19.5 36 21.5 33.5Z" fill={K} />
        <path d="M19.5 41 L13.5 51.5" stroke={BG.red} strokeWidth="1.8" strokeLinecap="round" />
      </>
    ),
  },
  // 장승 조각: 깨진 장승 얼굴
  'jangseung-piece': {
    bg: 'teal',
    art: (
      <>
        <path d="M21 17 L26.5 11.5 L31 17.5 L36.5 10.5 L43 16 V53 H21Z" fill="#c98b55" />
        <path d="M33 16 V53 H43 V16Z" fill="#b87a47" opacity=".6" />
        <path d="M23 20 L26 25 M38 21 L40 27" stroke="#a86a3a" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M24.5 27 Q28.5 24 31.5 28 Q28 30.5 24.5 27Z M32.5 28 Q36.5 24 40.5 27 Q37 30.5 32.5 28Z" fill={W} />
        <circle cx="28.5" cy="27.6" r="1.4" fill={K} />
        <circle cx="36.5" cy="27.6" r="1.4" fill={K} />
        <path d="M30.5 31 H34.5 L33.5 38 H31.5Z" fill="#a86a3a" />
        <path d="M26 43 H38 V48 H26Z" fill={W} />
        <path d="M30 43 V48 M34 43 V48" stroke="#a86a3a" strokeWidth="1.2" />
      </>
    ),
  },
  // 오색실: 오방색 실패
  'five-color-thread': {
    bg: 'purple',
    art: (
      <>
        <rect x="17.5" y="12.5" width="29" height="5.5" rx="2.2" fill={W} />
        <rect x="17.5" y="46" width="29" height="5.5" rx="2.2" fill={W} />
        <rect x="22" y="18" width="20" height="28" fill="#4a90d9" />
        <rect x="22" y="18" width="20" height="5.6" fill="#4a90d9" />
        <rect x="22" y="23.6" width="20" height="5.6" fill={R} />
        <rect x="22" y="29.2" width="20" height="5.6" fill={Y} />
        <rect x="22" y="34.8" width="20" height="5.6" fill={W} />
        <rect x="22" y="40.4" width="20" height="5.6" fill={K} />
        <path d="M42 38 C51 40 53 49 46 54" fill="none" stroke={Y} strokeWidth="1.8" strokeLinecap="round" />
      </>
    ),
  },
  // 덫 찌꺼기: 부러진 쇠덫과 헐거워진 스프링 (기존 원형 플랫 배지와 동일한 팔레트)
  'trap-scraps': {
    bg: 'sand',
    art: (
      <>
        <path d="M18 20 L26 17 L29 23 L22 28 L19 35 L14 31Z" fill={K} />
        <path d="M46 20 L38 17 L35 23 L42 28 L45 35 L50 31Z" fill={K} />
        <path d="M22 30 Q32 44 42 30" fill="none" stroke="#666b7a" strokeWidth="6" strokeLinecap="round" />
        <path d="M22 30 Q32 44 42 30" fill="none" stroke="#b1b4bc" strokeWidth="2" strokeLinecap="round" />
        <path d="M24 44 L30 40 L35 46 L40 42" fill="none" stroke={BR} strokeWidth="3.8" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="18" cy="20" r="2.6" fill={W2} />
        <circle cx="46" cy="20" r="2.6" fill={W2} />
        <path d="M16 47 L21 41 L26 47 L22 53Z" fill="#9196a1" />
      </>
    ),
  },
  // 순나비 귀걸이
  'sunnabi-earring': {
    bg: 'red',
    art: (
      <>
        <path d="M24 16 C24 11 28 9 32 9 C36 9 40 11 40 16 C40 23 35 27 32 31 C29 27 24 23 24 16Z" fill={Y} />
        <path d="M25 17 C25 23 29 27 32 30 C35 27 39 23 39 17" fill={R} />
        <circle cx="23" cy="21" r="4" fill={W} />
        <circle cx="41" cy="21" r="4" fill={W} />
        <path d="M23 25 V42 M41 25 V42" stroke={W} strokeWidth="2.6" strokeLinecap="round" />
        <path d="M23 43 C18 40 16 34 23 31 C30 34 28 40 23 43Z" fill={Y} />
        <path d="M41 43 C36 40 34 34 41 31 C48 34 46 40 41 43Z" fill={R} />
      </>
    ),
  },
  // 잉어
  carp: {
    bg: 'orange',
    art: (
      <>
        <path d="M16 33 C16 24 23 18 34 18 C41 18 48 22 51 27 L55 24 V42 L51 39 C48 44 41 48 34 48 C23 48 16 42 16 33Z" fill="#f19b5a" />
        <path d="M20 33 C24 28 31 25 39 25 C43 25 47 26 50 28" fill="none" stroke="#df8041" strokeWidth="2" strokeLinecap="round" />
        <circle cx="24.5" cy="30" r="1.6" fill={K} />
        <path d="M31 18 L38 11 L40 21Z" fill={Y} />
        <path d="M31 48 L38 55 L40 45Z" fill={Y} />
        <path d="M54 30 L46 33 L54 36" fill={W} />
      </>
    ),
  },
  // 이무기 비늘
  'imugi-scale': {
    bg: 'navy',
    art: (
      <>
        <path d="M32 11 C43 18 49 29 49 41 C44 49 37 53 32 53 C27 53 20 49 15 41 C15 29 21 18 32 11Z" fill={W} />
        <path d="M32 16 C39 22 42 29 42 38 C38 42 35 45 32 45 C29 45 26 42 22 38 C22 29 25 22 32 16Z" fill="#7cc1d4" />
        <path d="M20 41 C24 36 28 34 32 34 C36 34 40 36 44 41" fill="none" stroke="#9ad3e4" strokeWidth="2" strokeLinecap="round" />
      </>
    ),
  },
  // 바위
  stone: {
    bg: 'sand',
    art: (
      <>
        <path d="M16 41 L21 22 L42 15 L50 26 L47 46 L26 51Z" fill="#848b9b" />
        <path d="M21 22 L42 15 L35 30 L16 41Z" fill="#a1a7b5" />
        <path d="M35 30 L47 46 L26 51 L16 41Z" fill="#6e7482" />
      </>
    ),
  },
  // 버섯
  mushroom: {
    bg: 'red',
    art: (
      <>
        <path d="M16 31 C16 20 24 14 32 14 C40 14 48 20 48 31Z" fill="#d96558" />
        <circle cx="25" cy="24" r="2.3" fill={W} />
        <circle cx="34" cy="21" r="2.1" fill={W} />
        <circle cx="39" cy="27" r="1.8" fill={W} />
        <rect x="27" y="30" width="10" height="18" rx="4" fill={W} />
        <ellipse cx="32" cy="50" rx="12" ry="3" fill={W2} opacity=".7" />
      </>
    ),
  },
  // 독버섯
  'poison-mushroom': {
    bg: 'purple',
    art: (
      <>
        <path d="M16 31 C16 20 24 14 32 14 C40 14 48 20 48 31Z" fill="#8f58b3" />
        <circle cx="25" cy="24" r="2.3" fill="#dfe36a" />
        <circle cx="34" cy="21" r="2.1" fill="#dfe36a" />
        <circle cx="39" cy="27" r="1.8" fill="#dfe36a" />
        <rect x="27" y="30" width="10" height="18" rx="4" fill={W} />
        <path d="M30 43 H34 M32 41 V45" stroke={K} strokeWidth="1.6" strokeLinecap="round" />
      </>
    ),
  },
  // 산딸기
  'wild-raspberry': {
    bg: 'pink',
    art: (
      <>
        {[[24,26],[31,24],[38,26],[21,33],[28,32],[35,32],[42,33],[25,39],[32,40],[39,39]].map(([x,y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="4.2" fill={R} />)}
        <path d="M32 18 L26 24 M32 18 L38 24 M32 18 V12" stroke={G} strokeWidth="2.4" strokeLinecap="round" />
        <path d="M25 18 H39" stroke={G} strokeWidth="2" strokeLinecap="round" />
      </>
    ),
  },
  // 물이끼
  'water-moss': {
    bg: 'teal',
    art: (
      <>
        <path d="M13 40 C17 31 24 26 32 26 C40 26 47 31 51 40 C46 47 40 51 32 51 C24 51 18 47 13 40Z" fill="#4f9d6b" />
        <path d="M18 40 C22 35 27 32 32 32 C37 32 42 35 46 40" fill="none" stroke="#83cf99" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M20 44 C24 41 28 39.5 32 39.5 C36 39.5 40 41 44 44" fill="none" stroke="#83cf99" strokeWidth="2" strokeLinecap="round" />
      </>
    ),
  },
  // 잃어버린 머리끈
  'lost-hairband': {
    bg: 'yellow',
    art: (
      <>
        <circle cx="32" cy="32" r="13" fill="none" stroke={BR} strokeWidth="5.5" />
        <path d="M39 24 C43 21 47 21 49 24 C49 29 46 31 41.5 31" fill="none" stroke={R} strokeWidth="3" strokeLinecap="round" />
      </>
    ),
  },
  // 잃어버린 실내화
  'lost-slippers': {
    bg: 'blue',
    art: (
      <>
        <path d="M18 40 C20 31 27 27 35 27 H43 C45 31 45 37 43 43 H21 C19.5 43 18.5 41.8 18 40Z" fill={W} />
        <path d="M24 27 C24 22 28 18 33 18 H39 C39 22 36 27 31 27Z" fill={W2} />
        <path d="M21 43 H44" stroke="#98acc5" strokeWidth="2" strokeLinecap="round" />
      </>
    ),
  },
  // 잃어버린 러브레터
  'lost-love-letter': {
    bg: 'pink',
    art: (
      <>
        <path d="M15 22 H49 V46 H15Z" fill={W} />
        <path d="M15 22 L32 35 L49 22" fill={W2} />
        <path d="M15 46 L27 34 M49 46 L37 34" stroke={W2} strokeWidth="2" />
        <path d="M32 20 C35 16 41 17 42 22 C42 27 37 29 32 34 C27 29 22 27 22 22 C23 17 29 16 32 20Z" fill={R} />
      </>
    ),
  },
}

// ───────── 자동으로 만들어 주는 기본 그림 (kind 별) ─────────
const AUTO_ART = {
  food: (
    <>
      <circle cx="32" cy="32" r="15" fill={W} />
      <path d="M21 26 A13 13 0 0 1 30 19" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" opacity=".6" />
      <path d="M44 28 L53 22 V42 L44 36Z M20 28 L11 22 V42 L20 36Z" fill={W2} />
    </>
  ),
  drink: (
    <>
      <path d="M28 12 H36 V19 L41 25 V51 a2.5 2.5 0 0 1 -2.5 2.5 H25.5 A2.5 2.5 0 0 1 23 51 V25 L28 19Z" fill={W} />
      <rect x="23" y="33" width="18" height="12" fill={W2} />
      <rect x="27" y="9.5" width="10" height="4" rx="1.5" fill={Y} />
    </>
  ),
  gear: (
    <>
      <path d="M22 14 L32 20 L42 14 L54 22 L48 32 L43 29 V52 H21 V29 L16 32 L10 22Z" fill={W} />
      <path d="M26 14 L32 24 L38 14" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinejoin="round" opacity=".7" />
      <rect x="21" y="40" width="22" height="4" fill={W2} />
    </>
  ),
  material: (
    <>
      <path d="M32 11 L47 25 L40 52 H24 L17 25Z" fill={W} />
      <path d="M32 11 L47 25 H17Z" fill={W2} />
      <path d="M32 25 L40 52 M32 25 L24 52" stroke={W2} strokeWidth="1.6" fill="none" />
    </>
  ),
  tool: (
    <>
      <path d="M42 11 L52 21 L25 48 L16 50 L18 41Z" fill={W} />
      <path d="M42 11 L47 16 L20 43 L18 41Z" fill={W2} />
      <circle cx="46" cy="18" r="2" fill={Y} />
    </>
  ),
}
const AUTO_DEFAULT_ART = (
  <>
    <rect x="17" y="21" width="30" height="26" rx="4" fill={W} />
    <rect x="17" y="21" width="30" height="8" rx="3" fill={W2} />
    <rect x="28" y="21" width="8" height="26" fill={Y} />
  </>
)

/** 아이템 하나의 아이콘. item 객체나 id 를 준다. 도감에서 아직 모르는 자리는 locked. */
export default function ItemIcon({ item, id, size = 40, locked = false, className = '' }) {
  const it = item ?? itemOf(id)
  const key = it?.baseId ?? it?.id ?? id ?? '?'
  const px = { width: size, height: size }
  if (!locked && key.startsWith('hwatu-')) {
    const months = ['pine', 'plum', 'cherry', 'black-wisteria', 'orchid', 'peony', 'red-wisteria', 'gwangsan', 'chrysanthemum', 'maple', 'paulownia', 'willow']
    const month = months.indexOf(key.slice(6)) + 1
    if (month) return <span style={{ width: size * .72, height: size, display: 'inline-block', flexShrink: 0 }} className={className} aria-label={it?.name}><HwatuFace card={{ month, kind: 'light', type: 'light', name: it?.name }} /></span>
  }
  if (locked) {
    return (
      <svg viewBox="0 0 64 64" {...px} className={className} aria-hidden>
        <circle cx="32" cy="32" r="32" fill="#8b8f9c" opacity=".35" />
        <text x="32" y="42" textAnchor="middle" fontSize="28" fontWeight="700" fill="#fbf6e9" opacity=".75">?</text>
      </svg>
    )
  }
  const custom = CUSTOM_ICONS[key]
  const bg = custom?.bg ?? AUTO_BG[hash(key) % AUTO_BG.length]
  const seed = hash(key)
  // 신규 아이템도 각자 다른 문양을 갖도록 이름 기반의 고유 플랫 벡터를 생성한다.
  const customShape = (
    <><path d={`M${14+seed%8} 24 L${33+seed%9} ${12+seed%7} L${50-seed%5} 32 L${31+seed%6} ${53-seed%4} L17 46Z`} fill={['#fbf6e9','#efdcad','#f4f1e5'][seed%3]} />
      <circle cx={24+seed%14} cy={27+seed%12} r={5+seed%5} fill={['#d9534f','#4f9d6b','#f5c84c','#6b4a3a'][seed%4]} />
      <path d={`M${22+seed%4} 38 L${38+seed%6} ${26+seed%4} M${21+seed%8} 45 L${40+seed%3} 46`} stroke="#2f3447" strokeWidth="2.6" strokeLinecap="round"/></>
  )
  const art = custom?.art ?? customShape
  return (
    <svg viewBox="0 0 64 64" {...px} className={className} role="img" aria-label={it?.name ?? '아이템'} data-icon-id={key} data-icon-auto={custom ? undefined : '1'}>
      <circle cx="32" cy="32" r="32" fill={BG[bg]} />
      {art}
    </svg>
  )
}

Object.assign(BG, EXTRA_BG)
Object.assign(CUSTOM_ICONS, EXTRA_ICONS, V79_EXTRA_ICONS, V79_ICONS, GARDEN_ITEM_ICONS)
export const CUSTOM_ICON_IDS = Object.keys(CUSTOM_ICONS)
