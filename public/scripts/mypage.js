import { db, auth } from "./firebase/firebase.js";
import {
    doc, getDoc, setDoc, serverTimestamp,
    collection, query, orderBy, limit, getDocs
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { showToast, checkReservedToast } from "./toast.js";

// ── Firestore 필드명 ↔ DOM id 매핑 ──────────────────────────
// view-* : 읽기 모드 <p>
// input-* : 편집 모드 <input> / <select>
const TEXT_FIELDS = ["birthdate", "school", "region", "grade"];
// interest 는 칩(chip) UI로 별도 처리

document.addEventListener("DOMContentLoaded", () => {
    checkReservedToast();

    // ── DOM 참조 ──────────────────────────────────────────────
    const logoutBtn      = document.querySelector(".logout-btn");
    const editBtn        = document.getElementById("edit-btn");
    const cancelBtn      = document.getElementById("cancel-btn");
    const profileView    = document.getElementById("profile-view");
    const profileForm    = document.getElementById("profile-form");
    const saveBtn        = document.getElementById("save-btn");
    const interestChips  = document.querySelectorAll("#interest-chips .chip");

    let currentUser = null;          // 로그인한 유저 캐시
    let selectedInterests = [];      // 현재 선택된 관심 분야 배열

    // ── 1. 인증 상태 감지 ─────────────────────────────────────
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            if (!sessionStorage.getItem("isLogouting")) {
                window.location.replace("/login.html");
            }
            return;
        }
        currentUser = user;
        document.getElementById("view-email").textContent = user.email ?? "-";
        await loadProfile(user.uid);
        await loadBenefits(user.uid);
    });

    // ── 2. 프로필 불러오기 ────────────────────────────────────
    async function loadProfile(uid) {
        try {
            const snap = await getDoc(doc(db, "users", uid));
            if (snap.exists()) {
                renderProfileView(snap.data());
            }
        } catch (e) {
            console.error("프로필 로드 실패:", e);
            showToast("프로필 정보를 불러오지 못했습니다.", "error");
        }
    }

    // 읽기 모드 렌더링
    function renderProfileView(data) {
        const labels = {
            birthdate : "생년월일",
            school    : "학교명",
            region    : "거주지",
            grade     : "성적",
        };
        TEXT_FIELDS.forEach(field => {
            const el = document.getElementById(`view-${field}`);
            if (el) el.textContent = data[field] || "-";
        });

        const interestEl = document.getElementById("view-interest");
        if (interestEl) {
            interestEl.textContent =
                Array.isArray(data.interest) && data.interest.length
                    ? data.interest.join(", ")
                    : "-";
        }
    }

    // ── 3. 혜택 목록 불러오기 ────────────────────────────────
    async function loadBenefits(uid) {
        const container = document.getElementById("benefit-list");
        if (!container) return;
        try {
            const q = query(
                collection(db, "users", uid, "recentBenefits"),
                orderBy("createdAt", "desc"),
                limit(5)
            );
            const snapshot = await getDocs(q);
            if (!snapshot.empty) {
                container.innerHTML = "";
                snapshot.forEach(docSnap => {
                    const item = docSnap.data();
                    const div  = document.createElement("div");
                    div.className = "benefit-item";
                    div.innerHTML = `
                        <span>🎁 ${item.title}</span>
                        <a href="${item.url}" target="_blank" class="tag">신청하기</a>
                    `;
                    container.appendChild(div);
                });
            }
        } catch (e) {
            console.error("혜택 로드 실패:", e);
            container.innerHTML = `<div class="benefit-item"><span>혜택 정보를 불러오지 못했습니다.</span></div>`;
        }
    }

    // ── 4. 편집 모드 진입 ─────────────────────────────────────
    editBtn?.addEventListener("click", async () => {
        if (!currentUser) return;

        // 현재 Firestore 값을 폼에 채우기
        try {
            const snap = await getDoc(doc(db, "users", currentUser.uid));
            const data = snap.exists() ? snap.data() : {};

            TEXT_FIELDS.forEach(field => {
                const input = document.getElementById(`input-${field}`);
                if (input) input.value = data[field] ?? "";
            });

            // 관심 분야 칩 초기화
            selectedInterests = Array.isArray(data.interest) ? [...data.interest] : [];
            syncChips();
        } catch (e) {
            console.error("폼 초기화 실패:", e);
        }

        // 뷰↔폼 전환
        profileView.classList.add("hidden");
        profileForm.classList.remove("hidden");
        editBtn.classList.add("hidden");
    });

    // ── 5. 취소 ───────────────────────────────────────────────
    cancelBtn?.addEventListener("click", () => {
        profileForm.classList.add("hidden");
        profileView.classList.remove("hidden");
        editBtn.classList.remove("hidden");
    });

    // ── 6. 관심 분야 칩 토글 ──────────────────────────────────
    interestChips.forEach(chip => {
        chip.addEventListener("click", () => {
            const val = chip.dataset.value;
            if (selectedInterests.includes(val)) {
                selectedInterests = selectedInterests.filter(v => v !== val);
            } else {
                selectedInterests.push(val);
            }
            syncChips();
        });
    });

    function syncChips() {
        interestChips.forEach(chip => {
            chip.classList.toggle("active", selectedInterests.includes(chip.dataset.value));
        });
    }

    // ── 7. 저장 ───────────────────────────────────────────────
    profileForm?.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (!currentUser) return;

        // 유효성 검사
        const birthdate = document.getElementById("input-birthdate").value.trim();
        const school    = document.getElementById("input-school").value.trim();
        const region    = document.getElementById("input-region").value;
        const grade     = document.getElementById("input-grade").value.trim();

        if (!birthdate || !school || !region || !grade) {
            showToast("모든 항목을 입력해주세요.", "error");
            return;
        }

        const payload = {
            birthdate,
            school,
            region,
            grade,
            interest  : selectedInterests,
            updatedAt : serverTimestamp(),
        };

        saveBtn.disabled = true;
        saveBtn.textContent = "저장 중…";

        try {
            // merge: true → 기존 필드(email 등) 유지
            await setDoc(doc(db, "users", currentUser.uid), payload, { merge: true });

            renderProfileView(payload);          // 뷰 즉시 갱신
            profileForm.classList.add("hidden");
            profileView.classList.remove("hidden");
            editBtn.classList.remove("hidden");
            showToast("프로필이 저장되었습니다.", "success");
        } catch (err) {
            console.error("저장 실패:", err);
            showToast("저장 중 오류가 발생했습니다.", "error");
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = "저장하기";
        }
    });

    // ── 8. 사이드바 탭 활성화 ────────────────────────────────
    document.querySelectorAll(".sidebar-nav a").forEach(link => {
        link.addEventListener("click", () => {
            document.querySelectorAll(".sidebar-nav a").forEach(l => l.classList.remove("active"));
            link.classList.add("active");
        });
    });

    // ── 9. 로그아웃 모달 ─────────────────────────────────────
    logoutBtn?.addEventListener("click", () => {
        const modal = document.getElementById("custom-confirm-modal");
        modal
            ? modal.classList.add("show")
            : confirm("로그아웃 하시겠습니까?") && executeLogout();
    });

    document.getElementById("confirm-yes-btn")?.addEventListener("click", executeLogout);
    document.getElementById("confirm-no-btn")?.addEventListener("click", () => {
        document.getElementById("custom-confirm-modal")?.classList.remove("show");
    });
});

// ── 로그아웃 ─────────────────────────────────────────────────
async function executeLogout() {
    try {
        sessionStorage.setItem("isLogouting", "true");
        await signOut(auth);
        sessionStorage.clear();
        window.location.replace("/index.html");
    } catch (error) {
        console.error("로그아웃 에러:", error);
        showToast("로그아웃 중 오류가 발생했습니다.", "error");
    }
}