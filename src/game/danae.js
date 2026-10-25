// 별관 2층 조리실 담당 NPC 오단애. (원래 공작소에 있었으나 조리실로 자리를 옮겼다)
export const DANAE = {
  id: 'danae',
  name: '오단애',
  faces: {
    smile: '/danae-smile.webp',
    dots: '/danae-dots.webp',
    plain: '/danae-plain.webp',
    closed: '/danae-closed.webp',
  },
  lines: [
    { face: 'plain', text: '근황은 좀 어때? 잘 안 되는 게 있으면 내가 도와줄게!' },
    { face: 'smile', text: '직접 만들면 뿌듯하지~ 그 마음 잘 알아. 그렇다고 너무 자주 오면 용돈 다 날아간다?' },
    { face: 'plain', text: '오늘은 뭐 만들 거야?' },
    { face: 'smile', text: '조금 서툴러도 하다 보면 나아질 테니까 계속 노력해보자. 나도 응원해줄게.' },
    { face: 'plain', text: '공작소나 조리실에는 네가 가지고 있는 제작법, 요리법만 표시돼.' },
    { face: 'dots', text: '가끔 산이나 학교 곳곳에 영험한 재료들이 떨어져 있곤 하던데, 다들 그걸로 별 걸 다 만들더라. 신기하지? 어디서 그런 아이디어가 나오나 몰라.' },
    { face: 'plain', text: '제작을 한 번에 여러 개 하고 싶으면 만들기를 선택한 후 개수를 조정하면 돼. 하지만 만드는 데에는 그만큼 비례해서 시간이 소모되는 점 꼭 기억하고.' },
    { face: 'closed', text: '제작 중에는 다른 곳으로 이동하면 안 돼. 제작이 중지되거든. 나가려고 하면 안내문이 뜨긴 하지만 그래도 조심해.' },
    { face: 'dots', text: '음~ 어쩌다 조리실을 맡게 됐냐고? 글쎄…? 내가 서리하려는 애들 말리다 못해 화단에서 상추를 재배하기 시작한 시점부터였을까…….' },
    { face: 'smile', text: '여기서 오래된 물건들을 만지고 있으면 어쩐지 마음이 안정되지 않아?' },
  ],
}
