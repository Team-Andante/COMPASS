import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { auth } from "./firebase/firebase.js";
import { showToast, reserveToast } from "./toast.js";

const onLogin = async (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    try {
        const { user } = await signInWithEmailAndPassword(auth, email, password);
        
        // [수정] 닉네임이 없으면 이메일 앞부분이라도 강제로 저장합니다.
        const displayName = user.displayName || email.split('@')[0];
        sessionStorage.setItem("userName", displayName);

        reserveToast(`${displayName}님, 반갑습니다!`, "success");
        
        // [중요] 배포 환경에서는 상대 경로보다 루트 경로(/)가 훨씬 안전합니다.
        window.location.assign("/index_reged.html"); 
    } catch (error) {
        console.error("Login Error:", error.code);
        showToast("로그인 정보를 다시 확인해주세요.", "error");
    }
};

document.getElementById("login-form")?.addEventListener("submit", onLogin);

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
});