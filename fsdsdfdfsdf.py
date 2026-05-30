import google.generativeai as genai

# 본인의 API 키 입력
genai.configure(api_key="AIzaSyB4OP8f_HzBRMXZeLKMyP-89kl702x5UjA")

print("--- 사용 가능한 임베딩 모델 목록 ---")
for m in genai.list_models():
    if 'embedContent' in m.supported_generation_methods:
        print(f"모델 이름: {m.name}")