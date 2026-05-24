console.log("%c🚀 새 버전의 reged.js가 로드되었습니다! (v1.0.1)", "color: yellow; background: black; font-size: 20px;");

import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { auth } from "./firebase/firebase.js";
import { showToast, checkReservedToast } from "./toast.js";

document.addEventListener("DOMContentLoaded", () => {
    checkReservedToast();

    // Firebase 인증 상태 관찰
    onAuthStateChanged(auth, async (user) => {
        const nameEl = document.querySelector(".welcome-name em");
        
        if (user) {
            // [수정] Firebase 서버에서 최신 정보를 다시 가져옵니다.
            try { await user.reload(); } catch(e) {}
            
            const finalName = user.displayName || sessionStorage.getItem("userName") || user.email.split('@')[0] || "사용자";
            
            if (nameEl) {
                nameEl.textContent = finalName; // 여기서 화면의 "사용자"가 실제 이름으로 바뀝니다.
            }
            sessionStorage.setItem("userName", finalName);
        } else {
            // 로그아웃 중이 아닐 때만 로그인 페이지로 보냄 (무한 리다이렉트 방지)
            if (!sessionStorage.getItem("isLogouting")) {
                window.location.replace("/login.html");
            }
        }
    });

    // 로그아웃 버튼 연결
    document.querySelector(".logout-btn")?.addEventListener("click", async () => {
        if (confirm("로그아웃 하시겠습니까?")) {
            sessionStorage.setItem("isLogouting", "true");
            await signOut(auth);
            sessionStorage.clear();
            window.location.replace("/index.html");
        }
    });
});