async function askAI() {
    const userInputField = document.getElementById('userInput');
    const resultArea = document.getElementById('resultArea'); // HTML ID와 일치함
    const btn = document.getElementById('sendBtn');
    const loader = document.getElementById('loader');

    if (!userInputField || !resultArea || !btn) {
        console.error("요소를 찾을 수 없습니다.");
        return;
    }

    const messageValue = userInputField.value.trim();
    if (!messageValue) {
        alert("상황을 입력해 주세요!");
        return;
    }

    // UI 초기화
    resultArea.style.display = 'none';
    loader.style.display = 'block';
    btn.disabled = true;

    try {
        const functionUrl = "https://sc-recommend-3t5atoefua-uc.a.run.app/";

        const response = await fetch(functionUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                // 백엔드의 req.body.message 구조에 맞춤
                message: messageValue 
            })
        });

        const result = await response.json();
        
        // 백엔드 응답 형식이 { answer: "..." } 이므로 이를 추출
        const finalAnswer = result.answer || (result.data && result.data.answer);

        if (finalAnswer) {
            loader.style.display = 'none';
            resultArea.style.display = 'block';
            resultArea.innerHTML = window.marked ? marked.parse(finalAnswer) : finalAnswer;
        } else {
            throw new Error("답변을 생성하지 못했습니다.");
        }

    } catch (error) {
        console.error("Error 상세:", error);
        loader.style.display = 'none';
        resultArea.style.display = 'block';
        resultArea.innerText = "에러: " + error.message;
    } finally {
        btn.disabled = false;
    }
}