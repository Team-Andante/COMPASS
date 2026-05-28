import csv
import time
from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager

BASE = "https://www.ebsi.co.kr"
GRADE = "high2" # 고2 설정

# ── [여기서 수정하세요] 과목명: [코드, 수집할 페이지 수] ──────────────────────

# 고3
GRADE = "high3" 
SUBJECTS = {
    "국어":           ["A100", 16],
    "영어":           ["A200", 14],
    "수학":           ["A300", 19],
    "과학":           ["A400", 25],
    "사회":           ["A500", 24],
    "직업":           ["A600", 3],
    "제2외국어":      ["A700", 5],
    "한국사":         ["A800", 4],
    "일반/진로/교양": ["A900", 1],
}

# # 고2
# GRADE = "high2" 
# SUBJECTS = {
#     "국어":           ["B100", 6],
#     "영어":           ["B200", 6],
#     "수학":           ["B300", 8],
#     "과학":           ["B500", 3],
#     "사회":           ["B400", 4],
#     "한국사":         ["B800", 1],
#     "일반/진로/교양": ["B900", 1],
# }

# # 고1
# GRADE = "high1" 
# SUBJECTS = {
#     "국어":           ["B100", 7],
#     "영어":           ["B200", 7],
#     "수학":           ["B300", 7],
#     "과학":           ["B500", 2],
#     "사회":           ["B400", 2],
#     "한국사":         ["B800", 2],
# }

# ──────────────────────────────────────────────────────────────────────────

def init_driver(headless=True):
    opts = Options()
    if headless: opts.add_argument("--headless")
    opts.add_argument("--window-size=1920,1080")
    return webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=opts)

def parse_page(html, subject_name):
    soup = BeautifulSoup(html, "html.parser")
    rows = []
    items = soup.select(".cont_wrap") 
    
    for item in items:
        # 1. 강좌명 및 링크
        title_el = item.select_one(".tit a")
        if not title_el: continue
        
        name = title_el.get_text(strip=True)
        link = title_el.get("href", "")
        if not link.startswith("http"): 
            link = BASE + link
            
        # 2. 강사명 추출 (detail_info의 2번째 span 태그)
        teacher = ""
        detail_spans = item.select(".detail_info span")
        if len(detail_spans) >= 2:
            teacher = detail_spans[1].get_text(strip=True) # 0부터 시작하므로 [1]이 두 번째
        
        # 3. 플래그 정보 (flag_ro_col2, flag_ro_col3)
        col2 = item.select_one(".flag_ro_col2")
        flag2 = col2.get_text(strip=True) if col2 else ""
        
        col3 = item.select_one(".flag_ro_col3")
        flag3 = col3.get_text(strip=True) if col3 else ""
        
        rows.append([subject_name, name, teacher, flag2, flag3, link])
    
    return rows

def crawl_subject(driver, name, info):
    code, max_page = info
    base_url = f"{BASE}/ebs/pot/potn/retrieveSbjtListByArea.ebs?categoryCode={code}&cookieGradeVal={GRADE}"
    
    print(f"▶ [{GRADE}] {name} 시작 (지정 페이지: {max_page})")
    all_rows = []

    for page in range(1, max_page + 1):
        target_url = f"{base_url}&pageIndex={page}"
        driver.get(target_url)
        
        try:
            WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, ".cont_wrap"))
            )
            time.sleep(0.7) 
            
            page_rows = parse_page(driver.page_source, name)
            if not page_rows: break
                
            all_rows.extend(page_rows)
            print(f"  {page}/{max_page} 페이지 완료")
            
        except Exception:
            break

    return all_rows

def main():
    driver = init_driver(headless=True)
    final_data = []

    try:
        for name, info in SUBJECTS.items():
            final_data.extend(crawl_subject(driver, name, info))
            
        filename = "ebs_high2_data.csv"
        with open(filename, "w", newline="", encoding="utf-8-sig") as f:
            writer = csv.writer(f)
            writer.writerow(["과목", "강좌명", "강사", "강좌구분", "난이도", "링크"])
            writer.writerows(final_data)
        
        print(f"\n✅ 완료! 총 {len(final_data)}개 데이터가 {filename}에 저장되었습니다.")

    finally:
        driver.quit()

if __name__ == "__main__":
    main()