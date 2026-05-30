document.getElementById('recommendBtn').addEventListener('click', getRecommendation);

async function getRecommendation() {
    const fileName = document.getElementById('grade').value;
    const subject = document.getElementById('subject').value;
    const category = document.getElementById('category').value;
    const level = document.getElementById('level').value;
    const resultsDiv = document.getElementById('results');

    resultsDiv.innerHTML = "<p style='grid-column: 1/-1; text-align: center;'>강좌를 찾는 중...</p>";

    try {
        // 데이터 폴더 안에 있는 CSV를 호출합니다.
        const response = await fetch(`data/${fileName}`);
        const csvData = await response.text();

        // CSV 파싱 (헤더: 과목, 강좌명, 강사, 강좌구분, 난이도, 링크)
        const rows = csvData.split('\n').slice(1);
        const lectures = rows.map(row => {
            // 정규식을 사용해 쉼표(,)를 처리합니다 (강좌명에 쉼표가 있을 경우 대비)
            const cols = row.match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g);
            if (cols && cols.length >= 6) {
                return {
                    subject: cols[0].trim(),
                    title: cols[1].replace(/"/g, '').trim(),
                    teacher: cols[2].trim(),
                    category: cols[3].trim(),
                    level: cols[4].trim(),
                    link: cols[5].trim()
                };
            }
            return null;
        }).filter(item => item !== null);

        // 필터링 로직
        const filtered = lectures.filter(l => 
            l.subject.includes(subject) && 
            l.category === category && 
            l.level === level
        );

        renderLectures(filtered);

    } catch (error) {
        console.error("Fetch 에러:", error);
        resultsDiv.innerHTML = "<p>데이터를 불러오는 중 오류가 발생했습니다.</p>";
    }
}

function renderLectures(items) {
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = "";

    if (items.length === 0) {
        resultsDiv.innerHTML = "<p style='grid-column: 1/-1; text-align: center; padding: 40px;'>매칭되는 강좌가 없습니다. 다른 조건을 선택해 보세요! 🔍</p>";
        return;
    }

    items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'lecture-card';
        card.innerHTML = `
            <div>
                <span class="badge">${item.category}</span>
                <span class="badge">${item.level}</span>
            </div>
            <h3>${item.title}</h3>
            <p class="teacher">👤 ${item.teacher} 선생님</p>
            <a href="${item.link}" target="_blank" class="btn-link">수강하러 가기</a>
        `;
        resultsDiv.appendChild(card);
    });
}