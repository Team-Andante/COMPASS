import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";

// ⚠️ Firebase Console에서 복사한 실제 값으로 유지하세요
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "compass-85721.firebaseapp.com",
    projectId: "compass-85721",
    storageBucket: "compass-85721.appspot.com",
    appId: "YOUR_APP_ID"
};

initializeApp(firebaseConfig);

async function startSummary() {
    const fileInput = document.getElementById('pdfFile');
    const btn = document.getElementById('btnProcess');
    const loader = document.getElementById('loader');
    const resultBox = document.getElementById('result-box');
    const textContent = document.getElementById('textContent');

    if (!fileInput.files[0]) return alert("파일을 선택해주세요.");

    btn.disabled = true;
    loader.style.display = 'block';
    resultBox.style.display = 'none';

    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = async (e) => {
        try {
            const base64File = e.target.result.split(',')[1];

            // ✅ 이미지에서 확인된 실제 Cloud Run 트리거 URL 적용
            const response = await fetch("https://analyzenotice-3t5atoefua-uc.a.run.app", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    data: { // 백엔드 index.js의 request.data 구조와 맞춤
                        fileBuffer: base64File,
                        fileName: file.name,
                        fileMime: file.type
                    }
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.data?.error || "서버 응답 에러");
            }

            const result = await response.json();

            if (result.data && result.data.success) {
                textContent.innerHTML = marked.parse(result.data.summary);
                resultBox.style.display = 'block';
            }
        } catch (error) {
            console.error("에러 발생:", error);
            alert("분석 실패: " + error.message);
        } finally {
            btn.disabled = false;
            loader.style.display = 'none';
        }
    };
    reader.readAsDataURL(file);
}

// 버튼 클릭 이벤트 연결
window.startSummary = startSummary;