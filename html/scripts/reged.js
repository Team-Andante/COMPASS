import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import app from "./firebase/firebase.js";
import { showToast, checkReservedToast, checkNextPage } from "./toast.js";

const auth = getAuth(app);

// 사용자 로그인 상태 감시
onAuthStateChanged(auth, (user) => {
  const nameElement = document.querySelector('.welcome-name em');
  if (user) {
    if (nameElement) nameElement.textContent = user.displayName || "사용자";
  } else {
    if (sessionStorage.getItem("isLogouting") !== "true") {
      window.location.replace('./index.html');
    }
  }
});

document.addEventListener('DOMContentLoaded', () => {
  // 전 페이지에서 넘어온 예약 토스트가 있다면 실행
  checkReservedToast();
});

// 로그아웃 기능 구현 (커스텀 상단 알림 제어)
document.addEventListener('DOMContentLoaded', () => {
  const logoutBtn = document.querySelector('.logout-btn');
  const confirmModal = document.getElementById('custom-confirm-modal');
  const confirmYesBtn = document.getElementById('confirm-yes-btn');
  const confirmNoBtn = document.getElementById('confirm-no-btn');

  if (logoutBtn && confirmModal) {
    // 로그아웃 클릭 -> 상단 알림창 보여주기
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log("🚀 로그아웃 알림창 표시");
      confirmModal.classList.add('show'); 
    });

    // 취소 클릭 -> 알림창 숨김
    confirmNoBtn.addEventListener('click', () => {
      confirmModal.classList.remove('show');
    });

    // 확인 클릭 -> 실제 비동기 로그아웃 
    confirmYesBtn.addEventListener('click', async () => {
      confirmModal.classList.remove('show'); // 알림창 닫기
      await executeLogout();
    });
  }
});

// 로그아웃 비동기 처리 함수
async function executeLogout() {
  try {
    sessionStorage.setItem("isLogouting", "true");
    console.log("⏳ Firebase signOut 실행 중...");
    
    await signOut(auth);
    
    console.log("✅ 로그아웃 성공");
    sessionStorage.removeItem("isLogouting");
    window.location.replace('./index.html');
  } catch (error) {
    console.error("❌ 로그아웃 실패:", error);
    alert("로그아웃 중 오류가 발생했습니다.");
    sessionStorage.removeItem("isLogouting");
  }
}