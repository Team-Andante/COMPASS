/**
 * 공통 토스트 알림 모듈
 * login.js, main.js, reged.js 에서 공유 사용
 */

/**
 * 토스트를 현재 페이지에 즉시 표시
 * @param {string} message - 표시할 문구
 * @param {'success'|'error'} type
 */
export function showToast(message, type = "success") {
  let container = document.getElementById("toast-container");

  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    container.className = "toast-container";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  // 애니메이션 시작
  setTimeout(() => toast.classList.add("show"), 50);

  // 3초 후 제거
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 500);
  }, 3000);
}

/**
 * 다음 페이지에서 표시할 토스트 예약 (sessionStorage 활용)
 * @param {string} message
 * @param {'success'|'error'} type
 */
export function reserveToast(message, type = "success") {
  sessionStorage.setItem("toastMessage", message);
  sessionStorage.setItem("toastType", type);
}

/**
 * 페이지 로드 시 예약된 토스트가 있으면 표시 후 삭제
 */
export function checkReservedToast() {
  const message = sessionStorage.getItem("toastMessage");
  const type    = sessionStorage.getItem("toastType");

  if (message) {
    showToast(message, type || "success");
    sessionStorage.removeItem("toastMessage");
    sessionStorage.removeItem("toastType");
  }
}