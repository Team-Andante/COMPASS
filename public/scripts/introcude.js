import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { auth } from "./firebase/firebase.js";

document.addEventListener("DOMContentLoaded", () => {
    onAuthStateChanged(auth, async (user) => {
        const guestElements = document.querySelectorAll(".guest-only");
        const userElements = document.querySelectorAll(".user-only");
        const nameEl = document.querySelector(".welcome-name em");

        if (user) {
            // 1. 로그인 된 상태
            guestElements.forEach(el => el.style.display = "none"); // 로그인/시작하기 숨김
            userElements.forEach(el => el.style.display = "inline-block"); // 마이페이지/로그아웃 표시

            // 사용자 이름 표시 로직 (기존 유지)
            try { await user.reload(); } catch(e) {}
            const finalName = user.displayName || sessionStorage.getItem("userName") || user.email.split('@')[0] || "사용자";
            if (nameEl) nameEl.textContent = finalName;
            
        } else {
            // 2. 로그아웃 된 상태
            guestElements.forEach(el => el.style.display = "inline-block"); // 로그인/시작하기 표시
            userElements.forEach(el => el.style.display = "none"); // 마이페이지/로그아웃 숨김
            
            if (nameEl) nameEl.textContent = "사용자";
        }
    });
});