import {
  signInWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

import { auth } from "./firebase/firebase.js";
import { showToast, reserveToast } from "./toast.js";

// Firebase Auth 에러 코드 → 한국어 메시지
const AUTH_ERRORS = {
  "auth/invalid-credential":    "이메일 또는 비밀번호가 올바르지 않습니다.",
  "auth/user-not-found":        "등록되지 않은 이메일입니다.",
  "auth/wrong-password":        "비밀번호가 올바르지 않습니다.",
  "auth/invalid-email":         "이메일 형식이 올바르지 않습니다.",
  "auth/user-disabled":         "이 계정은 비활성화되었습니다. 관리자에게 문의하세요.",
  "auth/too-many-requests":     "로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.",
  "auth/network-request-failed":"네트워크 연결을 확인해주세요.",
};

function setLoading(isLoading) {
  const btn = document.getElementById("submit-btn");
  const spinner = document.getElementById("btn-spinner");
  const btnText = document.getElementById("btn-text");
  if (!btn) return;
  btn.disabled = isLoading;
  if (spinner) spinner.style.display = isLoading ? "inline-block" : "none";
  if (btnText) btnText.textContent = isLoading ? "로그인 중..." : "로그인하기";
}

const onLogin = async (e) => {
  e.preventDefault();

  const email    = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  if (!email || !password) {
    showToast("이메일과 비밀번호를 모두 입력해주세요.", "error");
    return;
  }

  setLoading(true);

  try {
    const { user } = await signInWithEmailAndPassword(auth, email, password);
    const name = user.displayName || "사용자";

    // 다음 페이지에서 표시할 토스트 예약 후 이동
    reserveToast(`${name}님, 환영합니다! 👋`, "success");
    window.location.replace("/index_reged.html");
  } catch (error) {
    const msg = AUTH_ERRORS[error.code] || `로그인 오류가 발생했습니다. (${error.code})`;
    showToast(msg, "error");
    setLoading(false);
  }
};

document.getElementById("login-form")?.addEventListener("submit", onLogin);

// 비밀번호 표시 토글
document.getElementById("toggle-password")?.addEventListener("click", () => {
  const input = document.getElementById("password");
  const icon  = document.getElementById("toggle-password");
  if (input.type === "password") {
    input.type = "text";
    icon.textContent = "🙈";
  } else {
    input.type = "password";
    icon.textContent = "👁️";
  }
});