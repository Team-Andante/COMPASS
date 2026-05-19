import express from 'express';
import puppeteer from 'puppeteer';
import cors from 'cors';

const app = express();
app.use(cors());

let cachedData = [];
let lastUpdated = "데이터 수집 전";

async function scrapeScholarships() {
    let browser;
    try {
        browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox'] });
        const page = await browser.newPage();
        await page.goto("https://www.dreamspon.com/scholarship/list.html?ordby=1", { waitUntil: 'networkidle2' });
        
        const data = await page.evaluate(() => {
            const rows = document.querySelectorAll('.bo_table tbody tr');
            return Array.from(rows).map(row => {
                const titleEl = row.querySelector('.td_subject .title a');
                const orgEl = row.querySelector('td:nth-child(2)');
                if (!titleEl || !orgEl) return null;

                const titleText = titleEl.innerText.trim();
                const orgText = orgEl.innerText.trim();

                // [필터링] 드림스폰 홍보글 및 꿀팁 게시글 제외
                if (orgText === "드림스폰" || titleText.includes("꿀팁")) return null;

                const stateEl = row.querySelector('.td_day .state');
                const countEl = row.querySelector('.td_day .count');
                const stateText = stateEl ? stateEl.innerText.trim() : "";
                const countText = countEl ? countEl.innerText.trim() : "";
                const classList = stateEl ? stateEl.className : ""; 

                let category = "모집중";
                if (classList.includes('bgRed')) category = "마감임박";
                else if (stateText.includes("예정")) category = "모집예정";

                let displayDday = countText;
                if (countText.includes("D-0") || stateText.includes("오늘")) displayDday = "D-DAY";

                // href 속성값을 안전하게 추출 (예: /scholarship/view.html?id=123)
                // const relativeLink = titleEl.getAttribute('href') || "";

                return {
                    title: titleText,
                    org: orgText,
                    tags: Array.from(row.querySelectorAll('.hashtag span')).map(t => t.innerText.trim()),
                    stateText: stateText,
                    stateClass: category, 
                    dday: displayDday,
                    link: titleEl.href
                    // 도메인을 앞에 붙여서 절대 경로로 완성해줍니다.
                    // ink: relativeLink.startsWith('http') ? relativeLink : `https://www.dreamspon.com${relativeLink}`
                };
            }).filter(item => item !== null);
        });
        cachedData = data;
        lastUpdated = new Date().toLocaleString('ko-KR');
        console.log(`[${lastUpdated}] 데이터 크롤링 성공!`);
    // } catch (e) { 
    //     console.error("크롤링 중 에러 발생:", e); 
    // } finally { 
    //     if (browser) await browser.close(); 
    // }
            console.log(`[${lastUpdated}] 데이터 크롤링 성공!`);
    } catch (e) { 
        console.error("크롤링 중 에러 발생:", e); 
    } finally { 
        if (browser) await browser.close(); 
    }
}

// 서버 시작 시 최초 1회 크롤링 실행
scrapeScholarships();

app.get('/api/scholarships', (req, res) => res.json({ lastUpdated, data: cachedData }));
app.listen(3000, () => console.log('Server running on http://localhost:3000'));