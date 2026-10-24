// 운영비 한 표 시제품 화면 동작

const 넘음_비율 = 0.10;   // 예산보다 10% 넘게 쓰고
const 넘음_금액 = 1000;   // 1,000달러 넘게 차이 나면 확인 필요로 표시

const 상태 = {
  읽음: false,
  대응표: JSON.parse(JSON.stringify(대응표_처음)),
  선택: {},          // '관리사|원래 항목' → 사람이 고른 표준 항목
  보는선박: 선박목록[0].id,
};

const 글 = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const 달러 = (n) => '$' + Math.round(n).toLocaleString('en-US');
const 원래금액 = (n, 통화) => (통화 === 'KRW' ? Math.round(n).toLocaleString('ko-KR') + '원' : 달러(n));
const 달러로 = (n, 통화) => (통화 === 'KRW' ? n / 환율_원 : n);
const 퍼센트 = (r) => (r > 0 ? '+' : '') + Math.round(r * 100) + '%';
const 선박 = (id) => 선박목록.find((s) => s.id === id);

// 화면 조각 바꾸기. 자료의 글자는 모두 글()로 바꿔 넣는다
function 화면(id, html) {
  const 곳 = document.getElementById(id);
  곳.replaceChildren(document.createRange().createContextualFragment(html));
}

// 줄 하나의 표준 항목과 처리 방식
function 분류(관리사, 원래) {
  const 확정 = 상태.대응표[관리사][원래];
  if (확정) return { 항목: 확정, 방식: '대응표' };
  const 제안 = AI제안[`${관리사}|${원래}`];
  if (!제안) return { 항목: null, 방식: '없음' };
  return { 항목: 상태.선택[`${관리사}|${원래}`] || 제안.항목, 방식: 'AI', 제안 };
}

function 전체줄() {
  return Object.entries(보고서).flatMap(([관리사, 줄들]) => 줄들.map(([id, 원래, 금액, 메모]) => {
    const 통화 = 관리사목록[관리사].통화;
    return { 관리사, id, 원래, 금액, 메모, 통화, 달러: 달러로(금액, 통화), ...분류(관리사, 원래) };
  }));
}

function 선박표(id) {
  const 줄들 = 전체줄().filter((z) => z.id === id);
  const 실적 = 표준항목.map((항목) => 줄들.filter((z) => z.항목 === 항목).reduce((a, z) => a + z.달러, 0));
  const 원본합계 = 줄들.reduce((a, z) => a + z.달러, 0);
  const 미확인 = 줄들.filter((z) => z.방식 === 'AI').length;
  return { 줄들, 실적, 예산: 예산[id], 원본합계, 미확인 };
}

const 넘었나 = (실적, 예) => 예 > 0 && (실적 - 예) / 예 > 넘음_비율 && 실적 - 예 > 넘음_금액;

// ───── 1 보고서 받기 ─────
function 그리기1() {
  const 카드 = Object.entries(관리사목록).map(([k, m]) => {
    const 줄들 = 보고서[k];
    const 배들 = [...new Set(줄들.map((z) => z[0]))].map((id) => 선박(id).이름).join(', ');
    const 합계 = 줄들.reduce((a, z) => a + z[2], 0);
    const 원본 = `<details class="원본 ${m.형식.startsWith('PDF') ? 'PDF' : ''}"><summary>원본 모양 보기</summary><div class="표틀"><table>
      <tr><th>Vessel</th><th>${m.통화 === 'KRW' ? '항목' : 'Account'}</th><th>${m.통화 === 'KRW' ? '금액(원)' : 'USD'}</th><th>Remark</th></tr>
      ${줄들.map(([id, 원래, 금액, 메모]) => `<tr><td>${글(선박(id).이름)}</td><td>${글(원래)}</td><td class="수">${금액.toLocaleString('en-US')}</td><td>${글(메모)}</td></tr>`).join('')}
    </table></div></details>`;
    return `<div class="카드"><h3>${글(m.이름)}${m.처음 ? ' <span class="작게">(이번 달 처음)</span>' : ''}</h3>
      <div class="작게">${글(m.형식)} · ${m.통화} · 선박 ${글(배들)}</div>
      <div>${줄들.length}줄 · 합계 ${원래금액(합계, m.통화)}</div>
      ${상태.읽음 ? '<div class="확인글">읽기 끝</div>' : ''}${원본}</div>`;
  }).join('');
  const 줄수 = 전체줄().length;
  화면('단계1', `
    <h2>${기준달} 관리사 보고서 3건</h2>
    <p>관리사 세 곳이 각자 양식으로 보낸 보고서입니다. 항목 이름, 묶는 방법, 돈 단위가 모두 다릅니다. 파일을 그대로 넣으면 표를 읽어 줄 단위로 나눕니다.</p>
    <div class="카드들">${카드}</div>
    ${상태.읽음
      ? `<div class="요약줄">보고서 3건, 선박 4척, 비용 ${줄수}줄을 읽었습니다. 원화는 예시 환율 ${환율_원.toLocaleString()}원/달러로 바꿔 계산합니다.</div>
         <div class="오른쪽"><button class="주버튼" data-단계이동="2">다음: 항목 맞추기</button></div>`
      : `<div class="오른쪽"><button class="주버튼" id="읽기">보고서 3건 읽기</button></div>`}`);
  const 읽기 = document.getElementById('읽기');
  if (읽기) 읽기.onclick = () => { 상태.읽음 = true; 그리기1(); };
}

// ───── 2 항목 맞추기 ─────
function 그리기2() {
  const 줄들 = 전체줄();
  const 자동 = 줄들.filter((z) => z.방식 === '대응표').length;
  const AI줄 = 줄들.filter((z) => z.방식 === 'AI');
  const 낮음 = AI줄.filter((z) => z.제안.확신 !== '높음').length;
  const 확신순 = { '낮음': 0, '보통': 1, '높음': 2 };
  const 행 = AI줄.sort((a, b) => 확신순[a.제안.확신] - 확신순[b.제안.확신]).map((z) => {
    const 키 = `${z.관리사}|${z.원래}`;
    const 고르기 = `<select data-키="${글(키)}">${표준항목.map((h) => `<option${h === z.항목 ? ' selected' : ''}>${h}</option>`).join('')}</select>`;
    return `<tr class="${z.제안.확신 === '낮음' ? '넘음' : ''}">
      <td>${글(관리사목록[z.관리사].이름)}<br><span class="작게">${글(선박(z.id).이름)}</span></td>
      <td>${글(z.원래)}${z.메모 ? `<br><span class="작게">${글(z.메모)}</span>` : ''}</td>
      <td class="수">${원래금액(z.금액, z.통화)}</td>
      <td>${고르기}</td>
      <td><span class="${z.제안.확신 === '낮음' ? '경고글' : ''}">확신 ${z.제안.확신}</span><br><span class="작게">${글(z.제안.이유)}</span></td>
      <td><button class="작은버튼" data-확인="${글(키)}">확인</button></td></tr>`;
  }).join('');
  const 표줄 = Object.entries(상태.대응표).map(([k, 표]) => `${관리사목록[k].이름} ${Object.keys(표).length}개`).join(' · ');
  화면('단계2', `
    <h2>원래 항목을 표준 7개 항목에 맞추기</h2>
    <p>표준 항목은 해운 조사기관 Drewry의 운영비 분류(선원비, 보험료, 선용품·예비품, 윤활유, 수리·정비, 입거, 관리·일반관리비)를 따릅니다.</p>
    <div class="요약줄">전체 ${줄들.length}줄 중 <b>${자동}줄</b>은 지난달까지 확인해 둔 대응표로 자동 분류했습니다.
      남은 <b>${AI줄.length}줄</b>은 AI 제안입니다${AI줄.length ? ` (확신 낮음·보통 ${낮음}줄을 먼저 보세요)` : ''}.</div>
    ${AI줄.length ? `<div class="표틀"><table>
      <tr><th>관리사·선박</th><th>원래 항목</th><th>금액</th><th>표준 항목</th><th>AI 판단</th><th></th></tr>${행}</table></div>
      <div class="버튼줄"><button class="보조버튼" id="높음확인">확신 '높음' 한꺼번에 확인</button></div>`
      : '<p class="확인글">모든 줄을 확인했습니다.</p>'}
    <h3>저장된 대응표</h3>
    <p class="작게">사람이 확인한 항목은 관리사별 대응표에 저장되어 다음 달부터는 AI 없이 자동 분류됩니다. 지금: ${글(표줄)}</p>
    <div class="오른쪽"><button class="주버튼" data-단계이동="3">다음: 선박별 표</button></div>`);

  document.querySelectorAll('#단계2 select').forEach((s) => { s.onchange = () => { 상태.선택[s.dataset.키] = s.value; }; });
  document.querySelectorAll('#단계2 [data-확인]').forEach((b) => { b.onclick = () => { 확정(b.dataset.확인); 그리기2(); }; });
  const 높음 = document.getElementById('높음확인');
  if (높음) 높음.onclick = () => { AI줄.filter((z) => z.제안.확신 === '높음').forEach((z) => 확정(`${z.관리사}|${z.원래}`)); 그리기2(); };
}

function 확정(키) {
  const [관리사, 원래] = 키.split('|');
  상태.대응표[관리사][원래] = 상태.선택[키] || AI제안[키].항목;
}

// ───── 3 선박별 표 ─────
function 질의초안(배, 넘은) {
  const m = 관리사목록[배.관리사];
  const 줄 = 넘은.map((x) => `- ${x.항목}: 예산 ${달러(x.예산)}, 실적 ${달러(x.실적)} (${퍼센트(x.비율)})${x.원래.length ? ` / 해당 항목: ${x.원래.join(', ')}` : ''}`).join('\n');
  return `${m.이름} 담당자님께\n\n${배.이름}(${배.id}) ${기준달} 운영비 보고서 잘 받았습니다.\n아래 항목이 예산을 넘어 내역 확인을 부탁드립니다.\n\n${줄}\n\n작업 내용, 견적·청구서 사본, 다음 달 이후 추가 발생 여부를 알려 주시면 감사하겠습니다.`;
}

function 그리기3() {
  const 배 = 선박(상태.보는선박);
  const 표 = 선박표(배.id);
  const 행정보 = 표준항목.map((항목, i) => {
    const 실적 = 표.실적[i], 예 = 표.예산[i], 차이 = 실적 - 예;
    const 비율 = 예 ? 차이 / 예 : 0;
    const 원래 = 표.줄들.filter((z) => z.항목 === 항목 && z.메모).map((z) => `${z.원래}(${z.메모})`);
    return { 항목, 실적, 예산: 예, 차이, 비율, 넘음: 넘었나(실적, 예), 원래 };
  });
  const 넘은 = 행정보.filter((x) => x.넘음);
  const 실적합 = 표.실적.reduce((a, b) => a + b, 0), 예산합 = 표.예산.reduce((a, b) => a + b, 0);
  const 맞음 = Math.abs(실적합 - 표.원본합계) < 0.5;
  const 공개 = 공개수준[배.선종];
  const 버튼 = 선박목록.map((s) => `<button class="${s.id === 배.id ? '주버튼' : '보조버튼'}" data-선박="${s.id}">${글(s.이름)}</button>`).join('');
  const 부호 = (n) => (n >= 0 ? '+' : '-') + 달러(Math.abs(n));

  화면('단계3', `
    <div class="버튼줄">${버튼}</div>
    <h2>${글(배.이름)} · ${글(배.선종)} ${글(배.크기)} · ${글(관리사목록[배.관리사].이름)} · ${기준달}</h2>
    ${표.미확인 ? `<p class="경고글">아직 확인하지 않은 AI 제안 ${표.미확인}줄이 들어 있습니다 (2단계에서 확인).</p>` : ''}
    <div class="표틀"><table>
      <tr><th>표준 항목</th><th>예산</th><th>실적</th><th>차이</th><th>차이율</th><th>표시</th></tr>
      ${행정보.map((x) => `<tr class="${x.넘음 ? '넘음' : ''}"><td>${x.항목}</td><td class="수">${달러(x.예산)}</td><td class="수">${달러(x.실적)}</td>
        <td class="수">${부호(x.차이)}</td><td class="수">${x.예산 ? 퍼센트(x.비율) : '-'}</td>
        <td>${x.넘음 ? '<span class="경고글">확인 필요</span>' : ''}</td></tr>`).join('')}
      <tr class="합계"><td>합계</td><td class="수">${달러(예산합)}</td><td class="수">${달러(실적합)}</td>
        <td class="수">${부호(실적합 - 예산합)}</td><td class="수">${퍼센트((실적합 - 예산합) / 예산합)}</td><td></td></tr>
    </table></div>
    <div class="요약줄">
      <div>합계 대조: 관리사 보고서 원본 합계 ${달러(표.원본합계)} = 표준표 합계 ${달러(실적합)} ${맞음 ? '<span class="확인글">일치 (빠진 줄 없음)</span>' : '<span class="경고글">불일치</span>'}</div>
      <div>하루 운영비 ${달러(실적합 / 날수)} · 공개 수준 ${달러(공개.값)} (${글(공개.출처)}) 대비 ${퍼센트(실적합 / 날수 / 공개.값 - 1)}</div>
    </div>
    ${넘은.length ? `<h3>관리사에 보낼 질의 초안 (보내기 전에 고쳐 쓰세요)</h3>
      <textarea class="질의" id="질의">${글(질의초안(배, 넘은))}</textarea>
      <div class="버튼줄"><button class="작은버튼" id="복사">초안 복사</button></div>` : '<p class="확인글">예산을 넘은 항목이 없습니다.</p>'}
    <div class="오른쪽"><button class="주버튼" data-단계이동="4">다음: 공사 요약</button></div>`);

  document.querySelectorAll('#단계3 [data-선박]').forEach((b) => { b.onclick = () => { 상태.보는선박 = b.dataset.선박; 그리기3(); }; });
  const 복사 = document.getElementById('복사');
  if (복사) 복사.onclick = () => {
    navigator.clipboard?.writeText(document.getElementById('질의').value)
      .then(() => { 복사.textContent = '복사됨'; })
      .catch(() => { 복사.textContent = '복사 실패 — 직접 선택해 복사하세요'; });
  };
}

// ───── 4 공사 요약 ─────
function 요약행() {
  return 선박목록.map((배) => {
    const 표 = 선박표(배.id);
    const 실적합 = 표.실적.reduce((a, b) => a + b, 0), 예산합 = 표.예산.reduce((a, b) => a + b, 0);
    const 넘은수 = 표준항목.filter((_, i) => 넘었나(표.실적[i], 표.예산[i])).length;
    return { 배, 하루: 실적합 / 날수, 예산비: 실적합 / 예산합 - 1, 공개비: 실적합 / 날수 / 공개수준[배.선종].값 - 1, 넘은수, 확인: 표.미확인 === 0 };
  });
}

function 그리기4() {
  const 행 = 요약행();
  화면('단계4', `
    <h2>공사 지원 선박 운영비 요약 (${기준달})</h2>
    <p>선사가 공유에 동의한 선박만, 선박 ID 기준 표준 7개 항목 합계로 받습니다. 관리사 원본 파일과 세부 줄은 선사가 보관합니다.
      공사의 <b>선박 자산 진단</b>(기본·금융·운항·환경·기술문서 자료)에 <b>운영비</b> 자료를 하나 더하는 자리입니다.</p>
    <div class="표틀"><table>
      <tr><th>선박 ID</th><th>선종</th><th>관리사</th><th>하루 운영비</th><th>예산 대비</th><th>공개 수준 대비</th><th>넘은 항목</th><th>선사 확인</th></tr>
      ${행.map((r) => `<tr class="${r.넘은수 ? '넘음' : ''}"><td>${r.배.id}</td><td>${글(r.배.선종)}</td><td>${글(관리사목록[r.배.관리사].이름)}</td>
        <td class="수">${달러(r.하루)}</td><td class="수">${퍼센트(r.예산비)}</td><td class="수">${퍼센트(r.공개비)}</td>
        <td class="수">${r.넘은수 || '-'}</td><td>${r.확인 ? '<span class="확인글">확인됨</span>' : '<span class="경고글">확인 전</span>'}</td></tr>`).join('')}
    </table></div>
    <p class="작게">공개 수준: 벌크선 ${달러(공개수준['벌크선'].값)}/일(${글(공개수준['벌크선'].출처)}), 석유제품운반선 ${달러(공개수준['석유제품운반선'].값)}/일(${글(공개수준['석유제품운반선'].출처)}). 배 크기와 나이가 달라 참고용입니다.</p>
    <div class="버튼줄"><button class="보조버튼" id="내려받기">CSV 내려받기</button></div>`);
  document.getElementById('내려받기').onclick = () => {
    const 머리 = ['선박ID', '선종', '관리사', '기준달', ...표준항목.map((h) => h + '(USD)')];
    const 줄 = 선박목록.map((배) => [배.id, 배.선종, 관리사목록[배.관리사].이름, 기준달, ...선박표(배.id).실적.map((v) => Math.round(v))]);
    const csv = '﻿' + [머리, ...줄].map((r) => r.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = '운영비_요약_예시.csv';
    a.click();
  };
}

// ───── 단계 이동 ─────
const 그리기 = { 1: 그리기1, 2: 그리기2, 3: 그리기3, 4: 그리기4 };

function 이동(n, 스크롤 = true) {
  if (n > 1) 상태.읽음 = true;   // 공사 화면으로 바로 와도 예시를 볼 수 있게
  document.querySelectorAll('.단계화면').forEach((s) => s.classList.toggle('지금', s.id === `단계${n}`));
  document.querySelectorAll('.단계 button').forEach((b) => b.classList.toggle('지금', b.dataset.단계 === String(n)));
  그리기[n]();
  if (스크롤) document.querySelector('.단계').scrollIntoView({ behavior: 'smooth' });
}

document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-단계], [data-단계이동], [data-이동]');
  if (t) 이동(Number(t.dataset.단계 || t.dataset.단계이동 || t.dataset.이동));
});

이동(1, false);
