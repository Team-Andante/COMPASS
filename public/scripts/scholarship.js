// app.js

async function askAI() {
    const inputField = document.getElementById('userInput');
    const resultArea = document.getElementById('result-area');
    const loader = document.getElementById('loader');
    const btn = document.getElementById('sendBtn');

    const message = inputField.value.trim();
    if (!message) {
        alert("상황을 입력해 주세요!");
        return;
    }

    // 1. UI 초기화 및 로딩 상태 표시
    resultArea.style.display = 'none';
    resultArea.innerHTML = '';
    loader.style.display = 'block';
    btn.disabled = true;

    try {
        // [중요] 본인의 Firebase Project ID와 Region으로 수정하세요.
        // Firebase 호출 방식은 일반 fetch를 사용합니다.
        const functionUrl = "https://sc-recommend-3t5atoefua-uc.a.run.app";

        const response = await fetch(functionUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                data: { message: message } // index.js에서 req.body.data로 받으므로 구조를 맞춥니다.
            })
        });

        if (!response.ok) {
            throw new Error("네트워크 응답에 문제가 있습니다.");
        }

        const result = await response.json();

        // 2. 답변 렌더링
        // AI 답변에 포함된 마크다운을 HTML로 변환하여 출력합니다.
        if (result.data && result.data.answer) {
            loader.style.display = 'none';
            resultArea.style.display = 'block';
            resultArea.innerHTML = marked.parse(result.data.answer);
        } else {
            throw new Error("결과를 가져오지 못했습니다.");
        }

    } catch (error) {
        console.error("Error:", error);
        loader.style.display = 'none';
        alert("추천 도중 오류가 발생했습니다. 다시 시도해 주세요.");
    } finally {
        btn.disabled = false;
    }
}