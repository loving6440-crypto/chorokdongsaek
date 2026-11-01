// v79.0.7 추가 아이콘 (64×64 플랫 원형 배지 안쪽 그림). 어둠, 그리고 전용 그림이 없던 염색약·영양제.
const W = '#fbf6e9'
const K = '#2f3447'
export const V79B_ICONS = {
  // 어둠: 동굴의 암령에게서 얻는, 손에 쥘 수 있는 어둠 한 줌
  darkness: { bg: 'navy', art: <>
    <path d="M32 13C21 13 15 22 16 31C17 41 22 50 32 51C42 50 47 41 48 31C49 22 43 13 32 13Z" fill="#1f2333" />
    <path d="M24 22Q30 18 37 21" fill="none" stroke="#4d5a7a" strokeWidth="2.4" strokeLinecap="round" />
    <path d="M21 34Q24 44 32 46" fill="none" stroke="#4d5a7a" strokeWidth="2" strokeLinecap="round" opacity=".8" />
    <circle cx="27" cy="31" r="2.6" fill="#c9d3ef" />
    <circle cx="37" cy="31" r="2.6" fill="#c9d3ef" />
    <circle cx="40" cy="22" r="1.2" fill="#c9d3ef" opacity=".6" />
    <circle cx="22" cy="41" r="1" fill="#c9d3ef" opacity=".5" />
  </> },
  // 염색약: 다섯 빛깔이 담긴 작은 병
  dye: { bg: 'purple', art: <>
    <rect x="27" y="11" width="10" height="6" rx="1.5" fill={K} />
    <path d="M26 17H38V22L45 31V48Q45 52 41 52H23Q19 52 19 48V31L26 22Z" fill={W} />
    <path d="M20 36H44V48Q44 51 41 51H23Q20 51 20 48Z" fill="#cf5757" />
    <rect x="20" y="36" width="5" height="15" fill="#e6b94f" />
    <rect x="25" y="36" width="5" height="15" fill="#7fb77e" />
    <rect x="30" y="36" width="5" height="15" fill="#78b4d8" />
    <rect x="35" y="36" width="5" height="15" fill="#e08aa0" />
  </> },
  // 영양제: 알약 두 알
  nutrient: { bg: 'teal', art: <>
    <g transform="rotate(-35 26 30)"><rect x="14" y="24" width="26" height="12" rx="6" fill={W} /><path d="M27 24H34Q40 24 40 30Q40 36 34 36H27Z" fill="#e5985a" /></g>
    <g transform="rotate(25 40 40)"><rect x="29" y="35" width="22" height="10" rx="5" fill={W} /><path d="M40 35H46Q51 35 51 40Q51 45 46 45H40Z" fill="#cf5757" /></g>
  </> },
}
