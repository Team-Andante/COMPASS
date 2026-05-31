import { signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { auth } from "./firebase/firebase.js";

document.addEventListener("DOMContentLoaded", () => {
    // 1. 필요한 DOM 요소들 가져오기
    const logoutBtn = document.querySelector(".logout-btn");
    const confirmModal = document.getElementById("logout-modal");
    const confirmYesBtn = document.getElementById("logout-btn-yes");
    const confirmNoBtn = document.getElementById("logout-btn-no");

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
            sessionStorage.setItem("isLogouting", "true");
            // await signOut(auth);
            sessionStorage.clear();
            window.location.replace("/index.html");
        } catch (error) {
            console.error("로그아웃 에러:", error);
            confirmModal?.classList.remove("show");
        }
    });
});