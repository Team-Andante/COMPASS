import pandas as pd
import google.generativeai as genai
from pinecone import Pinecone
import tkinter as tk
from tkinter import filedialog
import time

# 1. 초기 설정 (본인의 API Key를 입력하세요)
GEMINI_API_KEY = "AIzaSyB4OP8f_HzBRMXZeLKMyP-89kl702x5UjA"
PINECONE_API_KEY = "pcsk_422SBr_8MAMU3HTYfaPSTK66qdnGfS8JNyfBf15giPXnt5nHoJpkXfxXyq9NJWGy5pFbFm"
INDEX_NAME = "scholarship-gem"

genai.configure(api_key=GEMINI_API_KEY)
pc = Pinecone(api_key=PINECONE_API_KEY)
index = pc.Index(INDEX_NAME)

def get_embedding(text):
    """진단 결과 확인된 모델인 gemini-embedding-001 사용"""
    model_name = "models/gemini-embedding-001"
    
    try:
        # embed_content 호출 시 모델명을 리스트에 있던 이름으로 정확히 기입
        result = genai.embed_content(
            model=model_name,
            content=text,
            task_type="retrieval_document"
        )
        return result['embedding']
    except Exception as e:
        print(f"Embedding Error: {e}")
        # 만약 위 모델도 에러가 난다면 최신 프리뷰 모델로 시도
        print("Trying with gemini-embedding-2...")
        result = genai.embed_content(
            model="models/gemini-embedding-2",
            content=text,
            task_type="retrieval_document"
        )
        return result['embedding']  

def select_file():
    """파일 선택 창을 띄우는 함수"""
    root = tk.Tk()
    root.withdraw() # 메인 윈도우 숨김
    file_path = filedialog.askopenfilename(
        title="업로드할 CSV 파일을 선택하세요",
        filetypes=[("CSV files", "*.csv")]
    )
    return file_path

def process_and_upload(file_path):
    # CSV 읽기 (한국어 인코딩 주의: cp949 또는 utf-8-sig)
    try:
        df = pd.read_csv(file_path, encoding='utf-8-sig')
    except:
        df = pd.read_csv(file_path, encoding='cp949')

    print(f"총 {len(df)}개의 데이터를 처리합니다.")

    vectors = []
    batch_size = 100 # 100개씩 묶어서 업로드

    for i, row in df.iterrows():
        # AI가 검색할 때 사용할 핵심 텍스트 구성
        # 파일에 따라 컬럼명이 다를 수 있으므로 확인 필요 (상품명, 지원내용 상세내용 등)
        text_context = f"상품명: {row.get('상품명', '')}, " \
                       f"운영기관: {row.get('운영기관명', '')}, " \
                       f"지원내용: {row.get('지원내용 상세내용', row.get('지원내역 상세내용', ''))}, " \
                       f"대상조건: {row.get('특정자격 상세내용', '')}, " \
                       f"지역조건: {row.get('지역거주여부 상세내용', '')}"

        # 1. 임베딩 생성
        try:
            embedding = get_embedding(text_context)
            
            # 2. 벡터 데이터 구조 생성
            vectors.append({
                "id": f"id-{i}-{time.time()}", # 고유 ID
                "values": embedding,
                "metadata": {
                    "title": str(row.get('상품명', '제목없음')),
                    "provider": str(row.get('운영기관명', '기관없음')),
                    "content": str(row.get('지원내용 상세내용', row.get('지원내역 상세내용', ''))),
                    "url": str(row.get('홈페이지 주소', row.get('홈페이지주소', '')))
                }
            })
        except Exception as e:
            print(f"Error embedding row {i}: {e}")
            continue

        # 3. 배치 단위로 업로드
        if len(vectors) >= batch_size:
            index.upsert(vectors=vectors)
            print(f"{i+1}번째 데이터까지 업로드 완료...")
            vectors = [] # 배치 초기화
            time.sleep(1) # API 레이트 리밋 방지

    # 남은 데이터 업로드
    if vectors:
        index.upsert(vectors=vectors)
        print("모든 데이터 업로드 완료!")

if __name__ == "__main__":
    path = select_file()
    if path:
        print(f"선택된 파일: {path}")
        process_and_upload(path)
    else:
        print("파일이 선택되지 않았습니다.")