import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

import { auth } from "./firebase/firebase.js";
import { showToast, checkReservedToast } from "./toast.js";

// ── 인증 상태 감지 ──────────────────────────────────────────────
onAuthStateChanged(auth, (user) => {
  const nameEl = document.querySelector(".welcome-name em");
  if (user) {
    if (nameEl) nameEl.textContent = user.displayName || "사용자";
  } else {
    // 로그아웃 진행 중이 아닌데 user가 없으면 로그인 페이지로
    if (sessionStorage.getItem("isLogouting") !== "true") {
      window.location.replace("/login.html");
    }
  }
});

// ── 페이지 로드 시 예약 토스트 처리 ────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  checkReservedToast();
  setupLogout();
});

// ── 로그아웃 ───────────────────────────────────────────────────
function setupLogout() {
  const logoutBtn    = document.querySelector(".logout-btn");
  const confirmModal = document.getElementById("custom-confirm-modal");
  const confirmYes   = document.getElementById("confirm-yes-btn");
  const confirmNo    = document.getElementById("confirm-no-btn");

  if (!logoutBtn || !confirmModal) return;

  logoutBtn.addEventListener("click", (e) => {
    e.preventDefault();
    confirmModal.classList.add("show");
  });

  confirmNo.addEventListener("click", () => {
    confirmModal.classList.remove("show");
  });

  // 모달 바깥 클릭 시 닫기
  confirmModal.addEventListener("click", (e) => {
    if (e.target === confirmModal) confirmModal.classList.remove("show");
  });

  confirmYes.addEventListener("click", async () => {
    confirmModal.classList.remove("show");
    await executeLogout();
  });
}

async function executeLogout() {
  try {
    sessionStorage.setItem("isLogouting", "true");
    await signOut(auth);
    sessionStorage.removeItem("isLogouting");
    window.location.replace("/index.html");
  } catch (error) {
    console.error("로그아웃 실패:", error);
    showToast("로그아웃 중 오류가 발생했습니다.", "error");
    sessionStorage.removeItem("isLogouting");
  }
}