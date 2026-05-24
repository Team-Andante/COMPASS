import {
  createUserWithEmailAndPassword,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

import { auth } from "./firebase/firebase.js";
import { showToast, reserveToast } from "./toast.js";

const AUTH_ERRORS = {
  "auth/email-already-in-use":  "이미 사용 중인 이메일 주소입니다.",
  "auth/invalid-email":         "이메일 형식이 올바르지 않습니다.",
  "auth/weak-password":         "비밀번호는 최소 6자 이상이어야 합니다.",
  "auth/network-request-failed":"네트워크 연결을 확인해주세요.",
  "auth/operation-not-allowed": "이메일/비밀번호 로그인이 비활성화되어 있습니다.",
};

function setLoading(isLoading) {
  const btn     = document.getElementById("submit-btn");
  const spinner = document.getElementById("btn-spinner");
  const btnText = document.getElementById("btn-text");
  if (!btn) return;
  btn.disabled = isLoading;
  if (spinner) spinner.style.display = isLoading ? "inline-block" : "none";
  if (btnText) btnText.textContent   = isLoading ? "처리 중..." : "가입 완료하기";
}

function setupPasswordConfirmValidation() {
  const pwInput   = document.getElementById("password");
  const pwConfirm = document.getElementById("password-confirm");
  const pwHint    = document.getElementById("pw-confirm-hint");
  if (!pwConfirm || !pwHint) return;

  const check = () => {
    if (!pwConfirm.value) {
      pwHint.textContent = "";
      pwConfirm.style.borderColor = "";
      return;
    }
    const match = pwInput.value === pwConfirm.value;
    pwHint.textContent         = match ? "✅ 비밀번호가 일치합니다." : "❌ 비밀번호가 일치하지 않습니다.";
    pwHint.style.color         = match ? "#22c55e" : "#ef4444";
    pwConfirm.style.borderColor = match ? "#22c55e" : "#ef4444";
  };

  pwInput.addEventListener("input", check);
  pwConfirm.addEventListener("input", check);
}

const onSubmit = async (e) => {
  e.preventDefault();

  const name      = document.getElementById("name").value.trim();
  const email     = document.getElementById("email").value.trim();
  const password  = document.getElementById("password").value;
  const pwConfirm = document.getElementById("password-confirm").value;
  const agreed    = document.getElementById("terms-agreement")?.checked;

  if (!name)                    { showToast("이름을 입력해주세요.", "error"); return; }
  if (password.length < 6)      { showToast("비밀번호는 최소 6자 이상이어야 합니다.", "error"); return; }
  if (password !== pwConfirm)   { showToast("비밀번호가 일치하지 않습니다.", "error"); return; }
  if (!agreed)                  { showToast("이용약관에 동의해주세요.", "error"); return; }

  setLoading(true);

  try {
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(user, { displayName: name });

    // 회원가입 직후에도 sessionStorage에 저장
    sessionStorage.setItem("userName", name);

    reserveToast(`${name}님, 가입을 환영합니다! 🎉`, "success");
    window.location.replace("/login.html");
  } catch (error) {
    const msg = AUTH_ERRORS[error.code] || `오류가 발생했습니다. (${error.code})`;
    showToast(msg, "error");
    setLoading(false);
  }
};

const signupForm = document.getElementById("signup-form");
if (signupForm) {
  signupForm.addEventListener("submit", onSubmit);
  setupPasswordConfirmValidation();
}

export default auth;