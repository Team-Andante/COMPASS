import { db, auth } from "./firebase/firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// 상태 관리 변수 (중복 선언 방지를 위해 let 사용)
let currentSelectedCategory = "welfare"; 
let currentUserProfile = null;
let isFirebaseConnected = false;

// UI 요소 캐싱
const elements = {
    toastContainer: document.getElementById("toastContainer"),
    generateBtn: document.getElementById("generateBtn"),
    loadingIndicator: document.getElementById("loadingIndicator"),
    promptContainer: document.getElementById("promptContainer"),
    promptResult: document.getElementById("promptResult"),
    copyAndGoBtn: document.getElementById("copyAndGoBtn"),
    cardWelfare: document.getElementById("cate-welfare"),
    cardScholarship: document.getElementById("cate-scholarship"),
    metaAge: document.getElementById("meta-age"),
    metaMajor: document.getElementById("meta-major"),
    metaIncome: document.getElementById("meta-income"),
    metaLocation: document.getElementById("meta-location"),
    authStateBtn: document.getElementById("auth-state-btn")
};

// [함수] 고유한 이름의 토스트 알림 (중복 선언 에러 방지)
function showCompassToast(message, type = "success") {
    if (!elements.toastContainer) return;
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    elements.toastContainer.appendChild(toast);
    setTimeout(() => toast.classList.add("show"), 10);
    setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

// [함수] 나이 계산
function getManAge(birthStr) {
    if (!birthStr) return 17;
    const cleaned = birthStr.replace(/[^0-9]/g, "");
    if (cleaned.length < 8) return 17;
    const birthYear = parseInt(cleaned.substring(0, 4));
    const today = new Date();
    return today.getFullYear() - birthYear;
}

// [함수] 프로필 UI 업데이트
function updateProfileUI(data) {
    if (!data) return;
    if (elements.metaAge) elements.metaAge.textContent = `만 ${getManAge(data.birthdate)}세`;
    if (elements.metaMajor) elements.metaMajor.textContent = data.school || "미지정";
    if (elements.metaIncome) elements.metaIncome.textContent = data.grade ? `${data.grade} 등급` : "정보 없음";
    if (elements.metaLocation) elements.metaLocation.textContent = data.region || "지역 미설정";
}

// [함수] 카테고리 선택 (테두리 강조 효과)
function handleCategorySelect(category) {
    currentSelectedCategory = category;
    
    if (category === "welfare") {
        elements.cardWelfare?.classList.add("selected");
        elements.cardScholarship?.classList.remove("selected");
        showCompassToast("복지 서비스 분야가 선택되었습니다.");
    } else {
        elements.cardScholarship?.classList.add("selected");
        elements.cardWelfare?.classList.remove("selected");
        showCompassToast("장학금 정보 분야가 선택되었습니다.");
    }
    
    // 결과창 초기화
    if (elements.promptContainer) elements.promptContainer.style.display = "none";
}

// [함수] AI 프롬프트 생성 (Cloud Functions 연동)
async function generateAIPrompt() {
    if (!currentUserProfile) {
        showCompassToast("사용자 정보를 불러오는 중입니다.", "error");
        return;
    }

    elements.generateBtn.disabled = true;
    elements.loadingIndicator.style.display = "flex";
    elements.promptContainer.style.display = "none";

    const projectId = "compass-85721"; // 실제 프로젝트 ID 확인 필요
    const url = `https://us-central1-${projectId}.cloudfunctions.net/recommend`;

    const profile = currentUserProfile;
    const categoryName = currentSelectedCategory === "welfare" ? "청소년 복지/혜택" : "장학금 지원";

    const payload = {
        message: `나는 만 ${getManAge(profile.birthdate)}세, ${profile.region}에 거주하며 ${profile.school}에 재학 중인 학생이야. 관심사는 ${profile.interest?.join(", ")}이야. 이 조건에 맞는 '${categoryName}' 정보를 NotebookLM에서 검색할 수 있도록 1인칭 질문 프롬프트를 3줄 내외로 작성해줘.`
    };

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error("서버 응답 오류");
        
        const resData = await response.json();
        elements.promptResult.value = resData.answer || "추천 프롬프트를 생성할 수 없습니다.";
        elements.promptContainer.style.display = "flex";
        showCompassToast("맞춤 프롬프트가 생성되었습니다!");
    } catch (err) {
        console.error(err);
        showCompassToast("생성 실패. 잠시 후 다시 시도해주세요.", "error");
    } finally {
        elements.generateBtn.disabled = false;
        elements.loadingIndicator.style.display = "none";
    }
}

// [함수] 복사 및 이동
function copyAndGo() {
    const text = elements.promptResult.value;
    navigator.clipboard.writeText(text).then(() => {
        showCompassToast("복사 완료! NotebookLM으로 이동합니다.");
        setTimeout(() => {
            const targetUrl = currentSelectedCategory === "welfare" 
                ? "https://notebooklm.google.com/notebook/dc8a10f3-fd74-4510-a0ac-a4082202dcd3"
                : "https://notebooklm.google.com/notebook/2ec911a4-25bb-44fa-9ae7-73dcfee81bb5";
            window.open(targetUrl, "_blank");
        }, 1000);
    });
}

// --- 초기화 및 이벤트 바인딩 ---
document.addEventListener("DOMContentLoaded", () => {
    // 1. 기본 데모 데이터 설정
    currentUserProfile = {
        name: "학생",
        birthdate: "20090101",
        school: "컴패스 고등학교",
        region: "경상북도 구미시",
        grade: "3.5",
        interest: ["복지", "장학금"]
    };
    updateProfileUI(currentUserProfile);

    // 2. 카테고리 카드 이벤트
    elements.cardWelfare?.addEventListener("click", () => handleCategorySelect("welfare"));
    elements.cardScholarship?.addEventListener("click", () => handleCategorySelect("scholarship"));

    // 3. 버튼 이벤트
    elements.generateBtn?.addEventListener("click", generateAIPrompt);
    elements.copyAndGoBtn?.addEventListener("click", copyAndGo);

    // 4. 파이어베이스 인증 감시
    if (auth) {
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                isFirebaseConnected = true;
                const docRef = doc(db, "users", user.uid);
                const snap = await getDoc(docRef);
                if (snap.exists()) {
                    currentUserProfile = snap.data();
                    updateProfileUI(currentUserProfile);
                }
                if (elements.authStateBtn) elements.authStateBtn.textContent = "로그아웃";
            }
        });
    }
});