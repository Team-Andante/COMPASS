const express = require('express');
const cors = require('cors');
// 1. 최신 패키지인 '@google/genai'에서 GoogleGenAI 클래스를 불러온다.
// 기존 @google/generative-ai 대신 새로 통합된 공식 최신 SDK이다.
const { GoogleGenAI } = require('@google/genai'); 
// .env 파일에 저장된 환경 변수(API 키 등)를 process.env로 로드한다.
require('dotenv').config();

const app = express();

// [미들웨어 설정]
// 다른 도메인(예: React, Vue 등 프론트엔드 서버)에서의 API 요청을 허용합니다 (CORS 에러 방지).
app.use(cors());
// 프론트엔드에서 보낸 JSON 형식의 요청 본문(body)을 JavaScript 객체로 파싱한다.
app.use(express.json());

// [Gemini 인스턴스 초기화]
// 환경 변수에 저장된 API 키를 사용하여 GoogleGenAI 클라이언트 객체를 생성한다.
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// [API 라우터 설정]
// 프론트엔드가 http://localhost:3000/ask-ai 로 POST 요청을 보내면 실행되는 비동기 핸들러이다.
app.post('/ask-ai', async (req, res) => {
  console.log("=== 프론트엔드로부터 요청 수신 ===");
  
  try {
    // 프론트엔드가 보낸 JSON 데이터에서 'message' 필드(사용자의 질문 질문)를 추출한다.
    const { message } = req.body;

    // 유효성 검사: 만약 프론트엔드에서 메시지를 보내지 않았다면 400(Bad Request) 에러를 반환한다.
    if (!message) {
      return res.status(400).json({ error: "메시지를 입력해주세요." });
    }

    console.log("=== Gemini API 호출 시작 ===");
    // 3. 최신 SDK 문법: ai.models.generateContent 형식을 사용하여 Google AI에 요청을 보낸다.
    // await를 사용하여 구글 서버로부터 답변이 올 때까지 기다립니다(비동기 처리).
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", // 텍스트 생성 속도가 빠르고 비용 효율적인 최신 모델 지정
      contents: message,         // 프론트엔드에서 전달받은 사용자 질문 텍스트
    });
    console.log("=== Gemini API 호출 성공 ===");

    // 4. 결과 텍스트 추출 방식 변경 (구 버전의 .text() 함수 형태에서 .text 프로퍼티 접근으로 변경됨)
    // 구글이 생성한 최종 답변 텍스트만 추출한다.
    const aiAnswer = response.text;
    console.log("AI 답변:", aiAnswer);

    // 성공 응답: 프론트엔드에게 JSON 형태로 AI의 답변을 전달한다.
    return res.json({ answer: aiAnswer });

  } catch (error) {
    // API 키가 잘못되었거나, 구글 서버 내부 오류 등 예외 발생 시 캐치한다.
    console.error("백엔드 에러 발생:", error);
    
    // 실패 응답: 프론트엔드에게 500(Internal Server Error) 코드와 함께 에러 메시지를 전달한다.
    return res.status(500).json({ 
      error: "Gemini를 불러오는 중 에러가 발생했습니다.",
      details: error.message 
    });
  }
});

// [서버 시작]
// 포트 번호 3000번에서 서버를 대기 상태로 만들고 구동을 시작한다.
app.listen(3000, () => console.log('Gemini Backend server running on http://localhost:3000'));