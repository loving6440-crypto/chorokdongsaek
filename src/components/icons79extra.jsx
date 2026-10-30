import React from 'react'
// v79: 시트의 신규 아이템마다 등록한 독립 플랫 SVG 문양(64x64 원형 배지용).
const C = ['#f5e1a4','#f6f0df','#b8d4ba','#eeb59b','#8eafd2','#d1b5da','#c3b191']
function artFor(id, variant, kind) {
  const main = C[(variant + 1) % C.length]
  const highlight = C[(variant + 3) % C.length]
  const dark = '#3c4255', red = '#c45750', green = '#509c67'
  const shape = {
    leaf: <><path d="M32 53 V19 M32 41 Q19 25 17 20 M32 34 Q46 21 49 14" fill="none" stroke={highlight} strokeWidth="3" strokeLinecap="round"/><ellipse cx="23" cy="27" rx="8" ry="14" transform="rotate(-35 23 27)" fill={main}/><ellipse cx="43" cy="25" rx="7" ry="13" transform="rotate(28 43 25)" fill={main}/><path d="M20 30 L26 22 M42 29 L45 19" stroke={green} strokeWidth="1.6"/></>,
    flower: <><path d="M32 48 V23" stroke={green} strokeWidth="3"/><path d="M32 40 Q19 30 20 42 Q24 45 32 43" fill={green}/>{[0,72,144,216,288].map(deg=><ellipse key={deg} transform={`rotate(${deg} 32 26)`} cx="32" cy="18" rx="5" ry="10" fill={main}/>)}<circle cx="32" cy="26" r="6" fill="#e5b650"/></>,
    root: <><path d="M32 48 L32 24 M32 34 L21 40 M32 38 L43 45" stroke="#b77f52" strokeWidth="6" fill="none" strokeLinecap="round"/><path d="M32 23 Q21 13 18 24 Q22 30 32 26 Q43 13 47 25 Q41 31 32 26" fill={main}/><circle cx="32" cy="21" r="4" fill={highlight}/></>,
    mushroom: <><path d="M15 32 C17 9 47 9 49 32Z" fill={main}/><path d="M28 33 V50 Q32 55 36 50 V33Z" fill="#f4e8d3"/><circle cx="25" cy="23" r="4" fill={highlight}/><circle cx="38" cy="26" r="3" fill={highlight}/></>,
    rock: <><path d="M16 37 L25 16 L40 17 L49 35 L37 52 L22 49Z" fill={main}/><path d="M25 16 L31 37 L16 37Z M40 17 L31 37 L49 35Z" fill={highlight}/><path d="M31 37 L37 52 L22 49 L16 37Z" fill="#8c9cab"/><path d="M31 21 L31 32" stroke="#fff" strokeWidth="2.2" opacity=".7"/></>,
    pot: <><path d="M20 24 C17 20 18 17 24 17 H40 C47 17 48 20 44 24 L42 47 H22Z" fill={main}/><ellipse cx="32" cy="24" rx="13" ry="4" fill={highlight}/><path d="M27 35 Q32 42 37 35" fill="none" stroke={dark} strokeWidth="2.5"/><circle cx="32" cy="37" r="3" fill={red}/></>,
    flame: <><path d="M31 9 C43 22 52 31 43 45 C36 56 24 53 19 43 C12 29 25 20 31 9Z" fill={main}/><path d="M34 24 C39 33 42 42 34 47 C23 52 24 39 34 24Z" fill={highlight}/></>,
    bone: <><path d="M16 23 Q11 19 14 15 Q19 11 23 17 L42 40 Q48 37 51 42 Q55 47 51 51 Q47 55 42 49 L23 29 Q17 33 13 28 Q10 24 16 23Z" fill={main}/><path d="M25 27 L42 44" stroke={highlight} strokeWidth="2"/></>,
    bottle: <><rect x="27" y="12" width="10" height="11" rx="1.5" fill={main}/><rect x="19" y="22" width="26" height="31" rx="5" fill={main}/><rect x="21" y="35" width="22" height="13" rx="2" fill={highlight}/><circle cx="32" cy="40" r="5" fill={red} opacity=".8"/></>,
    food: <><ellipse cx="32" cy="43" rx="21" ry="11" fill={highlight}/><ellipse cx="32" cy="39" rx="18" ry="8" fill="#f3f0e8"/><ellipse cx="32" cy="39" rx="14" ry="6" fill={main}/><circle cx="26" cy="38" r="3" fill={green}/><circle cx="37" cy="40" r="3" fill={red}/><path d="M20 27 Q25 20 31 26 M32 24 Q39 19 44 26" fill="none" stroke={highlight} strokeWidth="2" strokeLinecap="round"/></>,
    gear: <><path d="M18 16 H46 V51 H18Z" fill={main}/><path d="M18 26 L32 34 L46 26" fill="none" stroke={highlight} strokeWidth="3"/><circle cx="32" cy="36" r="6" fill={red}/></>,
    bug: <><ellipse cx="32" cy="32" rx="9" ry="17" fill={main}/><circle cx="32" cy="17" r="7" fill={highlight}/>{[22,30,38,45].map(y=><g key={y} stroke={highlight} strokeWidth="2.4" strokeLinecap="round"><path d={`M24 ${y} L17 ${y-4} M40 ${y} L47 ${y-4}`}/></g>)}<circle cx="29" cy="16" r="1.5" fill={dark}/><circle cx="35" cy="16" r="1.5" fill={dark}/></>,
    other: <><path d="M17 23 L32 13 L48 24 L43 48 L22 51Z" fill={main}/><path d="M17 23 L31 35 L48 24" stroke={highlight} strokeWidth="2" fill="none"/><circle cx="31" cy="35" r="6" fill={highlight}/></>,
  }[kind] ?? <circle cx="32" cy="32" r="15" fill={main}/>
  const extra = variant % 4
  return <><g transform={`rotate(${(variant % 7 - 3) * 5} 32 32)`}>{shape}</g>
   {extra === 0 ? <circle cx="46" cy="18" r="3" fill={highlight}/> : extra === 1 ? <path d="M14 45 L18 50 L23 44" fill="none" stroke={highlight} strokeWidth="2"/> : extra === 2 ? <path d="M46 12 V20 M42 16 H50" stroke="#fff" strokeWidth="2" /> : <circle cx="18" cy="17" r="2" fill={highlight}/>}
  </>
}
export const V79_EXTRA_ICONS = Object.fromEntries([
  ['rice', {bg:'teal', art:artFor('rice', 0, 'root')}], // 쌀
  ['centipede', {bg:'sand', art:artFor('centipede', 1, 'bug')}], // 지네
  ['small-pot', {bg:'blue', art:artFor('small-pot', 2, 'pot')}], // 작은 항아리
  ['lettuce', {bg:'pink', art:artFor('lettuce', 3, 'leaf')}], // 상추
  ['lake-water', {bg:'green', art:artFor('lake-water', 4, 'bottle')}], // 청화물
  ['cherry-branch', {bg:'purple', art:artFor('cherry-branch', 5, 'leaf')}], // 벚꽃나무 가지
  ['alcohol-lamp', {bg:'orange', art:artFor('alcohol-lamp', 6, 'flame')}], // 알코올 램프
  ['cloth-scrap', {bg:'yellow', art:artFor('cloth-scrap', 7, 'other')}], // 자투리 천조각
  ['nail', {bg:'navy', art:artFor('nail', 8, 'other')}], // 못
  ['sugar', {bg:'red', art:artFor('sugar', 9, 'pot')}], // 설탕
  ['dandelion', {bg:'teal', art:artFor('dandelion', 10, 'leaf')}], // 민들레
  ['rabbit-fur', {bg:'sand', art:artFor('rabbit-fur', 11, 'bone')}], // 토끼 털뭉치
  ['gogok', {bg:'blue', art:artFor('gogok', 12, 'rock')}], // 곡옥
  ['pinecone', {bg:'pink', art:artFor('pinecone', 13, 'root')}], // 솔방울
  ['crystal', {bg:'green', art:artFor('crystal', 14, 'rock')}], // 수정
  ['bone-fragment', {bg:'purple', art:artFor('bone-fragment', 15, 'bone')}], // 뼛조각
  ['waning-flower', {bg:'orange', art:artFor('waning-flower', 16, 'flower')}], // 그믐꽃
  ['crescent-flower', {bg:'yellow', art:artFor('crescent-flower', 17, 'flower')}], // 초승꽃
  ['cinnabar', {bg:'navy', art:artFor('cinnabar', 18, 'rock')}], // 주사
  ['licorice', {bg:'red', art:artFor('licorice', 19, 'root')}], // 감초
  ['oyster-mushroom', {bg:'teal', art:artFor('oyster-mushroom', 20, 'other')}], // 느타리버섯
  ['rice-seeds', {bg:'sand', art:artFor('rice-seeds', 21, 'other')}], // 볍씨 주머니
  ['boar-tusk', {bg:'blue', art:artFor('boar-tusk', 22, 'bone')}], // 멧돼지 송곳니
  ['fern', {bg:'pink', art:artFor('fern', 23, 'leaf')}], // 고사리
  ['chwinamul', {bg:'green', art:artFor('chwinamul', 24, 'leaf')}], // 취나물
  ['azalea', {bg:'purple', art:artFor('azalea', 25, 'flower')}], // 진달래
  ['brick', {bg:'orange', art:artFor('brick', 26, 'rock')}], // 벽돌
  ['pebble', {bg:'yellow', art:artFor('pebble', 27, 'rock')}], // 자갈
  ['dokkaebi-flame', {bg:'navy', art:artFor('dokkaebi-flame', 28, 'flame')}], // 도깨비불
  ['sealing-stone', {bg:'red', art:artFor('sealing-stone', 29, 'rock')}], // 봉인석
  ['pearl', {bg:'teal', art:artFor('pearl', 30, 'other')}], // 진주
  ['loofah-fruit', {bg:'sand', art:artFor('loofah-fruit', 31, 'other')}], // 수세미 열매
  ['king-mushroom', {bg:'blue', art:artFor('king-mushroom', 32, 'mushroom')}], // 왕버섯
  ['ginseng', {bg:'pink', art:artFor('ginseng', 33, 'root')}], // 산삼
  ['antler', {bg:'green', art:artFor('antler', 34, 'bone')}], // 녹용
  ['spirit-orb', {bg:'purple', art:artFor('spirit-orb', 35, 'other')}], // 혼백구슬
  ['bat-wing', {bg:'orange', art:artFor('bat-wing', 36, 'bone')}], // 박쥐 날개
  ['starlight', {bg:'yellow', art:artFor('starlight', 37, 'rock')}], // 별빛
  ['web', {bg:'navy', art:artFor('web', 38, 'bug')}], // 거미줄
  ['lost-phone', {bg:'red', art:artFor('lost-phone', 39, 'gear')}], // 누군가 잃어버린 핸드폰
  ['headband', {bg:'teal', art:artFor('headband', 40, 'gear')}], // 기합의 띠
  ['berry-earring', {bg:'sand', art:artFor('berry-earring', 41, 'gear')}], // 뱀딸기 귀걸이
  ['gold-crown', {bg:'blue', art:artFor('gold-crown', 42, 'gear')}], // 금관
  ['bandage', {bg:'pink', art:artFor('bandage', 43, 'gear')}], // 밴드
  ['diary', {bg:'green', art:artFor('diary', 44, 'gear')}], // 일기장
  ['curse-doll', {bg:'purple', art:artFor('curse-doll', 45, 'gear')}], // 저주인형
  ['beginner-godok', {bg:'orange', art:artFor('beginner-godok', 46, 'pot')}], // 초보용 고독
  ['godok', {bg:'yellow', art:artFor('godok', 47, 'pot')}], // 고독
  ['exercise-lamp', {bg:'navy', art:artFor('exercise-lamp', 48, 'flame')}], // 무언가멋진천이꽂힌알코올램프
  ['goblin-mask', {bg:'red', art:artFor('goblin-mask', 49, 'gear')}], // 도깨비 탈
  ['rice-cake', {bg:'teal', art:artFor('rice-cake', 50, 'food')}], // 쑥떡
  ['carp-soup', {bg:'sand', art:artFor('carp-soup', 51, 'food')}], // 잉어탕
  ['charcoal', {bg:'blue', art:artFor('charcoal', 52, 'food')}], // 숯
  ['snakeberry-jam', {bg:'pink', art:artFor('snakeberry-jam', 53, 'bottle')}], // 뱀딸기잼
  ['mushroom-stew', {bg:'green', art:artFor('mushroom-stew', 54, 'food')}], // 버섯전골
  ['king-mushroom-stew', {bg:'purple', art:artFor('king-mushroom-stew', 55, 'food')}], // 왕버섯전골
  ['poison-mushroom-stew', {bg:'orange', art:artFor('poison-mushroom-stew', 56, 'food')}], // 독버섯전골
  ['bibimbap', {bg:'yellow', art:artFor('bibimbap', 57, 'food')}], // 비빔밥
  ['flower-pancake', {bg:'navy', art:artFor('flower-pancake', 58, 'food')}], // 화전
])
