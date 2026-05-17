import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import app from "./firebase/firebase.js"; // 경로가 다를 경우 수정 필요

const auth = getAuth(app);

// 1. 페이지 로드 시 사용자 상태 확인 및 이름 표시
onAuthStateChanged(auth, (user) => {
  const nameElement = document.querySelector('.welcome-name em');
  
  if (user) {
    // Firebase Auth에 저장된 displayName이 있으면 표시, 없으면 '사용자'로 표시
    if (user.displayName) {
      nameElement.textContent = user.displayName;
    } else {
      nameElement.textContent = "사용자";
    }
    console.log("로그인 유지 중:", user.displayName);
  } else {
    // 로그인되지 않은 경우 로그인 페이지로 리다이렉트 (선택 사항)
    alert("로그인이 필요한 서비스입니다.");
    location.href = './login.html';
  }
});

// 2. 로그아웃 기능 구현
const logoutBtn = document.querySelector('.logout-btn');

if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    if (confirm("로그아웃 하시겠습니까?")) {
      try {
        await signOut(auth);
        alert("로그아웃 되었습니다.");
        location.href = './login.html';
      } catch (error) {
        console.error("로그아웃 실패:", error);
        alert("로그아웃 중 오류가 발생했습니다.");
      }
    }
  });
}