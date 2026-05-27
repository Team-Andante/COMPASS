/**
 * 모든 브라우저에서 공통으로 사용할 수 있는 토스트 알림 함수
 * @param {string} message 표시할 문구
 * @param {string} type 'success' 또는 'error'
 * @param {string} nextPage 다음 페이지
 */

export const showToast = (message, type = 'success') => {
  // 현재 페이지에 toast-container가 있는지 확인 후, 없으면 자동으로 생성
  let container = document.getElementById('toast-container');
  
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container); // <body> 바로 밑에 자동으로 주입
  }

  // 개별 토스트 생성
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerText = message;
  
  container.appendChild(toast);

  // 애니메이션 시작 (cubic-bezier 효과 작동)
  setTimeout(() => toast.classList.add('show'), 100);

  // 3초 후 사라짐 처리
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 500); // 애니메이션 완전히 끝난 후 DOM에서 삭제
  }, 3000);
};

/**
 * 다음 페이지로 토스트 메시지를 넘겨서 예약
 */
export const reserveToast = (message, type = 'success') => {
  sessionStorage.setItem('toastMessage', message);
  sessionStorage.setItem('toastType', type);
};

/**
 * 페이지가 로드되었을 때 예약된 토스트가 있다면 실행
 */
export const checkReservedToast = () => {
  const pendingMessage = sessionStorage.getItem('toastMessage');
  const pendingType = sessionStorage.getItem('toastType');

  if (pendingMessage) {
    showToast(pendingMessage, pendingType || 'success');
    sessionStorage.removeItem('toastMessage');
    sessionStorage.removeItem('toastType');
  }
};

export const nextPage = (page) => {
    sessionStorage.setItem('nextPage', page);
};

export const checkNextPage = () => {
    const pendingMessage = sessionStorage.getItem('nextPage');

    if (pendingMessage === "scholar") {
      console.log('removing PAGE');
      location.href = ('./scholarship.html');
      sessionStorage.removeItem('nextPage');
      console.table(sessionStorage);
    }
};

console.table(sessionStorage);
// export const chechStorage = () => {
// }