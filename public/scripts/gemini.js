import express from 'express';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';
import 'dotenv/config'
// @google/genai 패키지에서 GoogleGenAI 클래스 열기
// const { GoogleGenAI } = require('@google/genai'); 
// 환경 변수 process.env로 로드
// require('dotenv').config();
const app = express();
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// [미들웨어 설정]
// 다른 도메인의 API 요청 허용
app.use(cors());
// JSON 형식의 요청 body를 JS 객체로 파싱
app.use(express.json());

// [Gemini 인스턴스 초기화]
// GoogleGenAI 클라이언트 객체 생성
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

// [API 라우터 설정]
// 프론트엔드가 POST 요청을 보내면 실행되는 비동기 핸들러
app.post('/ask-ai', async (req, res) => {
  console.log("=== 프론트엔드로부터 요청 수신 ===");
  
  try {
    // 프론트엔드가 보낸 JSON 데이터에서 message 필드 추출
    const { message } = req.body;

    // 유효성 검사
    if (!message) {
      return res.status(400).json({ error: "메시지를 입력해주세요." });
    }

    console.log("=== Gemini API 호출 시작 ===");
    // ai.models.generateContent 형식으로 서버 요청 전송
    // 서버 응답 대기
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash", // AI 모델 지정
      contents: message,         // 사용자 질문 텍스트
    });
    console.log("=== Gemini API 호출 성공 ===");

    // 최종 답변 텍스트만 추출
    const aiAnswer = response.text;
    console.log("AI 답변:", aiAnswer);

    // JSON 형태로 메시지 전달
    return res.json({ answer: aiAnswer });

  } catch (error) {
    console.error("백엔드 에러 발생:", error);
    
    // 서버 응답 없음
    return res.status(500).json({ 
      error: "Gemini를 불러오는 중 에러가 발생했습니다.",
      details: error.message 
    });
  }
});

// 서버 시작
app.listen(3003, () => console.log('Gemini Backend server running on http://localhost:3003'));