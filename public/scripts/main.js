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

const pwInput     = document.getElementById('password');
const strengthBar = document.getElementById('pw-strength');
const strengthHint = document.getElementById('pw-strength-hint');

pwInput?.addEventListener('input', () => {
    const v = pwInput.value;
    strengthBar.className = 'pw-strength';
    if (!v) { strengthHint.textContent = ''; return; }

    const hasLetter = /[a-zA-Z]/.test(v);
    const hasNumber = /[0-9]/.test(v);
    const hasSpecial = /[^a-zA-Z0-9]/.test(v);
    const score = (v.length >= 8 ? 1 : 0) + (hasLetter && hasNumber ? 1 : 0) + (hasSpecial ? 1 : 0);

    if (v.length < 6) {
        strengthBar.classList.add('weak');
        strengthHint.textContent = '너무 짧습니다 (최소 6자)';
        strengthHint.style.color = '#ef4444';
    } else if (score <= 1) {
        strengthBar.classList.add('weak');
        strengthHint.textContent = '보통 이하 — 숫자/특수문자를 추가해보세요';
        strengthHint.style.color = '#ef4444';
    } else if (score === 2) {
        strengthBar.classList.add('medium');
        strengthHint.textContent = '보통 수준';
        strengthHint.style.color = '#f59e0b';
    } else {
        strengthBar.classList.add('strong');
        strengthHint.textContent = '안전한 비밀번호입니다 ✅';
        strengthHint.style.color = '#22c55e';
    }
});

// 비밀번호 토글 (main.js에도 있지만 확인란과 분리)
document.addEventListener('DOMContentLoaded', () => {
    // 비밀번호 토글
    const togglePassword = document.getElementById('toggle-password');
    const passwordInput = document.getElementById('password');

    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', () => {
            const isPassword = passwordInput.type === 'password';
            passwordInput.type = isPassword ? 'text' : 'password';
            togglePassword.textContent = isPassword ? '◉' : '⊘';
        });
    }

    // 비밀번호 확인 토글 (동일한 로직 추가)
    const toggleConfirm = document.getElementById('toggle-password-confirm');
    const confirmInput = document.getElementById('password-confirm');

    if (confirmInput) {
        toggleConfirm.addEventListener('click', () => {
            const isPassword = confirmInput.type === 'password';
            confirmInput.type = isPassword ? 'text' : 'password';
            toggleConfirm.textContent = isPassword ? '◉' : '⊘';
        });
    }
});