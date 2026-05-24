const titleElement = document.getElementById('scholar');

// 2. 실행할 함수를 정의합니다.
function handleTitleClick() {
    console.log("제목이 클릭되었습니다!");
    console.log("현재 시간:", new Date().toLocaleTimeString());
    
    // 추가 작업 예시: 색상 변경
    titleElement.style.color = 'blue';
}

// 3. 클릭 이벤트 리스너를 등록합니다.
titleElement.addEventListener('click', handleTitleClick);