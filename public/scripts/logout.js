import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { auth } from "./firebase/firebase.js";
import { showToast, checkReservedToast } from "./toast.js";

document.addEventListener("DOMContentLoaded", () => {
    checkReservedToast();

    // 1. 필요한 DOM 요소들 가져오기
    const logoutBtn = document.querySelector(".logout-btn");
    const confirmModal = document.getElementById("custom-confirm-modal");
    const confirmYesBtn = document.getElementById("confirm-yes-btn");
    const confirmNoBtn = document.getElementById("confirm-no-btn");

    // 2. 로그아웃 버튼 클릭 시 모달 표시
    logoutBtn?.addEventListener("click", () => {
        confirmModal?.classList.add("show"); // style.css에 정의된 show 클래스 추가
    });

    // 3. 모달에서 '취소' 클릭 시 모달 닫기
    confirmNoBtn?.addEventListener("click", () => {
        confirmModal?.classList.remove("show");
    });

    // 4. 모달에서 '확인' 클릭 시 실제 로그아웃 수행
    confirmYesBtn?.addEventListener("click", async () => {
        try {
            sessionStorage.setItem("isLogouting", "true"); //
            await signOut(auth); //
            sessionStorage.clear(); //
            window.location.replace("/index.html"); //
        } catch (error) {
            console.error("로그아웃 에러:", error);
            confirmModal?.classList.remove("show");
        }
    });

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
});