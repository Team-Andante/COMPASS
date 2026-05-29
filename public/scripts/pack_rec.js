import { db, auth } from "./firebase/firebase.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const gradeSlider = document.getElementById('grade');
const gradeValue = document.getElementById('gradeValue');

gradeSlider.addEventListener('input', (e) => {
const formattedValue = parseFloat(e.target.value).toFixed(2);
gradeValue.textContent = `${formattedValue}등급`;
});

document.getElementById('personaForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = document.getElementById('submitBtn');
    const loadingDiv = document.getElementById('loading');
    const resultContainer = document.getElementById('resultContainer');
    const cardWrapper = document.getElementById('cardWrapper');
    const errorBox = document.getElementById('errorBox');

    const grade = gradeSlider.value;
    const economy = document.querySelector('input[name="economy"]:checked').value;
    const interest = document.getElementById('interest').value;

    const promptMessage = `
    다음 학생의 정보를 바탕으로 가장 적합한 정부, 지자체, 또는 대학의 학생 혜택 프로그램 3가지를 엄선해줘.

    [학생 정보]
    - 성적: ${grade}등급
    - 경제적 여건: ${economy}
    - 관심사: ${interest}

    [응답 규격]
    반드시 다른 설명 없이 아래의 JSON 배열 포맷으로만 답변해줘. 마크다운 기호(\`\`\`json)도 붙이지 말고 순수 JSON 텍스트만 출력해.
    신청 링크(url)는 해당 프로그램의 실제 공식 신청 페이지 주소를 제공해.

    [
    {
    "title": "혜택 프로그램 이름 1",
    "reason": "이 학생에게 추천하는 이유 설명",
    "content": "지원 내용 및 혜택 상세 설명",
    "url": "https://example.com"
    },
    {
    "title": "혜택 프로그램 이름 2",
    "reason": "추천 이유",
    "content": "지원 내용",
    "url": "https://example.com"
    },
    {
    "title": "혜택 프로그램 이름 3",
    "reason": "추천 이유",
    "content": "지원 내용",
    "url": "https://example.com"
    }
    ]`.trim();

    submitBtn.disabled = true;
    loadingDiv.style.display = 'block';
    resultContainer.style.display = 'none';
    errorBox.style.display = 'none';
    cardWrapper.innerHTML = '';

    try {
            const response = await fetch(`/api/recommend`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: promptMessage })
        });

        const data = await response.json();

        if (response.ok) {
            const user = auth.currentUser;
            let cleanJsonText = data.answer.replace(/```json|```/g, '').trim();
            const benefits = JSON.parse(cleanJsonText);

            if (user) {
                // Firestore의 'users/[UID]/recentBenefits' 컬렉션에 저장
                benefits.forEach(async (item) => {
                    await addDoc(collection(db, "users", user.uid, "recentBenefits"), {
                        title: item.title,
                        url: item.url,
                        createdAt: serverTimestamp() // 저장 시간 기록
                    });
                });
            }

            benefits.forEach(item => {
                const card = document.createElement('div');
                card.className = 'benefit-card';
                card.innerHTML = `
                    <div class="card-content">
                        <h3>🎁 ${item.title}</h3>
                        <p><strong>🤔 선정 이유:</strong> ${item.reason}</p>
                        <p><strong>📝 지원 내용:</strong> ${item.content}</p>
                    </div>
                    <a href="${item.url}" target="_blank" class="link-btn">🚀 신청하러 가기</a>
                `;
                cardWrapper.appendChild(card);
            });

            loadingDiv.style.display = 'none';
            resultContainer.style.display = 'block';
            
        } else {
            throw new Error(data.error || '알 수 없는 오류');
        }

    } catch (error) {
        console.error(error);
        loadingDiv.style.display = 'none';
        errorBox.textContent = `오류가 발생했습니다: ${error.message}. 다시 시도해주세요.`;
        errorBox.style.display = 'block';
    } finally {
        submitBtn.disabled = false;
    }

    // [추가] 마이페이지에서 보여주기 위해 로컬 스토리지에 저장
    localStorage.setItem("userGrade", grade);
    localStorage.setItem("userInterest", interest);
});