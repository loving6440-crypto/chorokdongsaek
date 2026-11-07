/**
 * v-B.08 — 개척 · 전투로 얻는 재료(적정 레벨이 있는 재료)로 만드는 새 제작법 100개.
 *  공작소 50개(중간 재료 9 · 신체 장비 10 · 장신구 10 · 그 밖의 물건 21), 조리실 50개(중간 재료 8 · 요리 42).
 *  - 중간 재료(재료 태그)를 만든 뒤 그것으로 다시 만드는 2중 · 3중 제작이 있다. (예: 칡뿌리 → 노끈 → 도깨비불 등롱 → 혼백 등불)
 *  - 효과는 아직 붙이지 않았다(설명과 아이콘만). 장비 · 장신구는 착용할 수 있지만 보정이 없다.
 *  - 적정 레벨은 materialLevels.js 가 개척 터 데이터에서 바로 계산한다(재료마다 가장 쉬운 칸 → 제작법은 재료들 중 가장 높은 값).
 *  ic: 아이콘 [모양, 배경, 주색, 보조색] — iconsB08.jsx 가 모양별로 그린다.
 */
const M = (id, name, desc, ic) => ({ id, kind: 'material', tags: ['재료'], name, price: null, desc, effectText: '제작용 재료', effect: {}, battle: false, ic })
const C = (id, name, desc, ic) => ({ id, kind: 'craft', tags: ['완성품'], name, price: null, desc, effectText: '', effect: {}, battle: false, ic })
const F = (id, name, desc, ic) => ({ id, kind: 'food', tags: ['완성품'], name, price: null, desc, effectText: '', effect: {}, battle: false, ic })
const BODY = (id, name, desc, ic) => ({ id, kind: 'gear', slot: 'body', tags: ['완성품', '신체'], name, price: null, desc, effectText: '', effect: {}, bonus: {}, battle: false, ic })
const TRINKET = (id, name, desc, ic) => ({ id, kind: 'gear', slot: 'trinket', tags: ['완성품', '장신구'], name, price: null, desc, effectText: '', effect: {}, bonus: {}, battle: false, ic })

// ───────── 공작소 ─────────
export const B08_WORKSHOP_ITEMS = [
  // 중간 재료 9
  M('twine', '노끈', '칡뿌리 껍질을 비벼 꼰 질긴 끈. 묶을 수 있는 건 다 묶어 보고 싶어진다.', ['cord', 'sand', '#a07d4a', '#6b4a3a']),
  M('yarn-ball', '털실 뭉치', '토끼털과 거미줄을 함께 자아 만든 털실. 거미줄이 들어간 덕에 이상할 만큼 끊어지지 않는다.', ['yarn', 'pink', '#f4efe6', '#c9b8a8']),
  M('pine-ink', '송연묵', '솔방울을 그을려 받은 그을음에 물이끼를 개어 굳힌 먹. 매점 먹보다 향이 훨씬 진하다.', ['inkstick', 'navy', '#2f3447', '#a07d4a']),
  M('red-pigment', '붉은 꽃물', '초승꽃과 그믐꽃을 함께 짜낸 붉은 물. 굳기 전에 쓰지 않으면 꽃이 다시 오므라든 것처럼 거뭇해진다.', ['dish', 'sand', '#c0392b', '#e8d8c3']),
  M('crystal-bead', '수정 구슬', '수정을 물이끼로 문질러 둥글게 간 구슬. 들여다보면 내 얼굴이 거꾸로 비친다.', ['orb', 'teal', '#dff3f7', '#9fd3df']),
  M('jujube-plaque', '벽조목 패', '벽조목을 조각칼로 다듬어 만든 손바닥만 한 패. 잡귀가 이 패만 보면 슬금슬금 피한다.', ['plaque', 'orange', '#8a5a3c', '#f5c84c']),
  M('feather-bundle', '깃털 다발', '멧비둘기 깃과 꿩 깃을 가지런히 묶은 다발. 바람이 불면 혼자 날아가려 든다.', ['feathers', 'blue', '#c9a46a', '#f4efe6']),
  M('seal-powder', '봉인 가루', '봉인석과 뼛조각을 함께 빻은 잿빛 가루. 손가락에 묻으면 한동안 감각이 둔해진다.', ['powder', 'navy', '#b8b8c4', '#e8e8f0']),
  M('talisman-ink', '부적 먹물', '송연묵을 붉은 꽃물에 갈아 낸 검붉은 먹물. 이걸로 쓴 획은 마르고 나서도 미묘하게 꿈틀거린다.', ['ink', 'red', '#5a1f24', '#c0392b']),

  // 그 밖의 물건 21
  C('pebble-sling', '돌팔매 주머니', '자갈돌을 잔뜩 넣은 주머니. 던지는 것보다 들고 다니는 게 더 힘들다.', ['pouch', 'sand', '#a07d4a', '#8e8e8e']),
  C('cairn-model', '돌탑 모형', '산길의 돌탑을 흉내 내 쌓아 본 작은 탑. 마지막 돌을 올릴 때 숨을 참게 된다.', ['cairn', 'green', '#9a9a9a', '#cfcfcf']),
  C('charm-bundle', '부적 묶음', '바스러지기 직전의 부적 조각을 한지로 감싸 묶은 것. 효험은 반의반이라도 있는 게 낫다.', ['talisman', 'yellow', '#f4e7b8', '#c0392b']),
  C('snakeskin-bookmark', '뱀 허물 책갈피', '반투명한 허물을 한지 사이에 눌러 말린 책갈피. 책을 펼 때마다 흠칫한다.', ['bookmark', 'green', '#d8d2b4', '#8aa36b']),
  C('mugwort-incense', '쑥 향', '쑥을 말려 한지로 돌돌 만 향. 피우면 잡귀보다 사람이 먼저 기침한다.', ['incense', 'green', '#6d8968', '#d9d9d9']),
  C('centipede-ward', '지네 부적', '지네 독으로 쓴 부적. 다른 벌레가 오지 않는 대신 이 부적을 만진 사람도 한동안 아무도 오지 않는다.', ['talisman', 'red', '#f4e7b8', '#6b2f2f']),
  C('moss-pot', '물이끼 화분', '벽돌을 파낸 자리에 물이끼를 심은 화분. 기숙사 창가에 두면 방이 조금 덜 건조해진다.', ['pot', 'teal', '#b5653c', '#5f9e5a']),
  C('ink-talisman', '송연묵 부적', '직접 만든 송연묵으로 쓴 부적. 매점 먹으로 쓴 것보다 글씨에 힘이 붙는다.', ['talisman', 'navy', '#f4e7b8', '#2f3447']),
  C('yarn-doll', '털실 인형', '털실을 감아 만든 작은 인형. 이상하게 만든 사람을 닮는다.', ['doll', 'pink', '#f4efe6', '#c97b8a']),
  C('badger-brush', '오소리털 붓', '오소리 털을 매어 만든 붓. 빳빳해서 부적 획이 끊기지 않는다.', ['brush', 'sand', '#6b4a3a', '#2f3447']),
  C('cinnabar-paste', '주사 인주', '주사를 물이끼로 갠 붉은 인주. 도장을 찍으면 종이가 살짝 따뜻해진다.', ['seal', 'red', '#c0392b', '#f4e7b8']),
  C('ghostfire-lantern', '도깨비불 등롱', '한지 등롱 속에 도깨비불을 가둬 노끈으로 매단 것. 기름이 필요 없는 대신 가끔 혼자 산책을 나간다.', ['lantern', 'navy', '#f4e7b8', '#6ad0ff']),
  C('sealing-talisman', '봉인 부적', '봉인 가루를 붉은 꽃물에 섞어 쓴 부적. 붙이는 순간 주변 공기가 한 겹 무거워진다.', ['talisman', 'purple', '#f4e7b8', '#7a2f3a']),
  C('imugi-tag', '이무기 비늘 호패', '이무기 비늘을 박아 넣은 나무 호패. 물가에 가면 비늘이 저 혼자 파르르 떤다.', ['tag', 'teal', '#8a5a3c', '#7fd6c2']),
  C('wolf-fang-charm', '늑대 송곳니 부적', '늑대 송곳니에 붉은 꽃물로 주문을 새긴 부적. 밤길에 쥐고 있으면 뒤를 덜 돌아보게 된다.', ['fang', 'red', '#f4efe6', '#c0392b']),
  C('jujube-amulet', '벽조목 호부', '벽조목 패에 부적 먹물로 수호 문자를 새긴 호부. 잡귀가 보면 먼 길을 돌아간다.', ['plaque', 'yellow', '#8a5a3c', '#5a1f24']),
  C('hawk-quill', '매 깃털 깃펜', '매의 꼬리깃을 깎아 송연묵을 찍어 쓰는 깃펜. 글씨가 저절로 날렵해진다.', ['quill', 'blue', '#8a6a4a', '#2f3447']),
  C('soul-lantern', '혼백 등불', '도깨비불 등롱 안에 혼백구슬을 넣은 등불. 불빛 아래에서는 그림자가 하나 더 생긴다.', ['lantern', 'purple', '#f4e7b8', '#b9a6ff']),
  C('serpent-chest', '황구렁이 비늘 함', '벽조목 패에 황구렁이 비늘을 덮어 짠 작은 함. 넣어 둔 것이 줄어들지 않는다는 소문이 있다.', ['chest', 'yellow', '#8a5a3c', '#f5c84c']),
  C('fortune-talisman', '오복 부적', '오복 날개막을 부적 먹물로 한지에 붙여 쓴 부적. 빛에 비추면 다섯 빛깔이 차례로 돈다.', ['talisman', 'orange', '#f4e7b8', '#8f7cc4']),
  C('turtle-oracle', '천년거북 점판', '천년거북 등딱지에 붉은 꽃물로 별자리를 그어 만든 점판. 묻기도 전에 답이 떠오를 때가 있다.', ['board', 'green', '#7a6a3a', '#c0392b']),

  // 신체 장비 10 (착용 보정은 아직 없다)
  BODY('straw-raincape', '도롱이', '칡뿌리와 고사리 줄기를 엮은 비옷. 비는 막아 주는데 입은 사람이 반쯤 덤불처럼 보인다.', ['cape', 'green', '#9a8a4a', '#6d8968']),
  BODY('foxfur-coat', '여우털 두루마기', '여우 꼬리털을 털실로 덧댄 두루마기. 입고 있으면 어쩐지 말솜씨가 늘 것 같다.', ['robe', 'orange', '#d9822b', '#f4efe6']),
  BODY('talisman-robe', '부적 도포', '봉인 부적을 안감에 꿰매 넣은 도포. 걸을 때마다 종이 바스락거리는 소리가 난다.', ['robe', 'yellow', '#f4e7b8', '#7a2f3a']),
  BODY('bat-cape', '박쥐 날개 망토', '박쥐 날개를 노끈으로 이어 붙인 망토. 펼치면 근사하지만 접을 때 손이 많이 간다.', ['cape', 'navy', '#3b3550', '#8f7cc4']),
  BODY('marten-vest', '담비털 배자', '담비 털로 깃을 두른 배자. 담비에게는 미안하지만 정말 따뜻하다.', ['vest', 'sand', '#8a5a3c', '#e6d3b3']),
  BODY('hawk-cheollik', '매 깃털 철릭', '매 깃털을 어깨에 덧댄 철릭. 입으면 등이 저절로 펴진다.', ['robe', 'blue', '#4d5a7a', '#c9a46a']),
  BODY('bearfur-overcoat', '곰털 덧옷', '반달 무늬 곰 털을 털실로 누빈 덧옷. 한겨울 산꼭대기에서도 땀이 난다.', ['vest', 'navy', '#2f2a2a', '#f4efe6']),
  BODY('frost-hansam', '얼음꽃 한삼', '얼음꽃을 털실에 엮어 소매 끝에 단 옷. 소매를 흔들면 서리가 흩날린다.', ['robe', 'teal', '#e8f6ff', '#9fd3df']),
  BODY('weasel-galot', '흰족제비 갖옷', '눈처럼 흰 족제비 털로 지은 갖옷. 눈밭에 서면 정말로 사라진다.', ['robe', 'purple', '#fbfbff', '#c9c4e8']),
  BODY('crane-robe', '학창의', '학 깃털을 깃과 소매에 두른 학창의. 입으면 말수가 줄고 오래 살고 싶어진다.', ['robe', 'sand', '#fbfbf5', '#2f3447']),

  // 장신구 10 (착용 보정은 아직 없다)
  TRINKET('clover-crown', '토끼풀 화관', '토끼풀과 민들레를 엮은 화관. 쓰고 있으면 누가 와서 네잎을 찾아 준다.', ['wreath', 'navy', '#8fd18c', '#f5d76e']),
  TRINKET('berry-ribbon', '산딸기 댕기', '산딸기 물을 들인 오색실 댕기. 달콤한 냄새에 벌이 따라온다.', ['ribbon', 'red', '#e0566a', '#f4efe6']),
  TRINKET('deer-tooth-necklace', '고라니 이빨 목걸이', '고라니 이빨을 노끈에 꿴 목걸이. 걸을 때마다 달그락거려 몰래 다니기는 글렀다.', ['necklace', 'sand', '#f4efe6', '#a07d4a']),
  TRINKET('feather-norigae', '깃털 노리개', '깃털 다발을 오색실 술에 단 노리개. 바람이 불면 주인보다 먼저 들뜬다.', ['norigae', 'blue', '#c9a46a', '#e05b5b']),
  TRINKET('crystal-bracelet', '수정 구슬 팔찌', '수정 구슬을 노끈에 꿴 팔찌. 햇빛 아래에서 손목에 작은 무지개가 생긴다.', ['bracelet', 'teal', '#dff3f7', '#a07d4a']),
  TRINKET('gogok-norigae', '곡옥 노리개', '곡옥에 오색실 술을 단 노리개. 옛 무당들이 차던 것과 꼭 닮았다.', ['norigae', 'green', '#4f9d6b', '#e05b5b']),
  TRINKET('jujube-hairpin', '벽조목 비녀', '벽조목 패를 깎아 진주를 박은 비녀. 꽂고 있으면 악몽을 덜 꾼다고 한다.', ['hairpin', 'orange', '#8a5a3c', '#f4efe6']),
  TRINKET('magpie-hairpiece', '흰까치 깃 머리꽂이', '흰까치 깃에 수정 구슬을 단 머리꽂이. 좋은 소식이 오면 깃이 먼저 들썩인다.', ['hairpiece', 'blue', '#fbfbff', '#9fd3df']),
  TRINKET('toad-ring', '금두꺼비 반지', '금두꺼비 허물로 수정 구슬을 감싼 반지. 끼고 있으면 길에서 동전을 자주 줍는다.', ['ring', 'yellow', '#f5c84c', '#dff3f7']),
  TRINKET('dragon-hatstring', '용마 갈기 갓끈', '용마 갈기와 해동청 깃에 진주를 꿴 갓끈. 바람 한 점 없는 날에도 혼자 휘날린다.', ['hatstring', 'navy', '#2f3447', '#f4efe6']),
]

// ───────── 조리실 ─────────
export const B08_KITCHEN_ITEMS = [
  // 중간 재료 8
  M('lake-broth', '청화 육수', '청화물에 버섯을 우려낸 맑은 육수. 이것만 있으면 무엇이든 국이 된다.', ['bowl', 'teal', '#e8f1f2', '#b08a5a']),
  M('acorn-flour', '도토리 가루', '도토리를 말려 곱게 빻은 가루. 다람쥐가 보면 화낼 양이다.', ['jar', 'sand', '#a07d4a', '#e6d3b3']),
  M('chestnut-syrup', '밤 조청', '밤과 볍씨를 오래 고아 낸 끈적한 조청. 숟가락이 꽂힌 채로 서 있다.', ['jar', 'orange', '#b5651d', '#f5c84c']),
  M('herb-decoction', '약재 달임물', '당귀 · 감초 · 도라지를 함께 달인 물. 냄새만 맡아도 몸이 좋아지는 기분이다. 맛은 묻지 말자.', ['jar', 'green', '#6b4a2a', '#c9b37a']),
  M('wild-grape-juice', '머루즙', '머루를 짓이겨 거른 진한 보랏빛 즙. 포도즙과 헷갈리면 머루가 서운해한다.', ['cup', 'purple', '#5b2a6e', '#f4efe6']),
  M('barley-flour', '보릿가루', '보리 씨앗을 볶아 빻은 가루. 보리차가 되는 꿈은 이렇게 끝났다.', ['jar', 'yellow', '#c9a46a', '#f4efe6']),
  M('blanched-greens', '나물 데침', '취나물과 고사리를 함께 데쳐 물기를 짠 것. 이대로 먹어도 되지만 참는 게 좋다.', ['plate', 'green', '#5f8f4a', '#f4efe6']),
  M('wheat-flour', '밀가루', '밀 씨앗을 빻아 체에 친 가루. 열 알로 이만큼 나온 게 신기하다.', ['jar', 'sand', '#f4efe6', '#c9a46a']),

  // 요리 42 (효과는 아직 없다)
  F('pickled-raspberry', '산딸기 절임', '산딸기를 소금물에 절인 것. 새콤하다 못해 눈이 감긴다.', ['jar', 'red', '#d83a52', '#f4efe6']),
  F('barley-gaetteok', '보리개떡', '보릿가루에 산딸기를 박아 찐 투박한 떡. 생긴 건 그래도 맛은 정직하다.', ['plate', 'yellow', '#a8874a', '#d83a52']),
  F('grilled-mushroom', '버섯 구이', '버섯을 꼬치에 꿰어 구운 것. 먹어도 되는 버섯만 골랐는지 한 번 더 확인하자.', ['skewer', 'orange', '#b08a5a', '#6b4a3a']),
  F('carrot-mushroom-stirfry', '당근 버섯 볶음', '당근과 버섯을 콩기름에 볶은 반찬. 흐물파와 딱딱파가 이 접시 앞에서는 휴전한다.', ['plate', 'orange', '#e8742b', '#b08a5a']),
  F('snakeberry-punch', '뱀딸기 화채', '뱀딸기와 산딸기를 띄운 화채. 뱀딸기만 남기는 사람이 꼭 있다.', ['cup', 'pink', '#f4c6cf', '#d83a52']),
  F('dandelion-tea', '민들레 차', '민들레를 말려 청화물에 우린 차. 쌉싸름해서 졸음이 달아난다.', ['cup', 'yellow', '#c9a24a', '#f5d76e']),
  F('lake-mushroom-soup', '청화 버섯국', '청화 육수에 버섯을 듬뿍 넣은 국. 맑은 국물에 버섯이 동동 떠 있다.', ['bowl', 'teal', '#e8f1f2', '#b08a5a']),
  F('cabbage-soup', '배춧국', '청화 육수에 배추를 넣고 끓인 국. 배추가 포기한 덕에 우리는 국을 먹는다.', ['bowl', 'green', '#e8f1f2', '#8fbf6a']),
  F('clover-salad', '토끼풀 샐러드', '토끼풀과 상추, 방울토마토를 버무린 샐러드. 토끼가 보면 줄을 선다.', ['plate', 'green', '#7fb77e', '#e0453a']),
  F('ssukbeomuri', '쑥버무리', '쑥과 보릿가루를 버무려 찐 떡. 향이 진해서 한 입이면 봄이 온다.', ['plate', 'green', '#6d8968', '#e6d3b3']),
  F('mugwort-potato-pancake', '쑥 감자전', '감자를 갈아 쑥을 넣고 콩기름에 부친 전. 가장자리가 바삭할 때 먹어야 한다.', ['pancake', 'yellow', '#e6c26a', '#6d8968']),
  F('stirfried-fern', '고사리 볶음', '고사리를 콩기름에 달달 볶은 나물. 충분히 삶았는지가 맛을 가른다.', ['plate', 'sand', '#7a5a3a', '#f4efe6']),
  F('greens-sujebi', '나물 수제비', '밀가루 반죽을 뜯어 청화 육수에 나물 데침과 끓인 수제비. 손이 많이 간 만큼 든든하다.', ['bowl', 'sand', '#e8f1f2', '#5f8f4a']),
  F('grilled-carp', '잉어 구이', '잉어에 쑥을 채워 구운 것. 비린내는 쑥이 다 가져갔다.', ['fish', 'orange', '#d98b3a', '#6d8968']),
  F('loofah-namul', '수세미 나물', '어린 수세미 열매를 콩기름에 볶은 나물. 설거지 생각은 잠시 접어 두자.', ['plate', 'green', '#9ac46a', '#f4efe6']),
  F('acorn-jelly', '도토리묵', '도토리 가루를 청화물에 쑤어 굳힌 묵. 젓가락으로 집으면 도망간다.', ['jelly', 'sand', '#7a5a3a', '#a07d4a']),
  F('grilled-king-mushroom', '왕버섯 구이', '왕버섯을 두툼하게 썰어 콩기름에 구운 것. 한 조각이 손바닥만 하다.', ['skewer', 'sand', '#c9a46a', '#6b4a3a']),
  F('dangwi-tea', '당귀 차', '당귀를 청화물에 우린 차. 약 냄새가 진동하지만 몸은 확실히 따뜻해진다.', ['cup', 'green', '#8a6a3a', '#c9b37a']),
  F('chestnut-porridge', '밤죽', '밤을 으깨 볍씨와 함께 쑨 죽. 달큰하고 부드러워서 아플 때 생각난다.', ['bowl', 'orange', '#f0d9a8', '#b5651d']),
  F('doraji-jeonggwa', '도라지 정과', '도라지를 밤 조청에 졸인 정과. 목이 칼칼할 때 하나씩 꺼내 먹는다.', ['plate', 'sand', '#f4efe6', '#c98a2b']),
  F('licorice-taffy', '감초 엿', '감초를 밤 조청에 넣어 굳힌 엿. 약방의 감초가 드디어 주인공이 되었다.', ['candy', 'orange', '#b5651d', '#6b4a2a']),
  F('wild-grape-punch', '머루 화채', '머루즙에 청화물과 산딸기를 띄운 화채. 보랏빛이 예뻐서 마시기 아깝다.', ['cup', 'purple', '#7a3a8e', '#d83a52']),
  F('pearl-dumpling', '진주 경단', '진주 가루를 넣어 빚은 경단을 밤 조청에 굴린 것. 씹을 때마다 은은하게 반짝인다.', ['dumpling', 'pink', '#f4efe6', '#c98a2b']),
  F('arrowroot-tea', '칡차', '칡뿌리를 우린 차. 판 사람의 고생이 국물에 그대로 녹아 있다.', ['cup', 'sand', '#8a6a4a', '#c9b37a']),
  F('sipjeon-tang', '십전대보탕', '약재 달임물에 산삼과 감초를 더 넣고 달인 탕. 한 모금에 열 가지 기운이 돈다고 한다.', ['bowl', 'green', '#4a3420', '#c9b37a']),
  F('grilled-deodeok', '더덕 구이', '더덕을 두드려 펴서 콩기름에 구운 것. 산 냄새가 부엌 가득 퍼진다.', ['skewer', 'red', '#c06a3a', '#f4efe6']),
  F('oyster-mushroom-hotpot', '느타리 전골', '느타리버섯을 청화 육수에 끓인 전골. 버섯끼리 모여 사는 모습이 정겹다.', ['pot', 'orange', '#c9a46a', '#e8f1f2']),
  F('clover-hwajeon', '네잎클로버 화전', '밀가루 반죽에 네잎클로버와 진달래를 올려 부친 화전. 먹으면 운이 좋아질 것 같지만 이미 하나 썼다.', ['pancake', 'pink', '#f4efe6', '#7fb77e']),
  F('flower-rice-cake', '꽃물 떡', '초승꽃과 그믐꽃 물로 물들인 붉은 떡. 너무 붉어서 처음 보는 사람은 놀란다.', ['plate', 'red', '#c0392b', '#f4efe6']),
  F('omija-punch', '오미자 화채', '오미자를 우린 붉은 물에 진달래를 띄운 화채. 다섯 가지 맛이 차례로 지나간다.', ['cup', 'red', '#d83a52', '#f4c6cf']),
  F('songi-rice', '송이 솥밥', '송이버섯을 얹어 지은 솥밥. 뚜껑을 여는 순간 솔숲이 통째로 들어온다.', ['pot', 'sand', '#f4efe6', '#a07d4a']),
  F('dragon-palace-soup', '용궁탕', '이무기 비늘과 잉어를 청화 육수에 끓인 탕. 먹고 나면 물속에서도 숨을 오래 참을 수 있을 것 같다.', ['bowl', 'blue', '#cfe8f0', '#7fd6c2']),
  F('antler-tonic', '녹용 보약', '녹용을 약재 달임물에 넣어 오래 달인 보약. 한 사발이면 사흘은 뛰어다닌다.', ['bowl', 'red', '#4a2a20', '#c9b37a']),
  F('pine-nut-porridge', '잣죽', '잣을 곱게 갈아 볍씨와 쑨 죽. 고소한 맛이 숟가락마다 묻어난다.', ['bowl', 'sand', '#f7f0de', '#c9a46a']),
  F('pine-nut-gangjeong', '잣 강정', '잣을 밤 조청으로 뭉쳐 굳힌 강정. 이 사이에 끼는 건 각오해야 한다.', ['candy', 'yellow', '#e6c26a', '#f4efe6']),
  F('golden-toad-pill', '금두꺼비 환', '금두꺼비 허물에 감초를 섞어 빚은 환. 삼키고 나면 지갑을 한 번 확인하게 된다.', ['pill', 'yellow', '#c9a24a', '#6b4a2a']),
  F('wild-ginseng-jeonggwa', '천종삼 정과', '천종삼을 밤 조청에 오래 졸인 정과. 아까워서 한 번에 다 먹은 사람이 없다.', ['plate', 'orange', '#e6c26a', '#c98a2b']),
  F('frost-bingsu', '얼음꽃 빙수', '얼음꽃을 갈아 머루즙을 끼얹은 빙수. 한겨울에 먹어도 머리가 띵하다.', ['cup', 'teal', '#f0fbff', '#7a3a8e']),
  F('somdari-tea', '솜다리 꽃차', '솜다리를 청화물에 띄운 꽃차. 높은 곳의 공기 맛이 난다.', ['cup', 'blue', '#fbfbff', '#c9d8e8']),
  F('fortune-pill', '오복 환', '오복 날개막을 약재 달임물에 개어 빚은 환. 다섯 가지 복 중 무엇이 올지는 먹어 봐야 안다.', ['pill', 'purple', '#8f7cc4', '#f5c84c']),
  F('elixir-of-youth', '불로장생탕', '불로초와 천종삼을 약재 달임물에 함께 달인 탕. 이걸 끓인 솥은 다시는 평범한 솥이 될 수 없다.', ['bowl', 'red', '#7a1f1f', '#f5c84c']),
  F('turtle-shell-tonic', '귀갑 보약', '천년거북 등딱지를 약재 달임물에 넣어 고아 낸 보약. 한 숟갈마다 별자리 하나만큼의 세월이 담겼다.', ['bowl', 'green', '#3a3a20', '#c9b37a']),
]

/** [결과, [[재료, 개수]...]] → 제작법 */
const R = (prefix) => (result, inputs) => ({ id: `${prefix}-${result}`, result, inputs })
const w = R('r8')
const k = R('cook8')

export const B08_RECIPES = [
  // 중간 재료
  w('twine', [['arrowroot', 3]]),
  w('yarn-ball', [['rabbit-fur', 2], ['web', 2]]),
  w('pine-ink', [['pinecone', 4], ['water-moss', 1]]),
  w('red-pigment', [['crescent-flower', 1], ['waning-flower', 1]]),
  w('crystal-bead', [['crystal', 2], ['water-moss', 2]]),
  w('jujube-plaque', [['lightning-jujube', 2], ['carving-knife', 1]]),
  w('feather-bundle', [['dove-feather', 2], ['pheasant-feather', 2]]),
  w('seal-powder', [['sealing-stone', 1], ['bone-fragment', 2]]),
  w('talisman-ink', [['pine-ink', 1], ['red-pigment', 1]]),
  // 그 밖의 물건
  w('pebble-sling', [['pebble', 5], ['pouch', 1]]),
  w('cairn-model', [['stone', 3], ['pebble', 3]]),
  w('charm-bundle', [['charm-scrap', 4], ['hanji', 1]]),
  w('snakeskin-bookmark', [['snake-skin', 1], ['hanji', 2]]),
  w('mugwort-incense', [['mugwort', 4], ['hanji', 1]]),
  w('centipede-ward', [['centipede', 2], ['charm-scrap', 2], ['brush', 1]]),
  w('moss-pot', [['water-moss', 3], ['brick', 1]]),
  w('ink-talisman', [['pine-ink', 1], ['hanji', 2], ['brush', 1]]),
  w('yarn-doll', [['yarn-ball', 2], ['fine-woodchip', 1]]),
  w('badger-brush', [['badger-fur', 2], ['fine-woodchip', 1]]),
  w('cinnabar-paste', [['cinnabar', 2], ['water-moss', 1]]),
  w('ghostfire-lantern', [['dokkaebi-flame', 1], ['hanji', 3], ['twine', 1]]),
  w('sealing-talisman', [['seal-powder', 1], ['red-pigment', 1], ['hanji', 2]]),
  w('imugi-tag', [['imugi-scale', 1], ['fine-woodchip', 2]]),
  w('wolf-fang-charm', [['wolf-fang', 1], ['red-pigment', 1], ['charm-scrap', 2]]),
  w('jujube-amulet', [['jujube-plaque', 1], ['talisman-ink', 1]]),
  w('hawk-quill', [['hawk-feather', 1], ['pine-ink', 1]]),
  w('soul-lantern', [['spirit-orb', 1], ['ghostfire-lantern', 1]]),
  w('serpent-chest', [['golden-serpent-scale', 1], ['jujube-plaque', 1]]),
  w('fortune-talisman', [['fortune-bat-wing', 1], ['talisman-ink', 1], ['hanji', 2]]),
  w('turtle-oracle', [['turtle-shell', 1], ['red-pigment', 1]]),
  // 신체 장비
  w('straw-raincape', [['arrowroot', 4], ['fern', 3]]),
  w('foxfur-coat', [['fox-fur', 4], ['yarn-ball', 2]]),
  w('talisman-robe', [['sealing-talisman', 1], ['yarn-ball', 3]]),
  w('bat-cape', [['bat-wing', 4], ['twine', 2]]),
  w('marten-vest', [['marten-fur', 3], ['yarn-ball', 2]]),
  w('hawk-cheollik', [['hawk-feather', 3], ['twine', 2]]),
  w('bearfur-overcoat', [['bear-fur', 3], ['yarn-ball', 3]]),
  w('frost-hansam', [['frost-flower', 2], ['yarn-ball', 2]]),
  w('weasel-galot', [['weasel-fur', 3], ['yarn-ball', 2]]),
  w('crane-robe', [['crane-feather', 3], ['yarn-ball', 3]]),
  // 장신구
  w('clover-crown', [['clover-leaf', 5], ['dandelion', 2]]),
  w('berry-ribbon', [['wild-raspberry', 3], ['five-color-thread', 1]]),
  w('deer-tooth-necklace', [['deer-tooth', 2], ['twine', 1]]),
  w('feather-norigae', [['feather-bundle', 1], ['five-color-thread', 2]]),
  w('crystal-bracelet', [['crystal-bead', 2], ['twine', 1]]),
  w('gogok-norigae', [['gogok', 1], ['five-color-thread', 2], ['twine', 1]]),
  w('jujube-hairpin', [['jujube-plaque', 1], ['pearl', 1]]),
  w('magpie-hairpiece', [['magpie-feather', 2], ['crystal-bead', 1]]),
  w('toad-ring', [['gold-toad-skin', 1], ['crystal-bead', 1]]),
  w('dragon-hatstring', [['dragon-mane', 1], ['haedongcheong-feather', 1], ['pearl', 2]]),
]

export const B08_COOK_RECIPES = [
  // 중간 재료
  k('lake-broth', [['lake-water', 3], ['mushroom', 2]]),
  k('acorn-flour', [['acorn', 5]]),
  k('chestnut-syrup', [['chestnut', 3], ['rice-grain', 10]]),
  k('herb-decoction', [['dangwi', 2], ['licorice', 2], ['doraji', 1]]),
  k('wild-grape-juice', [['wild-grape', 4]]),
  k('barley-flour', [['barley-seed', 10]]),
  k('blanched-greens', [['chwinamul', 2], ['fern', 2]]),
  k('wheat-flour', [['wheat-seed', 10]]),
  // 요리
  k('pickled-raspberry', [['wild-raspberry', 6]]),
  k('barley-gaetteok', [['barley-flour', 1], ['wild-raspberry', 2]]),
  k('grilled-mushroom', [['mushroom', 3]]),
  k('carrot-mushroom-stirfry', [['carrot', 2], ['mushroom', 2], ['soybean-oil', 1]]),
  k('snakeberry-punch', [['snake-berry', 3], ['wild-raspberry', 2]]),
  k('dandelion-tea', [['dandelion', 3], ['lake-water', 1]]),
  k('lake-mushroom-soup', [['lake-broth', 1], ['mushroom', 2]]),
  k('cabbage-soup', [['cabbage', 2], ['lake-broth', 1]]),
  k('clover-salad', [['clover-leaf', 3], ['lettuce', 2], ['cherry-tomato', 2]]),
  k('ssukbeomuri', [['mugwort', 3], ['barley-flour', 1]]),
  k('mugwort-potato-pancake', [['potato', 3], ['mugwort', 1], ['soybean-oil', 1]]),
  k('stirfried-fern', [['fern', 3], ['soybean-oil', 1]]),
  k('greens-sujebi', [['wheat-flour', 1], ['blanched-greens', 1], ['lake-broth', 1]]),
  k('grilled-carp', [['carp', 2], ['mugwort', 1]]),
  k('loofah-namul', [['loofah-fruit', 2], ['soybean-oil', 1]]),
  k('acorn-jelly', [['acorn-flour', 1], ['lake-water', 2]]),
  k('grilled-king-mushroom', [['king-mushroom', 1], ['soybean-oil', 1]]),
  k('dangwi-tea', [['dangwi', 2], ['lake-water', 1]]),
  k('chestnut-porridge', [['chestnut', 4], ['rice-grain', 10]]),
  k('doraji-jeonggwa', [['doraji', 3], ['chestnut-syrup', 1]]),
  k('licorice-taffy', [['licorice', 2], ['chestnut-syrup', 1]]),
  k('wild-grape-punch', [['wild-grape-juice', 1], ['lake-water', 1], ['wild-raspberry', 2]]),
  k('pearl-dumpling', [['pearl', 1], ['chestnut-syrup', 1], ['rice-grain', 10]]),
  k('arrowroot-tea', [['arrowroot', 2], ['lake-water', 1]]),
  k('sipjeon-tang', [['herb-decoction', 1], ['ginseng', 1], ['licorice', 1]]),
  k('grilled-deodeok', [['deodeok', 3], ['soybean-oil', 1]]),
  k('oyster-mushroom-hotpot', [['oyster-mushroom', 3], ['lake-broth', 1]]),
  k('clover-hwajeon', [['clover', 1], ['azalea', 1], ['wheat-flour', 1]]),
  k('flower-rice-cake', [['crescent-flower', 1], ['waning-flower', 1], ['rice-grain', 10]]),
  k('omija-punch', [['omija', 3], ['lake-water', 1], ['azalea', 1]]),
  k('songi-rice', [['songi', 2], ['rice-grain', 10]]),
  k('dragon-palace-soup', [['imugi-scale', 1], ['carp', 2], ['lake-broth', 1]]),
  k('antler-tonic', [['antler', 1], ['herb-decoction', 1]]),
  k('pine-nut-porridge', [['pine-nut', 3], ['rice-grain', 10]]),
  k('pine-nut-gangjeong', [['pine-nut', 3], ['chestnut-syrup', 1]]),
  k('golden-toad-pill', [['gold-toad-skin', 1], ['licorice', 2]]),
  k('wild-ginseng-jeonggwa', [['wild-ginseng', 1], ['chestnut-syrup', 1]]),
  k('frost-bingsu', [['frost-flower', 2], ['wild-grape-juice', 1]]),
  k('somdari-tea', [['somdari', 2], ['lake-water', 1]]),
  k('fortune-pill', [['fortune-bat-wing', 1], ['herb-decoction', 1]]),
  k('elixir-of-youth', [['lingzhi', 1], ['wild-ginseng', 1], ['herb-decoction', 1]]),
  k('turtle-shell-tonic', [['turtle-shell', 1], ['herb-decoction', 1]]),
]

export const B08_ITEMS = [...B08_WORKSHOP_ITEMS, ...B08_KITCHEN_ITEMS].map(({ ic, ...it }) => it)
export const B08_ICON_SPECS = Object.fromEntries([...B08_WORKSHOP_ITEMS, ...B08_KITCHEN_ITEMS].map((it) => [it.id, it.ic]))
