import { db, auth } from "./firebase/firebase.js";
import { collection, query, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { showToast, checkReservedToast } from "./toast.js";

document.addEventListener("DOMContentLoaded", () => {
    checkReservedToast();

    const userEmailEl = document.getElementById("user-email");
    const userGradeEl = document.getElementById("user-grade");
    const userInterestEl = document.getElementById("user-interest");
    const logoutBtn = document.querySelector(".logout-btn");

    // 1. 인증 상태 관찰
    onAuthStateChanged(auth, async (user) => {
        if (user) {
                const benefitListContainer = document.getElementById("benefit-list");
                if (!benefitListContainer) return;

                // 1. Firestore에서 해당 유저의 혜택 데이터 쿼리 (최신순 5개)
                const q = query(
                    collection(db, "users", user.uid, "recentBenefits"),
                    orderBy("createdAt", "desc"),
                    limit(5)
                );

                const querySnapshot = await getDocs(q);
                
                if (!querySnapshot.empty) {
                    benefitListContainer.innerHTML = ''; // 기본 문구 제거
                    
                    querySnapshot.forEach((doc) => {
                        const item = doc.data();
                        const benefitItem = document.createElement('div');
                        benefitItem.className = 'benefit-item';
                        benefitItem.innerHTML = `
                            <span>🎁 ${item.title}</span>
                            <a href="${item.url}" target="_blank" class="tag">신청하기</a>
                        `;
                        benefitListContainer.appendChild(benefitItem);
                    });
                }
        }
        else {
            // 로그인 안 된 경우 로그인 페이지로 튕기기
            if (!sessionStorage.getItem("isLogouting")) {
                window.location.replace("/login.html");
            }
        }
    });

    // 2. 사이드바 메뉴 탭 전환 (시각적 효과)
    const sidebarLinks = document.querySelectorAll(".sidebar-nav a");
    sidebarLinks.forEach(link => {
        link.addEventListener("click", (e) => {
            sidebarLinks.forEach(l => l.classList.remove("active"));
            link.classList.add("active");
        });
    });

    // 3. 로그아웃 기능 (index_reged.html에 있는 커스텀 모달이 mypage에도 있다면 사용 가능)
    // 만약 모달이 없다면 기본 confirm을 사용하도록 처리했습니다.
    logoutBtn?.addEventListener("click", () => {
        const confirmModal = document.getElementById("custom-confirm-modal");
        if (confirmModal) {
            confirmModal.classList.add("show");
        } else {
            if (confirm("로그아웃 하시겠습니까?")) {
                executeLogout();
            }
        }
    });

document.addEventListener("DOMContentLoaded", () => {
    // ... 기존 로그인 체크 로직 ...

    const benefitListContainer = document.getElementById("benefit-list");

    if (benefitListContainer) {
        // 1. 저장된 혜택 데이터 가져오기
        const savedBenefits = JSON.parse(localStorage.getItem('recentBenefits') || '[]');

        if (savedBenefits.length > 0) {
            // 2. 기본 문구 삭제
            benefitListContainer.innerHTML = ''; 

            // 3. 데이터를 순회하며 HTML 생성
            savedBenefits.forEach(item => {
                const benefitItem = document.createElement('div');
                benefitItem.className = 'benefit-item';
                benefitItem.innerHTML = `
                    <span>🎁 ${item.title}</span>
                    <a href="${item.url}" target="_blank" class="tag">신청하기</a>
                `;
                benefitListContainer.appendChild(benefitItem);
            });
        }
    }
});

    // 모달 확인 버튼 이벤트 (모달이 존재하는 경우)
    document.getElementById("confirm-yes-btn")?.addEventListener("click", executeLogout);
    document.getElementById("confirm-no-btn")?.addEventListener("click", () => {
        document.getElementById("custom-confirm-modal")?.classList.remove("show");
    });
});

async function executeLogout() {
    try {
        sessionStorage.setItem("isLogouting", "true");
        await signOut(auth);
        sessionStorage.clear();
        localStorage.removeItem("userGrade"); // 필요시 유지
        localStorage.removeItem("userInterest"); // 필요시 유지
        window.location.replace("/index.html");
    } catch (error) {
        console.error("로그아웃 에러:", error);
        showToast("로그아웃 중 오류가 발생했습니다.", "error");
    }
}