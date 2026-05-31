import { db, auth } from "./firebase/firebase.js";
import {
    doc, getDoc, setDoc, deleteDoc, serverTimestamp,
    collection, query, orderBy, limit, getDocs
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import {
    onAuthStateChanged, signOut,
    updatePassword, deleteUser,
    EmailAuthProvider, reauthenticateWithCredential
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { showToast, checkReservedToast } from "./toast.js";

const TEXT_FIELDS = ["birthdate", "school", "region"];

document.addEventListener("DOMContentLoaded", () => {
    checkReservedToast();

    // ── 미래 날짜 선택 제한 설정 ──────────────────────────────────
    const dateInput = document.getElementById("input-birthdate");
    if (dateInput) {
        // 오늘 날짜를 YYYY-MM-DD 형식으로 설정
        const today = new Date().toISOString().split('T')[0];
        dateInput.max = today;
    }

    const editBtn       = document.getElementById("edit-btn");
    const cancelBtn     = document.getElementById("cancel-btn");
    const profileView   = document.getElementById("profile-view");
    const profileForm   = document.getElementById("profile-form");
    const saveBtn       = document.getElementById("save-btn");
    const interestChips = document.querySelectorAll("#interest-chips .chip");

    let currentUser        = null;
    let selectedInterests  = [];

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
            if (snap.exists()) renderProfileView(snap.data());
        } catch (e) {
            console.error("프로필 로드 실패:", e);
            showToast("프로필 정보를 불러오지 못했습니다.", "error");
        }
    }

    function renderProfileView(data) {
        TEXT_FIELDS.forEach(field => {
            const el = document.getElementById(`view-${field}`);
            if (el) el.textContent = data[field] || "-";
        });
        
        const gradeEl = document.getElementById("view-grade");
        if (gradeEl) {
            if (Array.isArray(data.grades) && data.grades.length > 0) {
                const latest = data.grades[data.grades.length - 1];
                gradeEl.textContent = `${latest.semester} - 평균 ${latest.gpa}등급`;
            } else {
                gradeEl.textContent = "입력된 성적이 없습니다.";
            }
        }
        
        const interestEl = document.getElementById("view-interest");
        if (interestEl) {
            interestEl.textContent =
                Array.isArray(data.interest) && data.interest.length
                ? data.interest.join(", ") : "-";
        }
    }

    // ── 3. 혜택 불러오기 ─────────────────────────────────────
    async function loadBenefits(uid) {
        const container = document.getElementById("benefit-list");
        if (!container) return;
        try {
            const q = query(
                collection(db, "users", uid, "recentBenefits"),
                orderBy("createdAt", "desc"), limit(5)
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

    // ── 4. 프로필 편집 및 저장 ────────────────────────────────────
    editBtn?.addEventListener("click", async () => {
        if (!currentUser) return;
        try {
            const snap = await getDoc(doc(db, "users", currentUser.uid));
            const data = snap.exists() ? snap.data() : {};
            TEXT_FIELDS.forEach(field => {
                const input = document.getElementById(`input-${field}`);
                if (input) input.value = data[field] ?? "";
            });
            selectedInterests = Array.isArray(data.interest) ? [...data.interest] : [];
            syncChips();
        } catch (e) {
            console.error("폼 초기화 실패:", e);
        }
        profileView.classList.add("hidden");
        profileForm.classList.remove("hidden");
        editBtn.classList.add("hidden");
    });

    cancelBtn?.addEventListener("click", () => {
        profileForm.classList.add("hidden");
        profileView.classList.remove("hidden");
        editBtn.classList.remove("hidden");
    });

    interestChips.forEach(chip => {
        chip.addEventListener("click", () => {
            const val = chip.dataset.value;
            selectedInterests = selectedInterests.includes(val)
                ? selectedInterests.filter(v => v !== val)
                : [...selectedInterests, val];
            syncChips();
        });
    });

    function syncChips() {
        interestChips.forEach(chip =>
            chip.classList.toggle("active", selectedInterests.includes(chip.dataset.value))
        );
    }

    profileForm?.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (!currentUser) return;

        const birthdate = document.getElementById("input-birthdate").value.trim();
        const school    = document.getElementById("input-school").value.trim();
        const region    = document.getElementById("input-region").value;

        // 필수 항목 검사
        if (!birthdate || !school || !region ) {
            showToast("모든 항목을 입력해주세요.", "error");
            return;
        }

        // 미래 날짜 검증 로직 추가
        const selectedDate = new Date(birthdate);
        const today = new Date();
        today.setHours(23, 59, 59, 999); // 오늘 날짜의 마지막 시각으로 설정하여 오늘 생일은 허용

        if (selectedDate > today) {
            showToast("생년월일은 미래 날짜일 수 없습니다.", "error");
            return;
        }

        const payload = { birthdate, school, region,
                          interest: selectedInterests, updatedAt: serverTimestamp() };

        saveBtn.disabled = true;
        saveBtn.textContent = "저장 중…";
        try {
            await setDoc(doc(db, "users", currentUser.uid), payload, { merge: true });
            renderProfileView(payload);
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

    // ── 5. 비밀번호 변경 ──────────────────────────────────────
    const pwToggleBtn  = document.getElementById("pw-toggle-btn");
    const pwForm       = document.getElementById("pw-form");
    const pwSaveBtn    = document.getElementById("pw-save-btn");
    const pwCancelBtn  = document.getElementById("pw-cancel-btn");

    pwToggleBtn?.addEventListener("click", () => {
        pwForm.classList.toggle("hidden");
        if (!pwForm.classList.contains("hidden")) {
            pwForm.reset();
        }
    });

    pwCancelBtn?.addEventListener("click", () => {
        pwForm.classList.add("hidden");
        pwForm.reset();
    });

    pwForm?.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (!currentUser) return;

        const currentPw  = document.getElementById("input-current-pw").value;
        const newPw      = document.getElementById("input-new-pw").value;
        const newPwCheck = document.getElementById("input-new-pw-confirm").value;

        if (!currentPw || !newPw || !newPwCheck) {
            showToast("모든 항목을 입력해주세요.", "error"); return;
        }
        if (newPw.length < 8) {
            showToast("새 비밀번호는 8자 이상이어야 합니다.", "error"); return;
        }
        if (newPw !== newPwCheck) {
            showToast("새 비밀번호가 일치하지 않습니다.", "error"); return;
        }
        if (currentPw === newPw) {
            showToast("현재 비밀번호와 다른 비밀번호를 입력해주세요.", "error"); return;
        }

        pwSaveBtn.disabled = true;
        pwSaveBtn.textContent = "변경 중…";
        try {
            const credential = EmailAuthProvider.credential(currentUser.email, currentPw);
            await reauthenticateWithCredential(currentUser, credential);
            await updatePassword(currentUser, newPw);

            pwForm.classList.add("hidden");
            pwForm.reset();
            showToast("비밀번호가 변경되었습니다.", "success");
        } catch (err) {
            console.error("비밀번호 변경 실패:", err);
            if (err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
                showToast("현재 비밀번호가 올바르지 않습니다.", "error");
            } else if (err.code === "auth/too-many-requests") {
                showToast("요청이 너무 많습니다. 잠시 후 다시 시도해주세요.", "error");
            } else {
                showToast("비밀번호 변경 중 오류가 발생했습니다.", "error");
            }
        } finally {
            pwSaveBtn.disabled = false;
            pwSaveBtn.textContent = "변경 완료";
        }
    });

    // ── 6. 계정 삭제 ──────────────────────────────────────────
    const deleteAccountBtn    = document.getElementById("delete-account-btn");
    const deleteModal         = document.getElementById("delete-modal");
    const deleteConfirmYesBtn = document.getElementById("delete-btn-yes");
    const deleteConfirmNoBtn  = document.getElementById("delete-btn-no");
    const deletePwInput       = document.getElementById("delete-pw-input");

    deleteAccountBtn?.addEventListener("click", () => {
        deletePwInput.value = "";
        deleteModal.classList.add("show");
    });

    deleteConfirmNoBtn?.addEventListener("click", () => {
        deleteModal.classList.remove("show");
        deletePwInput.value = "";
    });

    deleteConfirmYesBtn?.addEventListener("click", async () => {
        if (!currentUser) return;
        const pw = deletePwInput.value;
        if (!pw) {
            showToast("비밀번호를 입력해주세요.", "error"); return;
        }

        deleteConfirmYesBtn.disabled = true;
        deleteConfirmYesBtn.textContent = "처리 중…";
        try {
            const credential = EmailAuthProvider.credential(currentUser.email, pw);
            await reauthenticateWithCredential(currentUser, credential);
            await deleteDoc(doc(db, "users", currentUser.uid));
            await deleteUser(currentUser);

            sessionStorage.clear();
            localStorage.clear();
            window.location.replace("/index.html");
        } catch (err) {
            console.error("계정 삭제 실패:", err);
            if (err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
                showToast("비밀번호가 올바르지 않습니다.", "error");
            } else {
                showToast("계정 삭제 중 오류가 발생했습니다.", "error");
            }
        } finally {
            deleteConfirmYesBtn.disabled = false;
            deleteConfirmYesBtn.textContent = "삭제하기";
        }
    });

    // ── 7. 사이드바 탭 ───────────────────────────────────────
    document.querySelectorAll(".sidebar-nav a").forEach(link => {
        link.addEventListener("click", () => {
            document.querySelectorAll(".sidebar-nav a").forEach(l => l.classList.remove("active"));
            link.classList.add("active");
        });
    });
});