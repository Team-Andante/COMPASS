import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { GoogleGenerativeAI } from "@google/generative-ai";
import corsLib from 'cors';

import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");

const cors = corsLib({ origin: true });

const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");

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