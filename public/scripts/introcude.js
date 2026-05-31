import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { auth } from "./firebase/firebase.js";

document.addEventListener("DOMContentLoaded", () => {
    onAuthStateChanged(auth, async (user) => {
        const guestElements = document.querySelectorAll(".guest-only");
        const userElements = document.querySelectorAll(".user-only");

        if (user) {
            // 1. 로그인 된 상태
            guestElements.forEach(el => el.style.display = "none"); // 로그인/시작하기 숨김
            userElements.forEach(el => el.style.display = "inline-block"); // 마이페이지/로그아웃 표시            
        } else {
            // 2. 로그아웃 된 상태
            guestElements.forEach(el => el.style.display = "inline-block"); // 로그인/시작하기 표시
            userElements.forEach(el => el.style.display = "none"); // 마이페이지/로그아웃 숨김
        }
    });
});