import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Pinecone } from "@pinecone-database/pinecone";
import corsLib from 'cors';

import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");
// 동적 require 대신 ES Module 환경에 어울리도록 createRequire를 통해 tesseract.js도 사전에 로드 가능하게 준비합니다.
const Tesseract = require("tesseract.js");

const cors = corsLib({ origin: true });

// Cloud Functions용 Secret Manager 변수 설정
const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");
const PINECONE_API_KEY = defineSecret("PINECONE_API_KEY");

/**
 * 1. 학교 가정통신문 및 공지사항 분석 API (analyzeNotice)
 */
export const analyzeNotice = onRequest({
  memory: "1GiB",
  timeoutSeconds: 120,
  secrets: [GEMINI_API_KEY],
  region: "us-central1",
}, (req, res) => {
  cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).send({ data: { error: "Method Not Allowed" } });
      }

      const requestData = req.body.data || {};
      const { fileBuffer, fileName, fileMime } = requestData;

      if (!fileBuffer) {
        return res.status(400).send({ data: { error: "파일 데이터가 없습니다." } });
      }

      // Base64 디코딩하여 바이너리 버퍼 생성
      const buffer = Buffer.from(fileBuffer, 'base64');
      let extractedText = "";

      // PDF 또는 이미지 여부에 따른 텍스트 추출 가공
      if (fileMime === "application/pdf" || (fileName && fileName.toLowerCase().endsWith(".pdf"))) {
        const data = await pdf(buffer);
        extractedText = data.text;
      } else if (fileMime && fileMime.startsWith("image/")) {
        const { data: { text } } = await Tesseract.recognize(buffer, "kor+eng");
        extractedText = text;
      }

      if (!extractedText || extractedText.trim().length === 0) {
        return res.status(422).send({ data: { error: "텍스트를 추출할 수 없습니다. 파일 형식을 확인해주세요." } });
      }

      // Gemini 초기화 (안정적인 최신 모델명으로 수정)
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY.value());
      const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });

      const prompt = `
        Role: 학부모와 학생의 시간을 아껴주는 '핵심 정리 베테랑 교사'

        # Task: 
        제공된 학교 공지사항(또는 가정통신문) 전문을 분석하여, 학부모와 학생이 즉시 행동(신청, 등교, 준비 등)에 옮길 수 있도록 핵심 정보 위주로 요약해줘.

        # Constraints:
        1. **가독성 최우선**: 서술형 문장은 지양하고, 불렛포인트와 표를 활용하여 한눈에 들어오게 작성할 것.
        2. **누락 금지**: 날짜, 구체적인 시간(교시별/분 단위), 장소, 신청 마감일, 신청 링크는 절대 누락하지 말 것.
        3. **하이퍼링크 강조**: 신청 링크가 있다면 별도의 [신청하기] 섹션을 만들어 눈에 띄게 표기할 것.
        4. **마크다운 활용**: 표(Table)와 볼드체(**)를 적절히 사용하여 정보의 위계를 설정할 것.
        5. **어조**: 정중하면서도 명확한 학교 선생님의 말투를 유지할 것.
        6. **깔끔함**: 내용 요약 전 "물론입니다." 와 같은 불필요한 말을 작성하지 말 것.

        # Example Of Output Format:

        ## 📢 [행사/공지 명칭 입력]
        > **한 줄 요약:** (이 공지사항의 가장 중요한 목적을 한 줄로 요약)

        ---

        ### 📅 상세 일정 안내
        | 구분 | 일시 | 장소 | 비고 |
        | :--- | :--- | :--- | :--- |
        | **일자** | 0000년 00월 00일(요일) | - | - |
        | **세부 시간** | 00:00 ~ 00:00 | 00강당 / 각 반 교실 | 00분 소요 예정 |

        ### 📝 신청 및 참여 방법
        * **신청 대상:** * **신청 기간:** ~ 202X년 00월 00일(요일) 00:00까지 (기한 엄수)
        * **신청 방법:** * **준비물/주의사항:** ### 🔗 관련 링크 및 문의
        * **[신청/설문 링크]:** (여기에 URL 삽입)
        * **문의처:** 00교무실 (02-XXX-XXXX)

        ---

        # Input Text:
        ${extractedText}
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      return res.status(200).send({ data: { success: true, summary: text } });

    } catch (error) {
      console.error("Gemini API Error (analyzeNotice):", error);
      return res.status(500).send({ data: { error: error.message } });
    }
  });
});

export const sc_recommend = onRequest({
  memory: "512MiB",
  timeoutSeconds: 60,
  secrets: [GEMINI_API_KEY, PINECONE_API_KEY],
  region: "us-central1",
}, (req, res) => {
  cors(req, res, async () => {
    try {
      const requestData = req.body.data || req.body;
      const message = requestData.message;
      // 카테고리 구분 변수 추가 (기본값은 'scholarship'으로 설정)
      const category = requestData.category || "scholarship"; 
      
      if (!message) {
        return res.status(400).json({ error: "질문이 없습니다." });
      }

      // API 키 연결 및 서비스 인스턴스 초기화
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY.value());
      const pc = new Pinecone({ apiKey: PINECONE_API_KEY.value() });
      const index = pc.index("scholarship-gem");

      // 임베딩 생성 모델 지정
      const embedModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
      const result = await embedModel.embedContent(message);
      const vector = result.embedding.values;

      // Pinecone 검색 쿼리 실행
      const queryResponse = await index.query({
        vector: vector,
        topK: 3,
        includeMetadata: true,
      });

      // 결과 리스트 기반 컨텍스트 결합
      const context = queryResponse.matches && queryResponse.matches.length > 0
        ? queryResponse.matches.map(m => `[지원 항목: ${m.metadata.title}] ${m.metadata.content}`).join("\n")
        : "관련 정보를 데이터베이스에서 찾지 못했습니다.";

      // 추천 챗봇 모델 실행
      const chatModel = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });
      
      // 카테고리에 따른 역할과 프롬프트 동적 분할 정의
      let systemPrompt = "";
      if (category === "welfare") {
        systemPrompt = `
          역할: 청소년 및 청년을 위한 '정부 복지 및 사회공헌 서비스 코치'
          분야: 복지 서비스 확인 (공공데이터 및 지자체 지원 연계)
          
          참고 데이터:
          ${context}

          위 데이터를 토대로, 질문자에게 가장 알맞은 복지 혜택과 정부/공공기관의 생계, 주거, 교육 서비스 자격 요건을 친절하고 상세하게 안내해 줘. 
          답변은 따뜻하고 안전한 청소년 친화적인 톤앤매너로 작성해야 해.
        `;
      } else {
        systemPrompt = `
          역할: 학생들의 꿈을 응원하는 '장학 복지 매칭 플래너'
          분야: 장학금 한눈에 보기 (소득분위, 성적 평가, 재단 기준 연동)
          
          참고 데이터:
          ${context}

          위 데이터를 토대로, 질문자의 성적 조건이나 경제 여건(소득구간 등)에 꼭 맞는 장학금의 지원 한도, 신청 마감 기한 및 필수 제출 서류 목록을 깔끔하게 요약해 줘.
          안전하고 유익한 학습 성장을 돕는 정중한 교사조의 말투를 일관되게 적용해 줘.
        `;
      }

      const prompt = `
        ${systemPrompt}

        사용자 질문: ${message}
      `;
      
      const chatResult = await chatModel.generateContent(prompt);
      const aiAnswer = chatResult.response.text();

      return res.status(200).json({ 
        data: { answer: aiAnswer },
        answer: aiAnswer 
      });

    } catch (error) {
      console.error("Error (sc_recommend):", error);
      return res.status(500).json({ error: error.message });
    }
  });
});

/**
 * 3. 일반 일대일 추천/대화 API (recommend)
 */
export const recommend = onRequest({
  secrets: [GEMINI_API_KEY],
  region: "us-central1",
}, (req, res) => {
  cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        return res.status(405).send({ error: "Method Not Allowed" });
      }

      // JSON 및 x-www-form-urlencoded의 바디 구조에 맞춰 파싱 유연성 확보
      const requestData = req.body.data || req.body;
      const message = requestData.message;

      if (!message) {
        return res.status(400).json({ error: "메시지를 입력해주세요." });
      }

      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY.value());
      // 올바른 최신 모델명으로 변경
      const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" }); 

      const result = await model.generateContent(message);
      const response = await result.response;
      const aiAnswer = response.text();

      return res.json({ 
        data: { answer: aiAnswer },
        answer: aiAnswer 
      });

    } catch (error) {
      console.error("Error (recommend):", error);
      return res.status(500).json({ error: error.message });
    }
  });
});