// v-B.18 퀘스트 글 · 데이터. 대사 · 지문은 모두 여기서 고친다.
//
// 글 안의 자리표:
//   {enemy} 적 이름 · {item} 물건 이름 · {n} 필요한 수 · {unit} 세는 말(기본 '개') · {have} 지금 가진 수 · {left} 남은 수
//   {where} 그 적을 만나는 곳 · {name} 캐릭터 이름
//   받침에 맞춰 조사를 붙이려면 {item|을} · {enemy|이} 처럼 쓴다(을/를 · 이/가 · 은/는 · 과/와 · 으로/로).
//
// 목표(goal):
//   { type: 'kill', enemy: 'id', n }            그 적을 n번 쓰러뜨린다 (받은 뒤부터 센다)
//   { type: 'kill', tierEnemy: true, n }        플레이어 단계의 적 하나(혼자 싸우는 적)를 골라 n번 · easier: true 면 한 단계 아래
//   { type: 'deliver', item: 'id', n }          건넬 때 소지품에서 n개가 빠진다
//   { type: 'deliver', pool: [[id, n], …] }     지금 수준에서 구할 수 있는 것 중 하나를 고른다
//   { type: 'play', n }                         도깨비 농장에서 도깨비들과 n판 놀기 (이기든 지든)
//   { type: 'pioneer', n }                      개척 터에 n번 들어가기
//   { type: 'visit', key, where }               산 탐사 등에서 그 장소에 한 번 가 보기
// relay: { to: 'bari'|'danae', button, caption, line } → 납품 물건을 그 사람에게 직접 전한 뒤(line 은 받은 사람의 반응),
//        부탁한 사람에게 [보고한다]로 마친다. relayed: 전하고 돌아왔을 때 부탁한 사람의 말.
// needHave: true → 그 물건을 지금 갖고 있을 때만 부탁한다(이동 중에 우연히 줍는 물건 등).
// minS / maxS: 이 수준(모든 스탯 평균)일 때만 나온다.

// ───────── 1순위 · 바리 (뒷산 · 산 탐사 · 오른길 · 캠핑장, 오후 6시 ~ 오전 6시) ─────────
// 하룻밤에 한 건. 도깨비 증표 1~2개(지금 단계에 맞는 적 · 구하기 어려운 물건이면 2개).
export const BARI_NPC = { id: 'bari', name: '바리', faces: { plain: '/bari.png', smile: '/bari-smile.png', surprise: '/bari-surprise.png' } }

export const BARI_LINES = {
  ask: { face: 'plain', text: '아, 요즘 교내의 도깨비들이 영 말썽이라⋯⋯. 오늘 밤에도 부탁드릴 일이 하나 있어요.' },
  declined: { face: 'smile', text: '괜찮아요! 오늘 밤 안에 마음이 바뀌면 다시 말 걸어 주세요. 저는 여기 있을게요.' },
  doneTonight: { face: 'smile', text: '오늘 밤 부탁은 여기까지예요. 내일 밤에 다시 와 주실래요? 도깨비들도 이제 잘 시간이거든요.' },
  abandoned: { face: 'plain', text: '아⋯⋯ 괜찮아요. 무리하지 마세요. 오늘 밤 일은 제가 어떻게든 해 볼게요.' },
  full: { face: 'surprise', text: '앗, 소지품이 꽉 찼네요. 증표 넣을 자리만 비워 주시면 바로 드릴게요!' },
}

export const BARI_QUESTS = [
  {
    id: 'bari-mongdang', title: '빗자루 도둑', maxS: 14,
    goal: { type: 'kill', enemy: 'mongdangbi', n: 2 },
    offer: { face: 'surprise', text: '아, 마침 잘 오셨어요! 몽당비 도깨비들이 기숙사 빗자루를 죄다 물고 가서 신발장 앞이 난리예요. {where}에 숨어 있을 테니까⋯⋯ {n}번만 혼쭐을 내 주실래요? 너무 세게는 말고요!' },
    accept: { face: 'smile', text: '고마워요! 몽당비는 겁이 많아서, 몇 번 혼나면 빗자루를 슬쩍 돌려놓을 거예요.' },
    progress: { face: 'plain', text: '몽당비 도깨비는 아직 {left}번 남았어요. {where}, 기억하시죠?' },
    done: { face: 'smile', text: '빗자루가 하나둘 돌아오고 있대요! 사감 선생님도 한숨 돌리셨고요. 이거, 도깨비들이 미안하다고 맡긴 증표예요.' },
  },
  {
    id: 'bari-yagwang', title: '신발장 소동', maxS: 14,
    goal: { type: 'kill', enemy: 'yagwanggwi', n: 2 },
    offer: { face: 'plain', text: '야광귀가 또 신발을 신어 보고 다닌대요. 제 발에 맞는 걸 찾을 때까지 기숙사 신발장을 뒤진다나 봐요⋯⋯. 도깨비들까지 덩달아 신발을 숨기는 바람에 아침마다 맨발로 뛰는 애들이 생겼어요. {n}번만 쫓아내 주세요.' },
    accept: { face: 'smile', text: '네! 체를 걸어 두면 구멍 세느라 정신이 팔린다던데, 그건 제가 해 볼게요.' },
    progress: { face: 'plain', text: '야광귀는 {left}번 남았어요. {where}에서 반짝이는 게 보이면 그 녀석이에요.' },
    done: { face: 'smile', text: '이제 신발장이 조용해요. 도깨비들도 숨긴 신발을 다 돌려줬고요. 여기, 증표예요!' },
  },
  {
    id: 'bari-dokgak', title: '씨름 귀신', minS: 5, maxS: 22,
    goal: { type: 'kill', enemy: 'dokgak-gwi', n: 2 },
    offer: { face: 'surprise', text: '외뿔 달린 독각귀가 길목마다 서서 씨름하자고 학생들을 붙잡는대요. 도깨비들도 무서워서 농장 밖으로 안 나오고요⋯⋯. {n}번만 이겨 주실 수 있어요?' },
    accept: { face: 'smile', text: '다리 걸기를 좋아하니까 발밑 조심하세요!' },
    progress: { face: 'plain', text: '독각귀는 아직 {left}번 더 이겨야 해요. {where}에 있어요.' },
    done: { face: 'smile', text: '독각귀가 졌다고 씩씩대면서 산으로 들어갔대요. 도깨비들이 고맙다고⋯⋯ 이거요.' },
  },
  {
    id: 'bari-heokkaebi', title: '두 개의 그림자', minS: 9, maxS: 30,
    goal: { type: 'kill', enemy: 'heokkaebi', n: 2 },
    offer: { face: 'plain', text: '요즘 밤마다 운동장에 사람 그림자가 둘씩 생긴대요. 하나는 허깨비예요. 도깨비들이 그걸 자기네 친척인 줄 알고 따라다니다가 홀려 버렸어요⋯⋯. {n}번만 흩어 주세요.' },
    accept: { face: 'smile', text: '허깨비는 진짜처럼 보여도 속은 텅 비었어요. 겁먹지 마세요!' },
    progress: { face: 'plain', text: '허깨비가 {left}번 남았어요. {where}예요.' },
    done: { face: 'smile', text: '홀렸던 도깨비들이 정신을 차렸어요! 다들 부끄러워서 증표만 놓고 숨어 버렸지만요.' },
  },
  {
    id: 'bari-bully', title: '겁많은 도깨비들', minS: 12,
    goal: { type: 'kill', tierEnemy: true, n: 2 },
    offer: { face: 'surprise', text: '농장 도깨비들이 겁을 먹고 다 숨어 버렸어요. 알고 보니 {enemy|이} 산 아래까지 내려와서 그런 거래요. {where}에서 {n}번만 쓰러뜨려 주실래요?' },
    accept: { face: 'plain', text: '조심하세요. 저도 밤새 등불은 켜 둘게요.' },
    progress: { face: 'plain', text: '{enemy}, 아직 {left}번 남았어요. {where}에 있어요.' },
    done: { face: 'smile', text: '도깨비들이 하나둘 다시 나오고 있어요! 이건 다들 모아서 드리는 증표예요.' },
  },
  {
    id: 'bari-play', title: '심심한 도깨비들',
    goal: { type: 'play', n: 3 },
    offer: { face: 'plain', text: '도깨비들이 심심하다고 난리예요. 심심한 도깨비는 꼭 장난을 치거든요⋯⋯ 화장실 휴지를 죄다 풀어 놓는다든가요. 도깨비 농장에 가서 {n}판만 같이 놀아 주실래요? 이기든 지든 상관없어요!' },
    accept: { face: 'smile', text: '고마워요! 지면 엄청 좋아하고, 이기면 엄청 분해할 거예요. 둘 다 좋아하는 거예요.' },
    progress: { face: 'plain', text: '놀이가 {left}판 남았어요. 도깨비 농장은 뒷산 왼길에 있어요.' },
    done: { face: 'smile', text: '다들 신나서 밤새 떠들 기세예요. 이번 주 휴지는 무사할 거예요! 여기, 증표요.' },
  },
  {
    id: 'bari-gaetteok', title: '메밀묵 대신',
    goal: { type: 'deliver', item: 'barley-gaetteok', n: 2 },
    offer: { face: 'plain', text: '도깨비들은 원래 메밀묵을 제일 좋아하는데, 학교엔 메밀이 없어서요. 대신 보리개떡을 주면 좋아하더라고요. {n}개만 구해 주실 수 있어요?' },
    accept: { face: 'smile', text: '조리실에서 만들 수 있을 거예요. 단애 학생이 잘 알려 줄 거고요!' },
    progress: { face: 'plain', text: '보리개떡 {n}개요. 지금 {have}개 갖고 계세요.' },
    done: { face: 'smile', text: '와, 따끈해요! 도깨비들이 줄을 섰어요⋯⋯ 저도 하나 먹어도 될까요? 아, 증표 먼저 드릴게요!' },
  },
  {
    id: 'bari-jelly', title: '도토리묵이라도',
    goal: { type: 'deliver', item: 'acorn-jelly', n: 1, unit: '모' },
    offer: { face: 'plain', text: '메밀묵이 없으면 도토리묵이라도⋯⋯ 하고 한 번 줘 봤는데, 도깨비들이 좋아했어요. 도토리묵 {n}{unit}만 부탁드려도 될까요?' },
    accept: { face: 'smile', text: '탱글탱글한 걸로요! 도깨비들은 젓가락질을 못해서 손으로 먹거든요.' },
    progress: { face: 'plain', text: '도토리묵 {n}{unit}예요. 지금 {have}{unit} 있어요.' },
    done: { face: 'smile', text: '도깨비들이 묵을 들고 춤을 춰요⋯⋯ 저건 기쁘다는 뜻이에요. 증표 받으세요!' },
  },
  {
    id: 'bari-taffy', title: '도깨비 화해시키기',
    goal: { type: 'deliver', item: 'licorice-taffy', n: 1 },
    offer: { face: 'surprise', text: '도깨비들끼리 싸움이 났어요. 화해시키려면 달달한 게 제일이라던데⋯⋯ 감초 엿 {n}개만 있으면 될 것 같아요.' },
    accept: { face: 'smile', text: '엿을 나눠 먹으면 입이 붙어서 싸울 수가 없거든요. 진짜예요!' },
    progress: { face: 'plain', text: '감초 엿 {n}개요. 지금 {have}개 있어요.' },
    done: { face: 'smile', text: '다들 엿 때문에 입을 못 떼요. 대성공이에요! 이거 증표예요.' },
  },
  {
    id: 'bari-gangjeong', title: '도깨비 어르신 대접',
    goal: { type: 'deliver', item: 'pine-nut-gangjeong', n: 1 },
    offer: { face: 'surprise', text: '오래된 도깨비 어르신이 농장에 찾아오셨어요. 대접할 게 마땅치 않아서⋯⋯ 잣 강정 {n}개만 구해 주실 수 있을까요? 어르신이 그걸 제일 좋아하신대요.' },
    accept: { face: 'plain', text: '정말요? 어르신은 까다로우셔서, 아무거나 드리면 방망이로 땅을 치세요⋯⋯.' },
    progress: { face: 'plain', text: '잣 강정 {n}개요. 지금 {have}개 있어요.' },
    done: { face: 'smile', text: '어르신이 수염을 쓰다듬으면서 웃으셨어요! 이건 어르신이 직접 내리신 증표예요.' },
  },
  {
    id: 'bari-flame', title: '떠도는 도깨비불',
    goal: { type: 'deliver', item: 'dokkaebi-flame', n: 3 },
    offer: { face: 'plain', text: '도깨비불이 무리에서 떨어져서 산 곳곳을 떠돌고 있어요. 혼자 떠도는 불은 사람을 홀리거든요⋯⋯. 개척하다 보이면 {n}개만 모아 와 주실래요?' },
    accept: { face: 'smile', text: '손으로 잡아도 안 뜨거워요. 조금 간지러울 뿐이에요!' },
    progress: { face: 'plain', text: '도깨비불 {n}개요. 지금 {have}개 모았어요.' },
    done: { face: 'smile', text: '불들이 제자리로 돌아갔어요. 오늘 밤 산이 조금 더 밝을 거예요. 증표예요!' },
  },
  {
    id: 'bari-rice', title: '쏟아진 볍씨',
    goal: { type: 'deliver', item: 'rice-grain', n: 5, unit: '알' },
    offer: { face: 'surprise', text: '농장 도깨비들이 볍씨 주머니로 공기놀이를 하다가 다 쏟아 버렸대요⋯⋯. 볍씨 {n}{unit}만 다시 모아다 주실래요? 농사를 망치면 도깨비들이 울어요.' },
    accept: { face: 'smile', text: '볍씨 주머니를 열면 볍씨가 나와요. 농장 도깨비들이랑 놀다 보면 주머니도 생기고요.' },
    progress: { face: 'plain', text: '볍씨 {n}{unit}이에요. 지금 {have}{unit} 있어요.' },
    done: { face: 'smile', text: '도깨비들이 볍씨를 한 알 한 알 세고 있어요⋯⋯ 다 셀 때까지 아무것도 안 할 거예요. 증표 먼저 드릴게요.' },
  },
  {
    id: 'bari-thread', title: '풀린 방망이',
    goal: { type: 'deliver', item: 'five-color-thread', n: 3, unit: '타래' },
    offer: { face: 'plain', text: '어떤 도깨비가 방망이 손잡이가 다 풀렸다고 울상이에요. 오색실로 감아 줘야 기운이 돈대요. {n}{unit}만 구해 주실 수 있어요?' },
    accept: { face: 'smile', text: '방망이를 잃어버리면 도깨비는 힘을 못 쓰거든요. 고마워요!' },
    progress: { face: 'plain', text: '오색실 {n}{unit}요. 지금 {have}{unit} 있어요.' },
    done: { face: 'smile', text: '방망이를 휘두르면서 뭐든 나와라 하고 외치는데⋯⋯ 아무것도 안 나와요. 그래도 기분은 좋아 보여요! 증표 받으세요.' },
  },
  {
    id: 'bari-jangseung', title: '부러진 장승',
    goal: { type: 'deliver', item: 'jangseung-piece', n: 2 },
    offer: { face: 'surprise', text: '도깨비들이 장난치다 뒷산 장승 하나를 부러뜨렸어요⋯⋯. 선생님들이 알기 전에 고쳐 놔야 해요. 장승 조각 {n}개만 구해 주세요!' },
    accept: { face: 'plain', text: '쉿, 비밀이에요. 들키면 저도 같이 혼날 거거든요.' },
    progress: { face: 'plain', text: '장승 조각 {n}개요. 지금 {have}개 있어요.' },
    done: { face: 'smile', text: '감쪽같아요! 아무도 모를 거예요⋯⋯ 아마도요. 이건 입막음⋯⋯ 아니, 감사의 증표예요.' },
  },
  {
    id: 'bari-mask', title: '낯가리는 아기 도깨비',
    goal: { type: 'deliver', item: 'goblin-mask', n: 1 },
    offer: { face: 'plain', text: '새로 온 아기 도깨비가 낯을 가려서 아무하고도 안 놀아요. 도깨비 탈을 쓰고 다가가면 친구인 줄 알 거예요. 도깨비 탈 {n}개만 만들어 주실 수 있어요?' },
    accept: { face: 'smile', text: '탈은 나중에 돌려드릴게요⋯⋯ 아마 아기가 안 놓아주겠지만요.' },
    progress: { face: 'plain', text: '도깨비 탈 {n}개요. 지금 {have}개 있어요.' },
    done: { face: 'smile', text: '아기 도깨비가 탈을 보자마자 안겨 왔어요! 탈은⋯⋯ 역시 안 놓아주네요. 대신 증표를 드릴게요.' },
  },
  {
    id: 'bari-lake', title: '호숫가의 울음소리',
    goal: { type: 'visit', key: 'gym:right:lake', where: '뒷산 · 산 탐사 · 오른길 · 청화호수' },
    offer: { face: 'surprise', text: '청화호수 쪽에서 도깨비 울음소리가 들린대요. 물귀신한테 붙잡힌 건 아닌지⋯⋯ 산 탐사로 청화호수에 한 번만 다녀와 주실래요? 물가에는 너무 가까이 가지 마시고요.' },
    accept: { face: 'plain', text: '수면에 비친 얼굴이 웃고 있으면 바로 뒤로 물러나세요. 꼭이요!' },
    progress: { face: 'plain', text: '청화호수에 아직 안 가 보셨어요. 뒷산 오른길이에요.' },
    done: { face: 'smile', text: '아, 개구리였어요? 도깨비들이 개구리랑 노래 시합을 했나 봐요⋯⋯ 놀라게 해서 죄송해요. 증표예요.' },
  },
  {
    id: 'bari-pioneer', title: '까먹은 보물',
    goal: { type: 'pioneer', n: 3 },
    offer: { face: 'plain', text: '도깨비들이 숨겨 둔 보물을 어디 뒀는지 까먹었대요. 산이나 학교 어딘가에 있을 텐데⋯⋯ 개척을 {n}번만 해 주시면 도깨비들이 냄새로 찾아낼 거예요.' },
    accept: { face: 'smile', text: '도깨비들이 졸졸 따라갈 거예요. 신경 쓰지 마세요!' },
    progress: { face: 'plain', text: '개척이 {left}번 남았어요.' },
    done: { face: 'smile', text: '찾았대요! 보물은⋯⋯ 녹슨 숟가락이었어요. 그래도 다들 기뻐해요. 증표 받으세요.' },
  },
]

// ───────── 3순위 · [의뢰] 메뉴의 NPC 부탁 ─────────
// NPC 한 명이 하루에 한 건씩. 보상: 단계에 맞춘 냥 · 영력(+ mult 배) · 그 NPC 호감도 +2.
export const QUEST_NPCS = [
  { id: 'danae', name: '오단애', where: '별관 2층 · 조리실', faces: { plain: '/danae-plain.webp', smile: '/danae-smile.webp', dots: '/danae-dots.webp', closed: '/danae-closed.webp' } },
  { id: 'yumin', name: '강유민', where: '기숙사 · 매점', faces: { plain: '/yumin-plain.webp', smile: '/yumin-smile.webp', dots: '/yumin-dots.webp', closed: '/yumin-closed.webp' } },
  { id: 'haenim', name: '해님', where: '본관 · 양호실', faces: { plain: '/haenim-plain.webp', smile: '/haenim-smile.webp', surprise: '/haenim-surprise.webp' } },
  { id: 'shinah', name: '박신아', where: '뒷산 · 무구보관소', faces: { plain: '/shinah.png' } },
  { id: 'ishi', name: '이시', where: '사당 · 문지기', faces: { plain: '/ishi.png' } },
]

export const NPC_IDLE = {
  danae: { face: 'smile', text: '오늘 부탁은 끝! 고마워. 내일 또 들러 줄래?' },
  yumin: { face: 'plain', text: '오늘은 맡길 일 없어요. 내일 다시 오세요. 물건 사러는 언제든지요.' },
  haenim: { face: 'smile', text: '오늘은 충분히 도와줬어요. 이제 학생도 좀 쉬어요.' },
  shinah: { face: 'plain', text: '오늘은 됐어. 내일 와. 아니, 오지 마. 아니⋯⋯ 와도 되고.' },
  ishi: { face: 'plain', text: '오늘은 이시가 부탁할 게 없습니다! 대신 이시가 졸지 않는 걸 지켜봐 주십시오. ⋯⋯드르렁.' },
}

const KILL_POOLS = { n2: { type: 'kill', tierEnemy: true, n: 2 }, n3: { type: 'kill', tierEnemy: true, n: 3 } }

export const NPC_QUESTS = {
  danae: [
    {
      id: 'danae-ingredient', title: '가진게 없어',
      goal: { type: 'deliver', pool: [['mushroom', 4], ['wild-raspberry', 5], ['snake-berry', 4], ['dandelion', 3], ['chwinamul', 4], ['fern', 4], ['carp', 2], ['acorn', 5], ['chestnut', 4], ['doraji', 3], ['arrowroot', 3], ['deodeok', 3], ['oyster-mushroom', 3], ['dangwi', 2], ['omija', 3], ['pine-nut', 4], ['songi', 2], ['wild-ginseng', 1]] },
      offer: { face: 'surprise', text: '농장 도깨비들이 겁을 먹고 다 숨어 버렸어요. 알고 보니 {enemy|이} 산 아래까지 내려와서 그런 거래요. {where}에서 {n}번만 쓰러뜨려 주실래요?' },
      accept: { face: 'plain', text: '조심하세요. 저도 밤새 등불은 켜 둘게요.' },
      progress: { face: 'plain', text: '{enemy}, 아직 {left}번 남았어요. {where}에 있어요.' },
      done: { face: 'smile', text: '도깨비들이 하나둘 다시 나오고 있어요! 이건 다들 모아서 드리는 증표예요.' },
    },
    {
      id: 'danae-taste', title: '매일매일 똑같은 맛',
      goal: { type: 'deliver', pool: [['cabbage-soup', 1], ['mushroom-stew', 1], ['acorn-jelly', 1], ['grilled-carp', 1], ['chestnut-porridge', 1], ['oyster-mushroom-hotpot', 1], ['sipjeon-tang', 1], ['dragon-palace-soup', 1], ['pine-nut-porridge', 1], ['songi-rice', 1]] },
      offer: { face: 'dots', text: '요리 동아리를 운영하다 보면 맨날 내가 만든 것만 먹게 되거든, 솔직히 좀 질려⋯⋯. 다른 사람이 만든 {item|은} 어떤 맛일까 궁금해졌어. 네가 만든 거 {n}{unit}만 먹어봐도 될까?' },
      accept: { face: 'smile', text: '조리실은 언제든 열려 있으니 편히 써도 돼! 불만 안 지른다면야~' },
      progress: { face: 'plain', text: '벌써 {item} {n}{unit}네, 기다리고 있을게.' },
      done: { face: 'smile', text: '음⋯⋯! 간이 딱 좋다. 너 소질 있어. 계속 해봐!' },
      mult: 1.2,
    },
    {
      id: 'danae-garden', title: '서리 좀 작작해', goal: KILL_POOLS.n2,
      offer: { face: 'closed', text: '화단 상추를 노리는 게 서리하는 애들만이 아니었나 봐. {enemy|이} 밤마다 내려온대. {where}에서 {n}번만 쫓아 줄 수 있어?' },
      accept: { face: 'plain', text: '부탁할게. 화단 지키는 것도 일이라니까, 정말.' },
      progress: { face: 'plain', text: '{enemy}, {left}번 남았어. 다치지 말고!' },
      done: { face: 'smile', text: '이제 화단에서 이거저거 마음 놓고 기를 수 있겠다. 다음에 쌈이라도 싸줄까?' },
    },
    {
      id: 'danae-shelf', title: '선반이 재미없어',
      goal: { type: 'deliver', pool: [['charm-bundle', 2], ['polishing-stone', 2], ['curse-doll', 1], ['snakeskin-bookmark', 1], ['moss-pot', 1], ['feather-deco', 1], ['yarn-doll', 1], ['jangseung-keyring', 1], ['ghostfire-lantern', 1], ['imugi-tag', 1], ['jujube-amulet', 1]] },
      offer: { face: 'plain', text: '조리실 선반이 너무 휑해서 뭐라도 올려 두고 싶어. 공작소에서 만든 {item} {n}{unit}만 줄 수 있을까?' },
      accept: { face: 'smile', text: '고마워, 기다릴게! 어디에 둘지 벌써 고민되네.' },
      progress: { face: 'plain', text: '{item} {n}{unit}개를 부탁했었어. 지금 {have}{unit}개지?' },
      done: { face: 'smile', text: '여기 두니까 딱 좋다. 생각보다도 잘 어울려. 고마워!' },
    },
    {
      id: 'danae-crops', title: '부지런한 게 제맛',
      goal: { type: 'deliver', pool: [['potato', 3], ['carrot', 3], ['cabbage', 2], ['spinach', 3], ['cherry-tomato', 4], ['soybean', 4], ['lettuce', 4]] },
      offer: { face: 'dots', text: '텃밭에서 직접 키운 {item|이} 제일 맛있다는 거 알아? 사온 거랑은 완전히 다르다니까. {n}{unit}만 나눠 줄래?' },
      accept: { face: 'smile', text: '고마워! 신영 씨한테도 안부 전해 줘.' },
      progress: { face: 'plain', text: '{item} {n}{unit}개인데⋯⋯. 키우는 일이 쉽지 않지? 아직 {have}{unit} 있네.' },
      done: { face: 'smile', text: '흙냄새 좋다⋯⋯. 이걸로 뭘 만들지 생각만 해도 신나. 이거 받아!' },
      mult: 0.8,
    },
    {
      id: 'danae-pioneer', title: '요즘의 산 소식',
      goal: { type: 'pioneer', n: 2 },
      offer: { face: 'dots', text: '산이나 학교 곳곳에 영험한 재료가 떨어져 있다고 했잖아. 요즘 어디서 뭐가 나는지 궁금해서. 개척 {n}번만 다녀와서 얘기해 줄래?' },
      accept: { face: 'smile', text: '다녀오면 꼭 얘기해 줘야 해!' },
      progress: { face: 'plain', text: '개척 {left}번 남았어. 무리하지 말고.' },
      done: { face: 'smile', text: '응? 요즘 산도 신기한 거 많이 나네⋯⋯. 메모해 둬야지. 고마워, 이거 받아!' },
      mult: 0.8,
    },
  ],
  yumin: [
    {
      id: 'yumin-stock', title: '있는게 없어',
      goal: { type: 'deliver', pool: [['pebble', 8], ['wild-raspberry', 5], ['stone', 5], ['mushroom', 5], ['clover-leaf', 4], ['water-moss', 4], ['acorn', 5], ['pinecone', 5], ['pearl', 2], ['crystal', 2], ['starlight', 2], ['frost-flower', 1]] },
      offer: { face: 'plain', text: '매점에 들여놓을 {item|이} 모자라요. 내가 왜 이런 일까지 하고 있는지 모르겠긴 한데, {n}{unit}만 납품해 주시면 값은 확실히 쳐 드릴게요. 다음에 외상 한 번 받아드리던가⋯⋯.' },
      accept: { face: 'smile', text: '거래 성립이네요. 상태 좋은 걸로 부탁해요.' },
      progress: { face: 'plain', text: '{item} {n}{unit}이요. 지금 {have}{unit} 갖고 계시네요.' },
      done: { face: 'smile', text: '검수 끝. 상태 좋네요. 약속한 거 여기요. 현금영수증은 없어요. 우리가 그런 걸 어디 쓰겠어요?' },
      mult: 1.2,
    },
    {
      id: 'yumin-night', title: '밤손님', goal: KILL_POOLS.n2,
      offer: { face: 'closed', text: '밤중에 매점 문 따고 들어오는 게 학생이 아니었나 봐요. 과자 봉지가 죄다 이빨 자국이에요. 아무래도 {enemy} 같은데⋯⋯ {where}에서 {n}번만 달래 주실래요?' },
      accept: { face: 'plain', text: '부탁할게요. 전 나무 하나 상대하는 것도 지긋지긋해서요⋯⋯.' },
      progress: { face: 'plain', text: '{enemy}, {left}번 남았어요.' },
      done: { face: 'smile', text: '드디어 어젯밤은 조용해진 것 같더라고요. 고마워요. 이건 약속한 사례에요.' },
    },
    {
      id: 'yumin-tree', title: '기운 없는 벚꽃나무',
      goal: { type: 'deliver', pool: [['lake-water', 3], ['water-moss', 3], ['azalea', 3], ['moss-pot', 1]] },
      offer: { face: 'dots', text: '문 앞 벚꽃나무 있잖아요. 요즘 기운이 없어 보여요. 사람을 먹는다는 그 나무요. ⋯⋯네? 농담이에요. 일단 {item} {n}{unit}만 구해 주세요. 뿌리에 줘 볼게요.' },
      accept: { face: 'plain', text: '나무 근처에선 너무 오래 서 있지 마시고요.' },
      progress: { face: 'plain', text: '{item} {n}{unit}이요. 지금 {have}{unit}.' },
      done: { face: 'smile', text: '잎이 조금 살아난 것 같아요. 다행이다⋯⋯. 네, 당신 그 나무랑 여전히 너무 가까이 서 있어요. 당연히 이것도 농담이지만 너무 흘려듣진 마세요.' },
    },
    {
      id: 'yumin-lost', title: '분실물 찾습니다', needHave: true,
      goal: { type: 'deliver', pool: [['lost-hairband', 1], ['lost-slippers', 1], ['lost-phone', 1], ['lost-love-letter', 1]] },
      offer: { face: 'plain', text: '혹시 주운 물건 있어요? {item} 같은 거요. 매점 분실물 함에 넣어 두면 주인이 찾아가거든요. 맡겨 주시면 수고비는 드릴게요.' },
      accept: { face: 'smile', text: '주인 찾으면 고맙다고 전해 드릴게요.' },
      progress: { face: 'plain', text: '{item|을} 분실물 함에 넣어 주시면 돼요.' },
      done: { face: 'smile', text: '접수 완료했어요. 주인이 벌써 세 번째 물어보러 왔었거든요. 노이로제 걸릴 것 같아⋯⋯. 수고비 여기요.' },
    },
    {
      id: 'yumin-smell', title: '어떤 놈이야',
      goal: { type: 'deliver', item: 'charcoal', n: 2 },
      offer: { face: 'closed', text: '누가 매점 전자레인지에 생선을 돌렸어요. 밤중에. 몰래. 장난 아니에요 지금 냄새가 안 빠져요⋯⋯. 숯 {n}{unit}만 구해 주실래요?' },
      accept: { face: 'plain', text: '고마워요. 혹시라도 범인을 알게 되면 알려 주시고요.' },
      progress: { face: 'plain', text: '숯 {n}{unit}이요. 지금 {have}{unit}니까 좀 더 힘내봐요.' },
      done: { face: 'smile', text: '이제 좀 살 것 같네요. 범인은 아직 못 잡았지만요⋯⋯. 어떤 놈이야 대체?' },
    },
    {
      id: 'yumin-mountain', title: '웃돈 얹어 구하는 재료',
      goal: { type: 'deliver', pool: [['ginseng', 1], ['arrowroot', 3], ['deodeok', 2], ['licorice', 3], ['songi', 1], ['wild-ginseng', 1]] },
      offer: { face: 'dots', text: '산에서 캔 재료가 들어오면 다들 비싸게 사 가요. 특히 {item} 이건 장난 아니죠. {n}{unit}만 구해 주시면 이번엔 웃돈 얹어 드릴게요.' },
      accept: { face: 'smile', text: '흥정은 없어요. 대신 후하게 드릴게요.' },
      progress: { face: 'plain', text: '{item} {n}{unit}이요. 지금 {have}{unit}.' },
      done: { face: 'smile', text: '좋은 물건이네요. 약속대로 웃돈 얹었어요. 만족하시죠? 네? 충분히 드렸잖아요?' },
      mult: 1.4,
    },
  ],
  haenim: [
    {
      id: 'haenim-herb', title: '텅 빈 양호실',
      goal: { type: 'deliver', pool: [['mugwort', 3], ['licorice', 3], ['dangwi', 2], ['doraji', 3], ['ginseng', 1], ['omija', 2], ['antler', 1], ['wild-ginseng', 1]] },
      offer: { face: 'plain', text: '약재 상자가 거의 비었어요, {name} 학생. 혹시 {item|을} {n}{unit} 구해 줄 수 있을까요? 다친 학생들에게 달여 줄 게 없어서요.' },
      accept: { face: 'smile', text: '고마워요. 무리해서 다치면 안 돼요? 또 달이는 건 괜찮지만, 아프잖아요.' },
      progress: { face: 'plain', text: '{item} {n}{unit}이에요. 지금 {have}{unit} 있네요.' },
      done: { face: 'smile', text: '좋은 약재네요. 이걸로 한동안 걱정 없겠어요. 고마워요, {name} 학생.' },
    },
    {
      id: 'haenim-tonic', title: '밤눈 뜬 학생들',
      goal: { type: 'deliver', pool: [['dandelion-tea', 1], ['arrowroot-tea', 1], ['dangwi-tea', 1], ['sipjeon-tang', 1], ['antler-tonic', 1]] },
      offer: { face: 'smile', text: '요즘 밤을 새는 학생들이 많아요. 열심인 건 보기 좋지만 걱정이네요. 양호실에 {item|을} {n}{unit} 두고 싶은데, 혹시 만들어 줄 수 있어요?' },
      accept: { face: 'smile', text: '천천히 해도 괜찮아요. 몸이 먼저예요.' },
      progress: { face: 'plain', text: '{item} {n}{unit}, 기다릴게요.' },
      done: { face: 'smile', text: '따뜻하네요. 오늘 밤 오는 학생에게 먼저 줄게요. 고마워요.' },
      mult: 1.2,
    },
    {
      id: 'haenim-scare', title: '깜짝 손님들', goal: KILL_POOLS.n2,
      offer: { face: 'surprise', text: '{enemy|을} 보고 놀란 학생들이 줄줄이 양호실에 와요. 다들 이불을 뒤집어쓰고 안 나오려고 해서⋯⋯. {where}에서 {n}번만 쫓아내 줄 수 있을까요?' },
      accept: { face: 'plain', text: '꼭 몸 조심하고요. 다치면 바로 여기로 오세요.' },
      progress: { face: 'plain', text: '{enemy}, {left}번 남았어요.' },
      done: { face: 'smile', text: '오늘은 이불 속 학생이 한 명도 없어요. 수고했어요, {name} 학생.' },
    },
    {
      id: 'haenim-bari', title: '끼니를 거르는 아이',
      goal: { type: 'deliver', pool: [['barley-gaetteok', 2], ['mushroom-stew', 1], ['chestnut-porridge', 1], ['pearl-dumpling', 1], ['flower-rice-cake', 1], ['songi-rice', 1]] },
      offer: { face: 'plain', text: '바리가 밤에 캠핑장을 지키느라 끼니를 거르는 것 같아요. 제가 가져가면 괜찮다고만 해서⋯⋯ {item} {n}{unit}만 대신 전해 줄래요? 학생이 주면 먹을 거예요.' },
      accept: { face: 'smile', text: '고마워요. 제가 시켰다는 건 비밀이에요?' },
      progress: { face: 'plain', text: '{item} {n}{unit}이에요. {have}{unit}이니까 얼마 안 남았네요. 부탁해요.' },
      // 전하기: 밤에 캠핑장의 바리에게 직접 건넨다(해님이 시켰다는 건 비밀). 그 뒤 [의뢰]에서 해님에게 보고한다.
      relay: { to: 'bari', button: '{item|을} 건넨다', caption: '해님의 부탁 · 끼니를 거르는 아이', line: { face: 'surprise', text: '앗, 저에게 주는 건가요? 고마워요. 잘 먹을게요!' } },
      relayed: { face: 'plain', text: '벌써 다녀왔어요?' },
      done: { face: 'smile', text: '다 먹었대요? 다행이다⋯⋯. 그 애, 고맙다는 말은 잘 못해도 많이 좋아했을 거예요.' },
    },
    {
      id: 'haenim-lamp', title: '늘 불이 켜진 곳',
      goal: { type: 'visit', key: 'gym:right:campsite', where: '뒷산 · 산 탐사 · 오른길 · 캠핑장' },
      offer: { face: 'plain', text: '캠핑장 등불이 밤새 잘 켜져 있는지 걱정이에요. 산 탐사를 하다가 캠핑장에 한 번만 들러 봐 줄래요?' },
      accept: { face: 'smile', text: '바리가 있으면 안부도 전해 주고요.' },
      progress: { face: 'plain', text: '캠핑장은 뒷산 오른길에 있어요.' },
      done: { face: 'smile', text: '등불이 잘 켜져 있었다니 다행이에요. 그 애가 잘 지키고 있나 봐요.' },
      mult: 0.7,
    },
    {
      id: 'haenim-window', title: '양호실은 정신병원이 아닙니다',
      goal: { type: 'deliver', pool: [['azalea', 4], ['moss-pot', 1], ['clover-crown', 1], ['feather-deco', 1]] },
      offer: { face: 'smile', text: '양호실이 너무 휑해서 학생들이 더 긴장하는 것 같아요. 창가에 둘 {item} {n}{unit}만 있으면 좋겠는데.' },
      accept: { face: 'smile', text: '예쁜 걸로 부탁해요. 후후. 이런 건 젊은 학생들이 더 잘 알더라고.' },
      progress: { face: 'plain', text: '{item} {n}{unit}이에요. 지금 {have}{unit}.' },
      done: { face: 'smile', text: '창가가 환해졌어요. 학생들이 들어오자마자 웃네요. 고마워요.' },
    },
  ],
  shinah: [
    {
      id: 'shinah-mats', title: '재료 좀 거들라',
      goal: { type: 'deliver', pool: [['polishing-stone', 2], ['whetstone', 2], ['silver-inlay', 1], ['five-knot', 1], ['cinnabar-charm', 1]] },
      offer: { face: 'plain', text: '야. {item} {n}{unit} 있냐? 강화하러 오는 놈들은 많은데 재료 들고 오는 놈은 없어. 갖다 주면 셈은 해 줄게.' },
      accept: { face: 'plain', text: '어. 빨리 와라. 느리면 다른 놈한테 부탁한다.' },
      progress: { face: 'plain', text: '{item} {n}{unit}. 지금 {have}{unit}이네. 더 가져와.' },
      done: { face: 'plain', text: '됐네. 이걸로 한동안 버틴다. 자, 받아. 공짜 아니고 값 치르는 거다.' },
      mult: 1.2,
    },
    {
      id: 'shinah-test', title: '무기 시험', goal: KILL_POOLS.n3,
      offer: { face: 'plain', text: '네 무기 잘 드는지 궁금하네. {enemy|을} {n}번 베고 와. {where}에 있다. 무기가 시원찮으면 그때 와서 강화하고.' },
      accept: { face: 'plain', text: '다치지 마라. 양호실 가거던 내 탓이라고 하지 말고.' },
      progress: { face: 'plain', text: '{enemy}, {left}번 남았다며. 뭐 해.' },
      done: { face: 'plain', text: '오, 멀쩡히 살아서 왔네? 무기도 멀쩡하고. 쓸 만하다. 이거 받아.' },
      mult: 1.3,
    },
    {
      id: 'shinah-wall', title: '중간관리직의 비애',
      goal: { type: 'deliver', pool: [['pebble', 10], ['stone', 6], ['brick', 4], ['bone-fragment', 3], ['sealing-stone', 2]] },
      offer: { face: 'plain', text: '보관소 담이 금 갔어. 누가 몰래 넘어 들어오다가 걷어찼나 봐. {item} {n}{unit} 좀 갖다 줘. 학교가 알기 전에 후딱 막아야 돼. 나한테 뭐라 한단 말야.' },
      accept: { face: 'plain', text: '학교가 어떻게 아냐고? 내가 어떻게 알아? 빨리 빨리.' },
      progress: { face: 'plain', text: '{item} {n}{unit}라니까? 아직 {have}{unit}잖아!' },
      done: { face: 'plain', text: '막았다. 이제 몰래 들어오는 놈은 내가 직접 잡는다. 두고 보자고.' },
    },
    {
      id: 'shinah-danae', title: '전하지 않는 선물',
      goal: { type: 'deliver', pool: [['azalea', 5], ['clover-crown', 1], ['clover-hwajeon', 1], ['flower-rice-cake', 1], ['feather-norigae', 1], ['crystal-bracelet', 1]] },
      offer: { face: 'plain', text: '⋯⋯야. 너 단애랑 친하냐? 아니, 그냥. {item} {n}{unit}만 구해 와. 시끄러워. 그냥 네가 주는 걸로 해.' },
      accept: { face: 'plain', text: '뭘 웃어. 빨리 가.' },
      progress: { face: 'plain', text: '{item} {n}{unit}. ⋯⋯아직이냐.' },
      // 전하기: 별관 조리실의 단애에게 직접 선물한다(신아가 준다는 말은 하지 않는다). 그 뒤 [의뢰]에서 신아에게 보고한다.
      relay: { to: 'danae', button: '{item|을} 선물한다', caption: '신아의 부탁 · 전하지 않는 선물', line: { face: 'dots', text: '와, 고마워. 그런데 갑자기 웬 선물이야?' } },
      relayed: { face: 'plain', text: '⋯⋯줬냐?' },
      done: { face: 'plain', text: '뭐라 하던? 아니, 너만 알아. 가버려.' },
    },
    {
      id: 'shinah-snack', title: '배고프다',
      goal: { type: 'deliver', pool: [['hotbar', 2], ['ramen', 2], ['dumpling', 2], ['energy', 1]] },
      offer: { face: 'plain', text: '더럽게 바쁘고 배고프다. 유민이한테 내 대신 안부도 좀 전해줄 겸, {item} {n}{unit}만 사다 줘. 돈은 넉넉히 줄게.' },
      accept: { face: 'plain', text: '거스름돈은 네가 가져. 왜? 넉넉히 준댔잖어.' },
      progress: { face: 'plain', text: '{item} {n}{unit}. 뭘 게으름 부려. 배고파 죽겠다.' },
      done: { face: 'plain', text: '수고했다. 너 의외로 쓸 만하네.' },
      mult: 0.9,
    },
    {
      id: 'shinah-patrol', title: '이상한 기척',
      goal: { type: 'pioneer', n: 3 },
      offer: { face: 'plain', text: '요즘 보관소 근처에서 이상한 기척이 난다더라. 네가 산 좀 돌아봐. 개척 {n}번이면 되겠지.' },
      accept: { face: 'plain', text: '이상한 거 보면 괜히 건드리지 마. 얻어 터질라.' },
      progress: { face: 'plain', text: '개척 {left}번 남았다. 후딱 다시 가.' },
      done: { face: 'plain', text: '별일 없었다고? 그럼 됐다. 수고비다.' },
    },
  ],
  ishi: [
    {
      id: 'ishi-grass', title: '이시와 들풀',
      goal: { type: 'deliver', pool: [['clover-crown', 1], ['mugwort-incense', 1], ['dandelion-tea', 1], ['ssukbeomuri', 1], ['clover-salad', 1], ['clover-bookmark', 1], ['herb-salad', 1]] },
      offer: { face: 'plain', text: '나리, 나리! 이시는 들풀로 만든 걸 좋아합니다. 오늘은 {item|이} 너무너무 먹고⋯⋯ 아니, 갖고 싶습니다! {n}{unit}만 구해 주시면 안 됩니까?' },
      accept: { face: 'plain', text: '헤헤, 나리는 역시 착하십니다! 이시가 문 똑바로 지키고 있겠습니다. 졸지 않고요!' },
      progress: { face: 'plain', text: '{item} {n}{unit}! 이시 아직 기다리고 있습니다. 안 졸았습니다!' },
      done: { face: 'plain', text: '우와아! 이시 이거 아껴 먹⋯⋯ 아껴 쓰겠습니다! 답례입니다, 나리!' },
    },
    {
      id: 'ishi-phone', title: '배터리가 다 됐습니다', needHave: true,
      goal: { type: 'deliver', item: 'lost-phone', n: 1 },
      offer: { face: 'plain', text: '나리, 혹시 핸드폰 주웠습니까? 얼마 전 다른 학생에게 핸드폰 게임? 이라는 사특한 것을 배웠더니 그만⋯⋯. 누군가 잃어버린 핸드폰이라도 있으면 이시한테 잠깐만 빌려주시면 안 됩니까? 잠깐만요!' },
      accept: { face: 'plain', text: '잠깐만입니다. 정말 한 판만!' },
      progress: { face: 'plain', text: '핸드폰⋯⋯ 핸드폰⋯⋯.' },
      done: { face: 'plain', text: '한 판만, 한 판만 더⋯⋯ 앗, 이시 지금 문 지키고 있었습니다! 답례로 이거 드리겠습니다, 나리. 주인은 이시가 꼭 찾아 주겠습니다.' },
      mult: 1.5,
    },
    {
      id: 'ishi-play', title: '동생놀이',
      goal: { type: 'play', n: 2 },
      offer: { face: 'plain', text: '나리, 뒷산 농장 도깨비들 아십니까? 이시 동생 같은 녀석들입니다. 이시는 문 지키느라 못 가니까, 대신 {n}판만 놀아 주십시오. 이시가 보냈다고 하면 좋아할 겁니다!' },
      accept: { face: 'plain', text: '지면 울어도 됩니다. 이시는 안 놀립니다. 조금만 놀립니다.' },
      progress: { face: 'plain', text: '농장 놀이 {left}판 남았습니다!' },
      done: { face: 'plain', text: '녀석들이 이시 안부를 묻습니까? 헤헤. 답례입니다!' },
      mult: 0.8,
    },
    {
      id: 'ishi-ghost', title: '무서워하랏', goal: KILL_POOLS.n2,
      offer: { face: 'plain', text: '나리, 사당 근처를 {enemy|이} 기웃거립니다. 이시가 몸을 부풀려 봐도 안 무서워합니다⋯⋯ 섭섭합니다. {where}에서 {n}번만 혼내 주십시오.' },
      accept: { face: 'plain', text: '이시가 응원합니다! 여기서요! 문은 지켜야 하니까요!' },
      progress: { face: 'plain', text: '{enemy}, {left}번 남았습니다!' },
      done: { face: 'plain', text: '이제 아무도 기웃거리지 않습니다. 나리 덕분입니다! 답례입니다.' },
    },
    {
      id: 'ishi-acorn', title: '도토리묵',
      goal: { type: 'deliver', pool: [['acorn', 6], ['acorn-jelly', 1]] },
      offer: { face: 'plain', text: '나리, 지난번에 이시가 도토리묵 얘기를 하지 않았습니까? 그 뒤로 자꾸 생각이 납니다. {item} {n}{unit}만⋯⋯ 도와만 주신다면 착하게 굴겠습니다!' },
      accept: { face: 'plain', text: '아주 탱글탱글한 걸로 부탁드립니다!' },
      progress: { face: 'plain', text: '{item} {n}{unit}입니다! 이시 침 흘리고 있지 않습니다.' },
      done: { face: 'plain', text: '흐아⋯⋯ 행복합니다. 나리, 이시는 오늘 일을 평생 기억하겠습니다. 아마 사흘쯤. 답례입니다!' },
    },
    {
      id: 'ishi-count', title: '둘너이여섯여덟열',
      goal: { type: 'deliver', item: 'rice-grain', n: 4, unit: '알' },
      offer: { face: 'plain', text: '나리, 이시가 요즘 세는 걸 좋아합니다. 개미는 자꾸 도망가서 못 세겠습니다. 볍씨는 안 도망가지 않습니까? {n}{unit}만 주십시오!' },
      accept: { face: 'plain', text: '다 세면 나리한테 몇 알인지 알려 드리겠습니다!' },
      progress: { face: 'plain', text: '볍씨 {n}{unit}, 지금 {have}{unit}입니다.' },
      done: { face: 'plain', text: '하나, 둘, 셋⋯⋯ {n}{unit}! 맞습니다! 이시 천재입니다. 답례입니다, 나리!' },
    },
  ],
}

// ───────── 2순위 · 동아리별 주간 납품 · 토벌 ─────────
// 매주 월요일 0시에 바뀐다. 그 주가 시작될 때의 수준에 맞춰 납품 물건 하나 · 토벌 대상 하나를 고른다.
export const CLUB_TASK_DATA = {
  martial: {
    deliver: [['polishing-stone', 2], ['whetstone', 2], ['energy', 3], ['silver-inlay', 1], ['five-knot', 1], ['cinnabar-charm', 1]],
    deliverWhy: '무구 무료 점검에 쓸',
    huntWhy: '실력을 겨루러 산을 내려온',
  },
  craft: {
    deliver: [['hanji', 5], ['brush', 3], ['inkstick', 3], ['red-pigment', 2], ['talisman-ink', 2], ['pine-ink', 2], ['feather-deco', 1], ['yarn-doll', 1]],
    deliverWhy: '교내 주술 복구에 쓸',
    huntWhy: '교내 부적을 찢고 다니는',
  },
  music: {
    deliver: [['fine-woodchip', 3], ['web', 3], ['yarn-ball', 2], ['pheasant-feather', 3], ['jangseung-piece', 2], ['lightning-jujube', 1]],
    deliverWhy: '악기를 손볼',
    huntWhy: '음악실 창문을 긁고 다니는',
  },
  board: {
    deliver: [['pebble', 10], ['carving-knife', 2], ['fine-woodchip', 3], ['jujube-plaque', 1], ['gogok', 1]],
    deliverWhy: '새 말판을 만들',
    huntWhy: '패 놀이터의 판을 엎고 다니는',
  },
  broadcast: {
    deliver: [['hanji', 4], ['crystal', 2], ['crystal-bead', 1], ['bat-wing', 2], ['starlight', 2]],
    deliverWhy: '방송실 수신을 맑게 할',
    huntWhy: '교내 방송을 지지직거리게 만드는',
  },
  cook: {
    deliver: [['cabbage-soup', 1], ['mushroom-stew', 1], ['acorn-jelly', 2], ['carp-soup', 1], ['chestnut-porridge', 1], ['oyster-mushroom-hotpot', 1], ['dragon-palace-soup', 1], ['pine-nut-porridge', 1], ['songi-rice', 1]],
    deliverWhy: '동아리 시식회에 올릴',
    huntWhy: '조리실 식재료를 노리는',
  },
  read: {
    deliver: [['hanji', 5], ['snakeskin-bookmark', 1], ['pine-ink', 2], ['clover-bookmark', 1], ['hawk-quill', 1]],
    deliverWhy: '서적실 책을 고칠',
    huntWhy: '서적실 책장 틈에 깃든',
  },
  tea: {
    deliver: [['mugwort', 4], ['dandelion-tea', 1], ['licorice', 3], ['arrowroot-tea', 1], ['dangwi-tea', 1], ['omija-punch', 1], ['somdari-tea', 1]],
    deliverWhy: '다도실 찻자리에 낼',
    huntWhy: '다도실 찻물에 얼굴을 비추는',
  },
  garden: {
    deliver: [['cherry-tomato', 4], ['carrot', 4], ['potato', 4], ['spinach', 4], ['moss-pot', 1], ['azalea', 4], ['doraji', 3]],
    deliverWhy: '옥상 정원을 채울',
    huntWhy: '옥상 정원 화분을 엎고 다니는',
  },
}

// ───────── 4순위 · 엑스트라의 랜덤 부탁 (본관 · 별관 · 뒷산 · 사당에 도착했을 때) ─────────
// kind: 'mp'   → 그 자리에서 의지력을 써서 돕는다 (cost: { mp })
//       'give' → 그 자리에서 물건을 건넨다 (cost: { item, n }) — 그 물건이 있을 때만 나온다
//       'quest'→ 받아 두고 나중에 [의뢰]에서 건넨다 (goal, 3일 안에)
// reward: 단계에 맞춘 냥 · 영력 × mult (+ item: [id, n])
export const EXTRA_ZONES = ['mainHall', 'annex', 'gym', 'shrine']
export const EXTRA_QUEST_DAYS = 3

export const EXTRA_QUESTS = [
  // ── 본관 ──
  {
    id: 'mh-books', zone: 'mainHall', who: '1학년으로 보이는 학생', title: '교과서 더미', kind: 'mp', cost: { mp: 5 }, mult: 0.5,
    text: '본관 계단참에서 1학년으로 보이는 학생이 교과서 더미를 와르르 쏟는다. 결계학, 부적학, 주술학⋯⋯ 두께가 벽돌만 하다. 학생은 울상이 된 채 당신을 올려다본다. “저, 저기⋯⋯ 3층까지만 같이 들어 주실 수 있어요?”',
    acceptText: '당신은 책 절반을 받아 든다. 3층에 닿았을 무렵엔 팔이 저려 온다. 학생은 몇 번이고 고개를 숙이며 무언가를 쥐여 준다.',
    declineText: '당신은 미안한 얼굴로 지나친다. 등 뒤에서 책이 한 번 더 쏟아지는 소리가 들린다.',
  },
  {
    id: 'mh-quiz', zone: 'mainHall', who: '쪽지 시험을 앞둔 2학년', title: '견본 부적', kind: 'quest', mult: 0.8,
    goal: { type: 'deliver', pool: [['charm-bundle', 1], ['green-charm', 1], ['jaeaek-charm', 1], ['ink-talisman', 1], ['sealing-talisman', 1]] },
    text: '복도 창가에서 2학년 하나가 부적을 그리다 말고 머리를 쥐어뜯고 있다. 종이 위의 획은 전부 삐뚤빼뚤하다. “내일 부적학 쪽지 시험인데, 견본으로 볼 {item|이} 하나도 없어⋯⋯. {n}{unit}만 구해다 줄 수 있어? 사례할게.”',
    acceptText: '“진짜? 고마워! 나 3층 교실 근처에 있을게.”',
    declineText: '“아냐, 괜찮아. 어떻게든 되겠지⋯⋯.” 학생은 다시 삐뚤빼뚤한 획을 긋는다.',
    doneText: '학생은 {item|을} 받아 들고 획 하나하나를 손가락으로 따라 그린다. “이거면 붙겠다! 고마워!”',
  },
  {
    id: 'mh-hanji', zone: 'mainHall', who: '필기하던 학생', title: '마지막 장', kind: 'give', cost: { item: 'hanji', n: 2 }, mult: 0.5, item: ['chocolate', 1],
    text: '본관 휴게실, 필기하던 학생이 공책을 탈탈 털어 보더니 한숨을 쉰다. 마지막 장까지 다 썼다. “혹시 한지 남는 거 있어요? 두 장이면 되는데⋯⋯.”',
    acceptText: '당신은 한지 두 장을 건넨다. 학생은 받자마자 빼곡히 글씨를 채워 나간다. “살았다⋯⋯ 이거 받아요, 별건 아니지만.”',
    declineText: '“아, 괜찮아요.” 학생은 공책 표지 안쪽에 글씨를 쓰기 시작한다.',
  },
  {
    id: 'mh-window', zone: 'mainHall', who: '겁에 질린 2학년', title: '창문의 손자국', kind: 'quest', mult: 0.8,
    goal: { type: 'kill', tierEnemy: true, n: 1 },
    text: '3층 복도 끝, 2학년 둘이 창문에서 멀찍이 떨어져 수군거린다. “어젯밤에 저기 뭔가 붙어 있었어. 진짜야. 손바닥 자국이 바깥쪽에 났다니까.” 당신과 눈이 마주치자 한 명이 다가온다. “너 퇴마 실습 좀 한다며? 그거⋯⋯ {enemy} 같던데. 한 번만 혼내 줄 수 있어?”',
    acceptText: '“고마워! 오늘 밤엔 커튼 치고 잘게.”',
    declineText: '“그래⋯⋯ 오늘도 커튼 치고 자야겠다.”',
    doneText: '“창문에 자국이 안 생겼어! 너 진짜 해 줬구나.” 학생들이 주머니를 털어 사례를 건넨다.',
  },
  {
    id: 'mh-letter', zone: 'mainHall', who: '얼굴이 새빨간 학생', title: '분홍색 봉투', kind: 'give', cost: { item: 'lost-love-letter', n: 1 }, mult: 0.9,
    text: '본관 신발장 앞에서 한 학생이 얼굴이 새빨개진 채 바닥을 샅샅이 뒤지고 있다. “혹시⋯⋯ 편지 못 봤어요? 분홍색 봉투요. 아니, 제 건 아니고요. 친구 거예요. 진짜로요.”',
    acceptText: '당신이 주운 러브레터를 내밀자 학생은 낚아채듯 받아 가슴에 끌어안는다. “봐, 봤어요? 안 봤죠? 안 봤다고 해 주세요!” 학생은 사례를 쥐여 주고 도망치듯 사라진다.',
    declineText: '당신은 주머니 속 러브레터를 모른 척한다. 학생의 수색은 계속된다.',
  },
  // ── 별관 ──
  {
    id: 'an-flyer', zone: 'annex', who: '동아리 홍보 중인 학생', title: '홍보지 반 뭉치', kind: 'mp', cost: { mp: 4 }, mult: 0.45,
    text: '별관 입구, 홍보지를 한 아름 든 학생이 지나가는 사람마다 붙잡고 있다. 아무도 받아 주지 않는다. 학생이 당신을 발견하고 눈을 반짝인다. “저기요! 이거 반만 같이 돌려 주시면 안 돼요? 반만요!”',
    acceptText: '당신은 홍보지 반 뭉치를 받아 든다. 생각보다 사람들이 잘 받아 간다. 학생은 당신의 손을 잡고 위아래로 흔들더니 답례를 건넨다.',
    declineText: '“아⋯⋯ 네.” 학생은 다시 홍보지를 들고 허공에 인사한다.',
  },
  {
    id: 'an-pot', zone: 'annex', who: '조리실 앞의 학생', title: '빈 냄비', kind: 'quest', mult: 0.8,
    goal: { type: 'deliver', pool: [['mushroom', 3], ['potato', 3], ['chwinamul', 3], ['acorn', 4], ['carp', 1], ['chestnut', 3], ['oyster-mushroom', 2], ['songi', 1]] },
    text: '조리실 앞에서 한 학생이 빈 냄비를 들고 서성인다. “단애 선배한테 배운 거 해 보려는데, 재료를 깜빡했어. {item} {n}{unit}만 구해다 줄 수 있어? 다 되면 한 그릇 줄게.”',
    acceptText: '“고마워! 냄비는 내가 지키고 있을게.”',
    declineText: '“그래, 괜찮아. 물만 끓여 놔야지⋯⋯.”',
    doneText: '“완벽해!” 학생은 재료를 받아 들고 조리실로 뛰어 들어간다. 잠시 뒤, 좋은 냄새와 함께 사례가 돌아온다.',
  },
  {
    id: 'an-spar', zone: 'annex', who: '체력단련실의 3학년', title: '대신 나간 시합', kind: 'quest', mult: 1,
    goal: { type: 'kill', tierEnemy: true, n: 2 },
    text: '체력단련실 문틈으로 3학년 하나가 샌드백을 두들기다 말고 당신을 부른다. “야, 거기. {enemy} 알지? 친구랑 누가 먼저 {n}번 잡나 시합을 했거든. 근데 나 이번 주에 쇠약 걸려서⋯⋯ 대신 좀 잡아 줘. 이기면 한턱낼게.”',
    acceptText: '“오케이, 약속했다. 이름은 내 걸로 올린다?”',
    declineText: '“쳇, 그럼 내가 기어서라도 간다.”',
    doneText: '“진짜 잡았어? 약속대로 한턱.” 3학년은 크게 웃으며 등을 두드린다. 조금 아프다.',
  },
  {
    id: 'an-strings', zone: 'annex', who: '음악실의 학생', title: '끊어진 줄', kind: 'quest', mult: 0.8,
    goal: { type: 'deliver', pool: [['web', 2], ['yarn-ball', 1], ['five-color-thread', 2]] },
    text: '음악실에서 거문고 줄이 끊어지는 소리가 난다. 문을 열자 한 학생이 끊어진 줄을 들고 망연자실해 있다. “공연이 내일인데⋯⋯. 대신 쓸 만한 {item|이} {n}{unit}만 있으면 어떻게든 이어 볼 텐데.”',
    acceptText: '“정말? 그럼 연습하면서 기다릴게. 한 줄 빼고.”',
    declineText: '“아냐, 한 줄 없이 해 볼게. 원래 그런 곡이라고 하면 되지 뭐⋯⋯.”',
    doneText: '줄을 이은 거문고에서 낯선 소리가 난다. 학생은 그 소리가 마음에 든다며 웃는다. “이것도 나쁘지 않네. 고마워!”',
  },
  {
    id: 'an-brush', zone: 'annex', who: '미술 동아리 학생', title: '갈라진 붓끝', kind: 'give', cost: { item: 'brush', n: 1 }, mult: 0.5, item: ['hanji', 3],
    text: '별관 2층 복도, 미술 동아리 학생이 붓끝이 다 갈라진 붓을 들여다보고 있다. “하필 지금⋯⋯. 혹시 붓 하나 있어? 사례할게.”',
    acceptText: '당신이 붓을 건네자 학생은 그 자리에서 벽보 글씨를 마저 쓴다. 글씨가 훨씬 반듯해졌다. “고마워! 남은 한지라도 가져가.”',
    declineText: '“그래, 이걸로 버텨 볼게.” 갈라진 붓끝이 종이 위에서 세 갈래로 번진다.',
  },
  // ── 뒷산 ──
  {
    id: 'gy-lost', zone: 'gym', who: '길을 잃은 1학년', title: '같은 장승만 세 번', kind: 'mp', cost: { mp: 6 }, mult: 0.55,
    text: '뒷산 갈림길, 1학년 하나가 지도를 거꾸로 든 채 빙글빙글 돌고 있다. 해가 기울고 있다. “저⋯⋯ 기숙사가 어느 쪽이에요? 아까부터 같은 장승만 세 번 지나쳤어요.”',
    acceptText: '당신은 학생을 산 아래까지 데려다준다. 내려오는 동안 장승 하나가 고개를 돌린 것 같았지만, 못 본 척한다. 학생은 연신 고맙다며 주머니를 뒤진다.',
    declineText: '당신이 손가락으로 대충 방향을 가리키자, 학생은 정반대로 걸어간다.',
  },
  {
    id: 'gy-water', zone: 'gym', who: '텃밭의 학생', title: '시들어 가는 모종', kind: 'quest', mult: 0.8,
    goal: { type: 'deliver', pool: [['lake-water', 3], ['water-moss', 3]] },
    text: '텃밭 옆, 한 학생이 시들어 가는 모종 앞에 쪼그려 앉아 있다. “신영 씨가 그러는데, 청화강 물을 주면 금방 살아난대요. 근데 저 물이 무서워서⋯⋯. {item} {n}{unit}만 떠다 주실 수 있어요?”',
    acceptText: '“고마워요! 모종한테도 기다리라고 말해 둘게요.”',
    declineText: '“그쵸, 무섭죠⋯⋯.” 학생은 수돗물을 받으러 간다.',
    doneText: '모종이 물을 머금자 잎이 바로 선다. 학생이 박수를 친다. “봤어요? 방금 고맙다고 한 것 같아요!”',
  },
  {
    id: 'gy-berry', zone: 'gym', who: '배고픈 학생', title: '꼬르륵', kind: 'give', cost: { item: 'wild-raspberry', n: 3 }, mult: 0.5, item: ['pebble', 3],
    text: '산길 바위에 걸터앉은 학생의 배에서 꼬르륵 소리가 크게 울린다. 학생은 못 들은 척 하늘을 본다. 한 번 더 울린다. “⋯⋯혹시 산딸기 있어요? 세 알이면 돼요. 저녁 먹을 때까지만 버티게요.”',
    acceptText: '당신이 산딸기를 건네자 학생은 한 알씩 아껴 먹는다. “살았다⋯⋯. 이거 받아요. 오다가 주운 건데.”',
    declineText: '꼬르륵. 당신이 지나쳐 가는 내내 소리가 따라온다.',
  },
  {
    id: 'gy-paw', zone: 'gym', who: '너구리를 안은 학생', title: '다리를 저는 너구리', kind: 'quest', mult: 0.8,
    goal: { type: 'deliver', pool: [['mugwort', 2], ['dangwi', 1]] },
    text: '덤불 아래에서 학생 하나가 다리를 저는 너구리를 조심스레 안아 들고 있다. “덫에 걸렸었나 봐요. {item|을} 찧어 붙이면 낫는다던데⋯⋯ {n}{unit}만 구해 주실 수 있어요? 얘가 저만 따라와요.”',
    acceptText: '“고마워요. 얘 이름은⋯⋯ 아직 없어요. 나중에 같이 지어 주실래요?”',
    declineText: '“괜찮아요. 양호실에 데려가 볼게요. 해님 선생님이 동물도 봐 주실까요⋯⋯?”',
    doneText: '약초를 붙여 주자 너구리가 킁킁대며 학생의 손을 핥는다. 학생은 너구리 대신이라며 사례를 건넨다.',
  },
  {
    id: 'gy-practice', zone: 'gym', who: '실습 짝을 찾는 학생', title: '보고 배우기', kind: 'quest', mult: 0.7,
    goal: { type: 'kill', tierEnemy: true, easier: true, n: 2 },
    text: '퇴마 실습장 가장자리, 한 학생이 부서진 허수아비 옆에서 한숨을 쉰다. “같이 실습할 짝이 없어서⋯⋯. 혼자 {enemy|을} 잡는 건 무섭고. 대신 {n}번만 먼저 잡아 줄 수 있어? 어떻게 싸우는지 보고 배우게.”',
    acceptText: '“우와, 고마워! 멀리서 보고 있을게. 아주 멀리서.”',
    declineText: '“응⋯⋯ 그럼 허수아비라도 다시 세워야지.”',
    doneText: '“그렇게 하는 거구나!” 학생은 공책에 뭔가를 열심히 받아 적는다. “이건 수업료야.”',
  },
  // ── 사당 ──
  {
    id: 'sh-wish', zone: 'shrine', who: '소원을 비는 학생', title: '소원 쪽지', kind: 'give', cost: { item: 'hanji', n: 1 }, mult: 0.45,
    text: '사당 담벼락 아래, 학생 하나가 쪽지에 소원을 적으려다 멈칫한다. 쪽지가 없다. “한지 한 장만 있으면⋯⋯. 소원은 꼭 한지에 써야 이뤄진대요. 이시가 그랬어요.”',
    acceptText: '당신이 한지를 건네자 학생은 등을 돌리고 무언가를 꼼꼼히 적는다. 접은 쪽지를 담 틈에 끼워 넣고, 당신에게 작은 답례를 건넨다.',
    declineText: '“⋯⋯손바닥에 써도 될까요?” 학생은 손바닥에 무언가를 적기 시작한다.',
  },
  {
    id: 'sh-incense', zone: 'shrine', who: '향을 피우려는 학생', title: '빈 향로', kind: 'quest', mult: 0.9,
    goal: { type: 'deliver', pool: [['mugwort-incense', 1], ['ghostfire-lantern', 1]] },
    text: '사당 앞 돌계단에 한 학생이 빈 향로를 앞에 두고 앉아 있다. “할머니 기일이라서요. 향이라도 피우고 싶은데, 매점엔 안 팔더라고요. {item} {n}{unit}만 구해 주실 수 있을까요?”',
    acceptText: '“고맙습니다. 여기서 기다릴게요.”',
    declineText: '“괜찮아요. 마음만으로도 되겠죠.” 학생은 빈 향로 앞에서 두 손을 모은다.',
    doneText: '향이 피어오르자 학생은 한참 동안 눈을 감고 있다. 연기가 사당 쪽으로 곧게 올라간다. “⋯⋯고맙습니다. 정말로요.”',
  },
  {
    id: 'sh-tiptoe', zone: 'shrine', who: '살금살금 걷는 학생', title: '깨우지 말고', kind: 'mp', cost: { mp: 4 }, mult: 0.45,
    text: '사당 앞, 학생 하나가 까치발로 살금살금 걷고 있다. 기둥에 기댄 이시가 드르렁 코를 곤다. 학생이 입 모양으로 말한다. ‘저 표지판 글씨 좀 같이 읽어 줘. 깨우지 말고.’',
    acceptText: '둘은 숨을 죽이고 표지판 앞에 쪼그려 앉는다. 이시가 한 번 뒤척일 때마다 심장이 내려앉는다. 다 읽고 나서야 학생은 소리 없이 웃으며 답례를 건넨다.',
    declineText: '당신이 고개를 젓자 학생은 혼자 다가간다. 세 걸음 만에 이시가 눈을 번쩍 뜬다. “어엉? 거기 누굽니까?”',
  },
  {
    id: 'sh-ghost', zone: 'shrine', who: '사당 청소 당번', title: '누가 쳐다보는 것 같아', kind: 'quest', mult: 0.8,
    goal: { type: 'kill', tierEnemy: true, n: 1 },
    text: '사당 마당을 쓸던 청소 당번이 빗자루를 꼭 쥔 채 굳어 있다. “어제부터 계속 누가 쳐다보는 것 같아. 이시는 아니래. {enemy} 같다는데⋯⋯ 한 번만 쫓아 줄 수 있어? 청소는 내가 다 할게.”',
    acceptText: '“고마워. 빗자루도 무기는 무기니까, 나도 여기 있을게.”',
    declineText: '“그래⋯⋯ 빨리 쓸고 가야지.” 빗질 소리가 점점 빨라진다.',
    doneText: '“이제 안 쳐다봐!” 청소 당번은 빗자루를 내려놓고 사례를 건넨다. 마당이 유난히 깨끗하다.',
  },
  {
    id: 'sh-cairn', zone: 'shrine', who: '돌탑을 쌓는 학생', title: '무너진 돌탑', kind: 'quest', mult: 0.7,
    goal: { type: 'deliver', pool: [['pebble', 6], ['stone', 3], ['cairn-model', 1]] },
    text: '사당 옆 공터, 누군가 쌓다 만 돌탑 앞에 학생 하나가 서 있다. “어제 바람에 무너졌어요. 다시 쌓아야 하는데, 이 근처 돌은 이시가 다 세어 놔서 쓰면 혼나요. {item} {n}{unit}만 구해다 주실래요?”',
    acceptText: '“고마워요! 이시가 안 센 걸로요.”',
    declineText: '“그럼 이시 몰래⋯⋯ 아, 아니에요.”',
    doneText: '돌탑이 다시 섰다. 맨 위에 마지막 돌을 올리자 바람이 한 번 멎는다. 학생은 기쁜 얼굴로 답례를 건넨다.',
  },
  // ── 어디서든 ──
  {
    id: 'any-snack', zone: null, who: '기운 없는 학생', title: '매점까지 갈 힘이 없어', kind: 'quest', mult: 0.6,
    goal: { type: 'deliver', pool: [['hotbar', 1], ['ramen', 1], ['chocolate', 1], ['dumpling', 1]] },
    text: '벽에 기대 앉은 학생 하나가 당신을 보고 힘없이 손을 든다. “매점까지 갈 힘이 없어⋯⋯. {item} {n}{unit}만 사다 줄 수 있어? 돈은 두 배로 줄게.”',
    acceptText: '“천사다⋯⋯. 여기서 안 움직이고 기다릴게. 못 움직이니까.”',
    declineText: '“응⋯⋯ 그럼 조금만 더 누워 있을게.”',
    doneText: '학생은 한 입 먹자마자 눈에 생기가 돈다. “두 배, 약속대로!”',
  },
  {
    id: 'any-slippers', zone: null, who: '한 발로 선 학생', title: '사라진 실내화 한 짝', kind: 'give', cost: { item: 'lost-slippers', n: 1 }, mult: 0.9,
    text: '한 학생이 실내화 한 짝만 신은 채 깨금발로 서 있다. “혹시⋯⋯ 실내화 못 봤어? 한 짝이 사라졌어. 밤새 야광귀가 신어 보고 갔나 봐.”',
    acceptText: '당신이 주운 실내화를 내밀자 학생은 그 자리에서 신어 본다. 꼭 맞는다. “내 거야! 진짜 고마워!”',
    declineText: '학생은 깨금발로 콩콩 뛰며 계속 찾는다.',
  },
  {
    id: 'any-hairband', zone: null, who: '머리를 붙잡은 학생', title: '파란 머리끈', kind: 'give', cost: { item: 'lost-hairband', n: 1 }, mult: 0.9,
    text: '바람에 흩날리는 머리를 두 손으로 붙잡은 학생이 두리번거린다. “머리끈⋯⋯ 혹시 머리끈 못 봤어? 그거 없으면 실습 때 앞이 하나도 안 보여.”',
    acceptText: '당신이 주운 머리끈을 건네자 학생은 순식간에 머리를 묶어 올린다. “살았다! 이거 받아, 고마워.”',
    declineText: '학생은 머리를 붙잡은 채 다시 바닥을 훑는다.',
  },
  {
    id: 'any-errand', zone: null, who: '서류 상자를 든 선생님', title: '아슬아슬한 부적 다발', kind: 'mp', cost: { mp: 3 }, mult: 0.4,
    text: '저편에서 이름 모를 선생님이 서류 상자를 위태롭게 들고 온다. 상자 위에는 부적 다발이 아슬아슬하게 얹혀 있다. “학생, 미안한데⋯⋯ 이것 좀 같이 들어 줄 수 있겠니?”',
    acceptText: '당신은 상자 한쪽을 받쳐 든다. 교무실에 도착하자 선생님이 고맙다며 서랍에서 무언가를 꺼내 준다.',
    declineText: '“아, 그래. 괜찮다.” 부적 다발이 흔들흔들한다.',
  },
]
