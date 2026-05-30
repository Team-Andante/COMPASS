import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { GoogleGenerativeAI } from "@google/generative-ai";
import corsLib from 'cors';

import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");

const cors = corsLib({ origin: true });

const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");
const PINECONE_API_KEY = defineSecret("PINECONE_API_KEY");

export const analyzeNotice = onRequest({
  memory: "1GiB",
  timeoutSeconds: 120,
  secrets: [GEMINI_API_KEY],
  region: "us-central1",
}, (req, res) => {
  cors(req, res, async () => {
    try {
      if (req.method !== 'POST') return res.status(405).send({ data: { error: "Method Not Allowed" } });

      const requestData = req.body.data || {};
      const { fileBuffer, fileName, fileMime } = requestData;

      if (!fileBuffer) return res.status(400).send({ data: { error: "파일 데이터가 없습니다." } });

      // 1. 텍스트 추출 로직
      const buffer = Buffer.from(fileBuffer, 'base64');
      let extractedText = "";

      if (fileMime === "application/pdf" || fileName.toLowerCase().endsWith(".pdf")) {
        const data = await pdf(buffer);
        extractedText = data.text;
      } else if (fileMime.startsWith("image/")) {
        const Tesseract = require("tesseract.js");
        const { data: { text } } = await Tesseract.recognize(buffer, "kor+eng");
        extractedText = text;
      }

      if (!extractedText || extractedText.trim().length === 0) {
        return res.status(422).send({ data: { error: "텍스트를 추출할 수 없습니다." } });
      }

      // 2. Gemini 설정 (모델명 확인 필수)
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY.value());
      // 모델명을 'gemini-1.5-flash'로 유지하되 최신 버전인지 확인
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
        ${extractedText};`

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      res.status(200).send({ data: { success: true, summary: text } });

    } catch (error) {
      console.error("Gemini API Error:", error);
      // 클라이언트에 구체적인 에러 메시지 전달
      res.status(500).send({ data: { error: error.message } });
    }
  });
});

export const sc_recommend = onRequest({
  memory: "512MiB",
  timeoutSeconds: 60,
  secrets: [GEMINI_API_KEY, PINECONE_API_KEY], // 두 키 모두 사용
  region: "us-central1",
}, (req, res) => {
  cors(req, res, async () => {
    try {
      if (req.method !== 'POST') return res.status(405).send({ data: { error: "Method Not Allowed" } });

      // 클라이언트에서 보낸 데이터 확인 (Firebase SDK는 데이터를 data 필드에 담아 보냄)
      const requestData = req.body.data || {};
      const { message } = requestData;

      if (!message) return res.status(400).send({ data: { error: "메시지를 입력해주세요." } });

      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY.value());
      const pc = new Pinecone({ apiKey: PINECONE_API_KEY.value() });
      const index = pc.index("scholarship-index"); // 생성하신 인덱스 이름

      // [STEP 1] 사용자 질문 임베딩 (업로드 시 사용한 모델과 일치해야 함)
      // gemini-embedding-001 사용 시 768차원
      const embedModel = genAI.getGenerativeModel({ model: "models/gemini-embedding-001" });
      const embeddingResult = await embedModel.embedContent(message);
      const vector = embeddingResult.embedding.values;

      // [STEP 2] Pinecone에서 유사한 장학금 5개 검색
      const queryResponse = await index.query({
        vector: vector,
        topK: 5,
        includeMetadata: true
      });

      // 검색된 결과가 없을 경우
      if (!queryResponse.matches || queryResponse.matches.length === 0) {
        return res.status(200).send({ data: { answer: "죄송합니다. 조건에 맞는 장학금을 찾지 못했습니다." } });
      }

      // [STEP 3] 검색된 데이터를 컨텍스트로 결합
      const context = queryResponse.matches.map(m => 
        `[${m.metadata.title}]\n기관: ${m.metadata.provider}\n내용: ${m.metadata.content}\n링크: ${m.metadata.url}`
      ).join("\n\n---\n\n");

      // [STEP 4] Gemini를 통한 최종 맞춤 답변 생성
      const chatModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = `
        너는 한국장학재단 및 지자체 장학금 상담 전문가야. 
        아래 제공된 [장학금 데이터]를 바탕으로 [사용자 상황]에 가장 적합한 장학금을 2~3개 추천해줘.
        
        답변 가이드:
        1. 사용자의 상황(거주지, 학년 등)과 장학금 조건을 대조하여 왜 추천하는지 친절하게 설명해.
        2. 신청 가능한 홈페이지 링크가 있다면 반드시 포함해줘.
        3. 만약 데이터에 정확히 일치하는 게 없다면, 가장 유사한 것을 제안하거나 필요한 추가 정보를 알려줘.

        [사용자 상황]: ${message}
        
        [장학금 데이터]:
        ${context}
      `;

      const result = await chatModel.generateContent(prompt);
      const answer = result.response.text();

      // 결과 반환 (Firebase SDK 형식을 위해 { data: { ... } } 구조 사용)
      res.status(200).send({ data: { answer: answer } });

    } catch (error) {
      console.error("Recommend Error:", error);
      res.status(500).send({ data: { error: error.message } });
    }
  });
});

export const recommend = onRequest({
  secrets: [GEMINI_API_KEY],
  region: "us-central1",
}, (req, res) => {
  // gemini.js에 있던 cors 미들웨어 적용
  cors(req, res, async () => {
    try {
      if (req.method !== 'POST') return res.status(405).send({ error: "Method Not Allowed" });

      const { message } = req.body; // gemini.js의 로직
      if (!message) return res.status(400).json({ error: "메시지를 입력해주세요." });

      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY.value());
      const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" }); 

      const result = await model.generateContent(message);
      const response = await result.response;
      const aiAnswer = response.text();

      // pack_rec.html이 기대하는 형식으로 응답
      return res.json({ answer: aiAnswer });

    } catch (error) {
      console.error("에러 발생:", error);
      return res.status(500).json({ error: error.message });
    }
  });
});