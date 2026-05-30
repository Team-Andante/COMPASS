import { db, auth } from "./firebase/firebase.js";
import { 
    doc, getDoc, updateDoc, arrayUnion, arrayRemove 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { showToast } from "./toast.js";

// 학기 정렬을 위한 가중치 기준 매핑
const SEMESTER_ORDER = {
    "1학년 1학기": 1, "1학년 2학기": 2,
    "2학년 1학기": 3, "2학년 2학기": 4,
    "3학년 1학기": 5, "3학년 2학기": 6
};

document.addEventListener("DOMContentLoaded", () => {
    const gradeForm      = document.getElementById("grade-form");
    const saveGradeBtn   = document.getElementById("save-grade-btn");
    const tableContainer = document.getElementById("grade-table-container");

    let currentUser  = null;
    let cachedGrades = []; // 전체 객체 보관용 (삭제 처리 시 arrayRemove에 객체 매칭 필요)

    // ── 1. 인증 상태 감지 ─────────────────────────────────────
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            // 인증되지 않은 사용자라면 로그인 페이지로 강제 튕김
            window.location.replace("/login.html");
            return;
        }
        currentUser = user;
        await loadGrades();
    });

    // ── 2. Firestore에서 누적 성적 배열 불러오기 ──────────────────
    async function loadGrades() {
        try {
            const userRef = doc(db, "users", currentUser.uid);
            const snap = await getDoc(userRef);
            
            if (snap.exists() && Array.isArray(snap.data().grades)) {
                cachedGrades = snap.data().grades;
                // 학기 순서(1학년 1학기 -> 3학년 2학기)대로 정렬
                cachedGrades.sort((a, b) => (SEMAPHORE_ORDER_weight(a.semester) - SEMAPHORE_ORDER_weight(b.semester)));
                renderGradeTable();
            } else {
                cachedGrades = [];
                renderEmptyMessage();
            }
        } catch (e) {
            console.error("성적 데이터를 로드하지 못했습니다:", e);
            showToast("성적 정보를 불러오지 못했습니다.", "error");
        }
    }

    function SEMAPHORE_ORDER_weight(semesterName) {
        return SEMESTER_ORDER[semesterName] || 99;
    }

    // ── 3. 화면 렌더링 ────────────────────────────────────────
    function renderGradeTable() {
        if (cachedGrades.length === 0) {
            renderEmptyMessage();
            return;
        }

        let html = `
            <table class="grade-table">
                <thead>
                    <tr>
                        <th>학기</th>
                        <th>평균 석차 등급</th>
                        <th>백분위 / 석차</th>
                        <th>관리</th>
                    </tr>
                </thead>
                <tbody>
        `;

        cachedGrades.forEach((item) => {
            html += `
                <tr>
                    <td><strong>${item.semester}</strong></td>
                    <td style="color: var(--primary, #4f7cff); font-weight: 600;">
                        ${parseFloat(item.gpa).toFixed(2)} 등급
                    </td>
                    <td>${item.percentile ? item.percentile : "-"}</td>
                    <td>
                        <button class="btn-text-danger" data-id="${item.id}">삭제</button>
                    </td>
                </tr>
            `;
        });

        html += `
                </tbody>
            </table>
        `;
        tableContainer.innerHTML = html;

        // 삭제 이벤트 위임 대신 각 버튼 바인딩
        tableContainer.querySelectorAll(".btn-text-danger").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const targetId = e.target.dataset.id;
                const targetObject = cachedGrades.find(g => g.id === targetId);
                
                if (targetObject && confirm(`[${targetObject.semester}] 성적 데이터를 삭제하시겠습니까?`)) {
                    deleteGrade(targetObject);
                }
            });
        });
    }

    function renderEmptyMessage() {
        tableContainer.innerHTML = `
            <div class="empty-message">
                아직 누적된 성적 데이터가 없습니다.<br>
                왼쪽 입력창을 통해 학기별 평균 성적을 등록해 보세요!
            </div>
        `;
    }

    // ── 4. 새로운 성적 데이터 누적 추가 (Create) ────────────────
    gradeForm?.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (!currentUser) return;

        const semester   = document.getElementById("input-semester").value;
        const gpa        = document.getElementById("input-gpa").value.trim();
        const percentile = document.getElementById("input-percentile").value.trim();

        if (!semester || !gpa) {
            showToast("학기와 등급은 필수 기입 사항입니다.", "error");
            return;
        }

        // 중복 학기 입력 검증
        const isDuplicate = cachedGrades.some(g => g.semester === semester);
        if (isDuplicate) {
            showToast("이미 해당 학기의 성적이 등록되어 있습니다.\n수정을 원하시면 기존 항목을 삭제 후 다시 등록해 주세요.", "error");
            return;
        }

        // 새롭게 쌓일 성적 데이터 객체 모델링
        const newGradeObj = {
            id: Date.now().toString(), // 고유 ID화 하여 식별자 매칭
            semester: semester,
            gpa: parseFloat(gpa),
            percentile: percentile || ""
        };

        saveGradeBtn.disabled = true;
        saveGradeBtn.textContent = "저장 중…";

        try {
            const userRef = doc(db, "users", currentUser.uid);
            // arrayUnion을 활용하여 객체를 배열에 누적 추가 ({ merge: true } 개념과 흡사)
            await updateDoc(userRef, {
                grades: arrayUnion(newGradeObj)
            });

            showToast(`${semester} 성적이 누적되었습니다.`, "success");
            gradeForm.reset();
            await loadGrades(); // 전체 리프레시 및 표 다시 그리기
        } catch (err) {
            console.error("성적 누적 실패:", err);
            showToast("성적 저장 중 문제가 발생했습니다.", "error");
        } finally {
            saveGradeBtn.disabled = false;
            saveGradeBtn.textContent = "성적 추가하기";
        }
    });

    // ── 5. 성적 데이터 제거 (Delete) ──────────────────────────
    async function deleteGrade(gradeObject) {
        if (!currentUser) return;
        try {
            const userRef = doc(db, "users", currentUser.uid);
            // arrayRemove는 인자로 넘어온 객체 정보와 완벽히 일치하는 배열 요소를 삭제함
            await updateDoc(userRef, {
                grades: arrayRemove(gradeObject)
            });

            showToast("성적 기록이 성공적으로 삭제되었습니다.", "success");
            await loadGrades(); // 최신화
        } catch (err) {
            console.error("성적 데이터 삭제 실패:", err);
            showToast("성적 삭제 처리 중 오류가 발생했습니다.", "error");
        }
    }
});