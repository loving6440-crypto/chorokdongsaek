/* 비령 — 독립적인 구역 데이터 / UI 로직. 서버 연결 없는 콘셉트 데모 */
(() => {
  'use strict';

  // 원본 초록동색 C.01 src/hooks/useFont.js의 UI_FONTS와 순서/ID 동일.
  const UI_FONTS = [
    { id: 'neo', label: 'NEO둥근모', detail: '기본', family: 'NeoDunggeunmo' },
    { id: 'stardust', label: 'PF스타더스트', detail: 'Regular / Bold / ExtraBold', family: 'PF Stardust' },
    { id: 'galmuri9', label: '갈무리9', detail: 'v2.40.4', family: 'Galmuri9' },
    { id: 'silver', label: 'Silver', detail: '', family: 'Silver' },
    { id: 'kopub-dotum', label: 'KoPub 돋움', detail: '웹폰트', family: 'KoPub Dotum' },
    { id: 'kopub-batang', label: 'KoPub 바탕', detail: '웹폰트', family: 'KoPub Batang' },
    { id: 'ramche', label: '램체', detail: '', family: 'Ramche' },
  ];
  const FONT_STORAGE_KEY = 'biryeong-ui-font';
  const FONT_IDS = new Set(UI_FONTS.map((font) => font.id));
  const fontMenu = document.getElementById('fontMenu');
  const fontToggle = document.getElementById('fontToggle');
  const fontOptions = document.getElementById('fontOptions');
  let selectedFont = 'neo';

  function setFont(id) {
    if (!FONT_IDS.has(id)) return;
    selectedFont = id;
    document.documentElement.dataset.uiFont = id;
    for (const input of fontOptions.querySelectorAll('input[name="biryeong-font"]')) input.checked = input.value === id;
    const chosen = UI_FONTS.find((entry) => entry.id === id);
    const notice = document.getElementById('fontNotice');
    notice.textContent = ['stardust','silver','ramche'].includes(id)
      ? `${chosen.label}: 초록동색 ZIP에 실제 폰트가 없어 fonts/에 추가해야 원본 글꼴로 보입니다. 지금은 대체 글꼴로 표시됩니다.`
      : id === 'neo'
        ? 'NEO둥근모 폰트가 설치되어 있지 않으면 대체 글꼴이 표시됩니다.'
        : '서체가 로드되지 않는 오프라인 환경에서는 대체 글꼴이 표시될 수 있습니다.';
    try { localStorage.setItem(FONT_STORAGE_KEY, id); } catch (_) { /* 저장할 수 없는 환경 */ }
  }
  function toggleFontMenu(force) {
    const shouldOpen = typeof force === 'boolean' ? force : fontMenu.hidden;
    fontMenu.hidden = !shouldOpen;
    fontToggle.setAttribute('aria-expanded', String(shouldOpen));
    if (shouldOpen) fontMenu.querySelector('input:checked')?.focus();
    else fontToggle.focus();
  }
  UI_FONTS.forEach((font) => {
    const label = document.createElement('label');
    label.className = 'font-option';
    const input = document.createElement('input');
    input.type = 'radio'; input.name = 'biryeong-font'; input.value = font.id;
    input.addEventListener('change', () => setFont(font.id));
    const text = document.createElement('span'); text.className = 'font-option-name';
    text.textContent = font.label;
    const detail = document.createElement('small'); detail.textContent = font.detail;
    const sample = document.createElement('span'); sample.className = 'font-option-sample';
    sample.style.fontFamily = `'${font.family}', 'Noto Sans KR', sans-serif`;
    sample.textContent = '秘靈 가나다 123';
    label.append(input, text, detail, sample);
    fontOptions.appendChild(label);
  });
  try { selectedFont = localStorage.getItem(FONT_STORAGE_KEY) || 'neo'; } catch (_) {}
  setFont(FONT_IDS.has(selectedFont) ? selectedFont : 'neo');
  fontToggle.addEventListener('click', () => toggleFontMenu());
  document.getElementById('fontClose').addEventListener('click', () => toggleFontMenu(false));
  document.addEventListener('pointerdown', (event) => {
    if (!fontMenu.hidden && !document.getElementById('fontControl').contains(event.target)) toggleFontMenu(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !fontMenu.hidden) { toggleFontMenu(false); event.stopPropagation(); }
  });
  window.addEventListener('storage', (event) => {
    if (event.key === FONT_STORAGE_KEY) setFont(FONT_IDS.has(event.newValue) ? event.newValue : 'neo');
  });

  const ZONES = {
    north: {
      num: '01', direction: '北 · 검은 경계', title: '산문', symbol: '北', english: 'GATE OF THE MOUNTAIN',
      image: 'assets/north_scene.png',
      description: '속세와 학당의 경계를 가르는 낡은 문. 새벽마다 금줄 안쪽에는 정체 모를 발자국이 발견된다.',
      hint: '이곳을 지나는 모든 이는 이름을 남겨야 합니다.',
      actions: [
        { icon:'結', label:'금줄 살피기', title:'매듭 하나가 풀렸다', text:'문설주에 맨 금줄이 바람도 없는데 흔들린다.\n누군가 안에서 밖으로 나간 것일까, 아니면 밖에서 들어온 것일까.\n\n끊어진 새끼줄 끝에 붉은 종이 조각이 걸려 있다.' },
        { icon:'札', label:'출입 기록 확인', title:'비어 있는 이름', text:'수기 명부의 마지막 줄에는 이름 대신 검은 먹점만 남아 있다.\n그 아래, 누군가 아주 작게 적어 두었다.\n\n“해가 진 뒤에는 대답하지 말 것.”' },
        { icon:'月', label:'산 아래 바라보기', title:'산 아래의 불빛', text:'멀리 산 아래 마을의 등불이 점처럼 반짝인다.\n그런데 산중턱에도 불 하나가 있다. 길도 집도 없는 곳인데, 누군가 서서 이쪽을 보고 있다.' }
      ]
    },
    east: {
      num: '02', direction: '東 · 푸른 배움', title: '강학당', symbol: '東', english: 'HALL OF TALISMANS',
      image: 'assets/east_scene.png',
      description: '부적을 읽고 방울을 울리며 영을 가리는 법을 배우는 곳. 가르칠 무당들은 모두 사라졌고 오래된 문헌만이 수업을 이어 간다.',
      hint: '아는 것보다 모르는 것을 먼저 기록하십시오.',
      actions: [
        { icon:'符', label:'부적 필사', title:'붉은 글자의 이름', text:'책 속의 낡은 부적을 따라 그린다.\n마지막 획을 긋는 순간, 마르지 않았던 붉은 먹이 거꾸로 종이 안으로 스며든다.\n\n서고의 문이 딸깍, 저절로 닫혔다.' },
        { icon:'鈴', label:'방울 수련', title:'네 번 울린 방울', text:'손목을 가볍게 흔들었다.\n방울은 분명 세 번 흔들렸는데 소리는 네 번 울렸다.\n\n마지막 소리는 방 안이 아니라 누군가의 등 뒤에서 들렸다.' },
        { icon:'書', label:'자료 열람', title:'지워진 스승들의 이름', text:'실종된 무당들의 명부를 펼친다.\n소속 지역도 연령도 제각각이지만, 마지막 행선지에는 모두 같은 지명이 찍혀 있다.\n\n“강원도 비령산.”' }
      ]
    },
    west: {
      num: '03', direction: '西 · 흰 인연', title: '생활관', symbol: '西', english: 'HOUSE OF THE LEFT BEHIND',
      image: 'assets/west_scene.png',
      description: '서로 다른 곳에서 자라난 아이들이 한 지붕 아래 머문다. 누군가는 부모의 얼굴조차 모르고, 누군가는 마지막 유품만 간직했다.',
      hint: '잃어버린 가족의 단서를 이곳에서 찾을 수 있습니다.',
      actions: [
        { icon:'談', label:'동기와 대화', title:'모두가 같은 꿈을 꾸었다', text:'복도에 앉은 아이가 어젯밤 꿈을 털어놓는다.\n“나도 거기 있었어. 검은 산, 붉은 천, 그리고 방울 소리.”\n\n옆에 있던 다른 아이도 고개를 끄덕인다.' },
        { icon:'箱', label:'유품 상자 열기', title:'어머니의 작은 상자', text:'이름표가 지워진 나무 상자 안에는 빛바랜 오방색 천 조각과 짧은 편지가 있다.\n\n“네가 이 글을 읽을 날이 오지 않기를 바란다.”' },
        { icon:'燈', label:'밤의 복도 걷기', title:'세 번째 문', text:'복도 끝 등잔이 홀로 켜져 있다.\n분명 방은 두 개뿐이었는데 그 사이에 낯선 문이 하나 더 보인다.\n\n문패에는 당신의 이름이 적혀 있다.' }
      ]
    },
    south: {
      num: '04', direction: '南 · 붉은 금역', title: '비령산 금역', symbol: '南', english: 'THE FORBIDDEN PEAK',
      image: 'assets/south_scene.png',
      description: '무당들의 시신이 발견된 산길. 학당 뒤편 금역에는 아직 걷히지 않은 안개와 누가 묶었는지 모를 붉은 천이 남아 있다.',
      hint: '위험 경고 — 금역에 오래 머무르지 마십시오.',
      actions: [
        { icon:'山', label:'산길 조사', title:'돌무덤의 흔적', text:'젖은 흙 위에 오래된 짚신 자국이 남아 있다.\n발자국을 따라가면 작은 돌무덤이 보인다.\n\n그 위에는 누군가 방금 바꾼 듯한 새 흰 천이 놓여 있다.' },
        { icon:'痕', label:'이상 흔적 수집', title:'이름 없는 방울', text:'바위 틈에서 작고 녹슨 방울을 줍는다.\n안에는 방울알이 없는데, 손에 쥐자 낮고 긴 쇳소리가 귓속을 맴돈다.\n\n산의 안쪽에서 누군가 대답하는 듯하다.' },
        { icon:'禁', label:'봉인 확인', title:'금역의 경고', text:'길 끝에는 빛바랜 금줄과 다섯 장의 종이 부적이 걸려 있다.\n가운데 부적만 비어 있다.\n\n종이 뒷면에 한 줄이 적혀 있다. “아이들은 돌아가라.”' }
      ]
    }
  };

  const $ = (selector) => document.querySelector(selector);
  const cards = [...document.querySelectorAll('[data-zone]')];
  const dialog = $('#storyDialog');
  const actionList = $('#actionList');
  const STORAGE_KEY = 'biryeongsan-demo-journal-v2';
  let selectedZone = 'north';
  let journal = [];

  try { const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); if (Array.isArray(saved)) journal = saved.slice(-100); } catch (_) { /* file: 또는 비공개 모드 환경은 저장 없이 동작 */ }

  const storeJournal = () => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(journal)); } catch (_) {} };
  const updateCount = () => { $('#journalCount').textContent = String(journal.length).padStart(2, '0'); };

  function selectZone(key) {
    const zone = ZONES[key];
    if (!zone) return;
    selectedZone = key;
    cards.forEach((card) => {
      const isSelected = card.dataset.zone === key;
      card.classList.toggle('is-selected', isSelected);
      card.setAttribute('aria-pressed', String(isSelected));
    });
    $('#detailNumber').textContent = `AREA ${zone.num}`;
    $('#detailDirection').textContent = zone.direction;
    $('#detailTitle').textContent = zone.title;
    $('#detailSymbol').textContent = zone.symbol;
    $('#detailEnglish').textContent = zone.english;
    $('#detailDescription').textContent = zone.description;
    $('#detailHint').textContent = zone.hint;
    $('#detailImage').src = zone.image;
    $('#detailImage').alt = `${zone.title} 도트 풍경`;
    actionList.replaceChildren();
    zone.actions.forEach((action, index) => {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'action-btn';
      const icon = document.createElement('span'); icon.className = 'action-icon'; icon.textContent = action.icon; icon.setAttribute('aria-hidden','true');
      const name = document.createElement('span'); name.className = 'action-name'; name.textContent = action.label;
      const arrow = document.createElement('span'); arrow.className = 'action-arrow'; arrow.textContent = '→'; arrow.setAttribute('aria-hidden','true');
      button.append(icon, name, arrow);
      button.addEventListener('click', () => performAction(key, index));
      actionList.appendChild(button);
    });
  }

  function openStory(eyebrow, title, texts, footnote) {
    $('#dialogEyebrow').textContent = eyebrow;
    $('#dialogTitle').textContent = title;
    $('#dialogFootnote').textContent = footnote || '비령 · 비공개 기록';
    const parent = $('#dialogContent');
    parent.replaceChildren();
    texts.forEach((text) => {
      const p = document.createElement('p');
      p.textContent = text;
      parent.appendChild(p);
    });
    if (!dialog.open) dialog.showModal();
  }

  function performAction(key, index) {
    const zone = ZONES[key], action = zone.actions[index];
    journal.unshift({ area: zone.title, action: action.label, title: action.title, date: new Date().toLocaleDateString('ko-KR') });
    journal = journal.slice(0, 100);
    storeJournal(); updateCount();
    openStory(`${zone.symbol} / ${zone.title} — ${action.label}`, action.title, [action.text], `개인 관찰 기록 · 누적 ${journal.length}건`);
  }

  function showCase() {
    openStory('檔案 001 / 비령산 집단 실종 사건', '그날 사라진 사람들', [
      '그날의 실종은 어느 한 마을에서 시작되지 않았다. 전국 각지에서 무당들이 같은 순간 흔적도 없이 사라졌다. 누구도 그들이 어디로 갔는지 설명하지 못했다.',
      '얼마 뒤, 강원도 비령산에서 실종된 무당들의 주검이 대거 발견되었다. 사건의 경위는 여전히 밝혀지지 않았다.',
      '남은 것은 그들의 아이들이다. 친부모가 무당이었다는 사실을 모른 채 자란 이도, 일찍 가족을 잃은 이도 있다. 그 후손들을 비령산에 모아 임시 학교를 세웠다.',
      '누군가는 이곳을 피난처라고 부른다. 누군가는 진실을 묻기 위해 만든 장소라고 말한다.'
    ], '보관 문서 001 · 비령');
  }

  function showJournal() {
    if (!journal.length) {
      openStory('個人記錄 / 나의 기록', '아직 비어 있는 일지', ['구역을 선택하고 행동을 수행하면, 발견한 단서와 사건이 이곳에 기록됩니다.', '산문의 금줄부터 살펴보는 것은 어떨까요?'], '관찰 기록 · 0건');
      return;
    }
    openStory('個人記錄 / 나의 기록', `발견한 단서 ${journal.length}건`, journal.slice(0,20).map((r,i) => `${String(i+1).padStart(2,'0')}. [${r.area}] ${r.action}\n${r.title} · ${r.date}`), `관찰 기록 · ${journal.length}건 · 이 브라우저에 보관`);
  }

  cards.forEach((card) => card.addEventListener('click', () => selectZone(card.dataset.zone)));
  $('#storyBtn').addEventListener('click', showCase);
  $('#readCase').addEventListener('click', showCase);
  $('#journalBtn').addEventListener('click', showJournal);
  $('#dialogClose').addEventListener('click', () => dialog.close());
  $('#dialogConfirm').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    // close on click outside the dialog's rectangle
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
  $('#lanternBtn').addEventListener('click', () => {
    const isOn = document.body.classList.toggle('lantern-lit');
    $('#lanternBtn').textContent = isOn ? '☾ 등불 끄기' : '☼ 등불 켜기';
    $('#lanternBtn').setAttribute('aria-pressed', String(isOn));
  });
  selectZone(selectedZone); updateCount();
})();
