/**
 * COMPASS Cloud Functions
 * 기존 로컬 서버 3개(포트 3001, 3002, 3003)를 단일 Cloud Function으로 통합
 *
 * 엔드포인트:
 *   POST /api/analyze   - PDF/이미지 텍스트 추출 (구 :3002/analyze)
 *   POST /api/summarize - 공문 AI 요약          (구 :3001/ask-ai)
 *   POST /api/recommend - 맞춤 혜택 패키지 추천  (구 :3003/ask-ai)
 */

const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const pdf = require("pdf-parse");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// -----------------------------------------------------------------
// Secret 정의 (배포 전 반드시 설정)
//   firebase functions:secrets:set GEMINI_API_KEY
// -----------------------------------------------------------------
const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");

// -----------------------------------------------------------------
// Express 앱 설정
// -----------------------------------------------------------------
const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: "10mb" }));

// Multer: 메모리 스토리지, 20MB 제한
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

// -----------------------------------------------------------------
// 라우트 1: POST /api/analyze
// 기존 server.js (포트 3002) 역할
// PDF / 이미지(OCR) 파일에서 텍스트 추출
// -----------------------------------------------------------------
app.post("/analyze", upload.single("pdf_file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: "파일이 없습니다." });
    }

    const mime = req.file.mimetype;
    const originalname = req.file.originalname.toLowerCase();
    const imageTypes = ["image/jpeg", "image/png", "image/webp"];

    // ── 이미지 → Tesseract OCR ──────────────────────────────
    if (imageTypes.includes(mime)) {
      console.log("🖼️ 이미지 감지 → OCR 시작");

      // Cloud Functions 환경에서 Tesseract는 /tmp 디렉토리 사용
      const Tesseract = require("tesseract.js");
      const { data: { text } } = await Tesseract.recognize(
        req.file.buffer,
        "kor+eng",
        {
          cachePath: "/tmp",
          logger: (m) => console.log(`OCR: ${m.status}`),
        }
      );

      if (!text || text.trim().length === 0) {
        return res.status(422).json({
          success: false,
          error: "OCR 결과가 없습니다. 이미지 화질을 확인해주세요.",
        });
      }

      return res.json({ success: true, text: text.trim(), source: "ocr" });
    }

    // ── PDF → pdf-parse ─────────────────────────────────────
    if (mime === "application/pdf" || originalname.endsWith(".pdf")) {
      console.log("📄 PDF 감지 → pdf-parse 시작");

      const pdfParser = typeof pdf === "function" ? pdf : pdf.default;
      const data = await pdfParser(req.file.buffer);

      if (!data.text || data.text.trim().length === 0) {
        return res.status(422).json({
          success: false,
          error:
            "PDF에서 텍스트를 추출할 수 없습니다. 스캔본이라면 이미지로 업로드해주세요.",
        });
      }

      console.log(`✅ PDF 추출 완료: ${data.text.length}자`);
      return res.json({ success: true, text: data.text.trim(), source: "pdf" });
    }

    // ── HWP 안내 ─────────────────────────────────────────────
    // Cloud Functions 환경에서 @ohah/hwpjs의 네이티브 바이너리가 동작하지 않을 수 있음
    // 텍스트로 변환 후 업로드를 안내
    if (originalname.endsWith(".hwp") || originalname.endsWith(".hwpx")) {
      return res.status(415).json({
        success: false,
        error:
          "HWP 파일은 현재 지원하지 않습니다. PDF 또는 이미지(JPG/PNG)로 변환 후 업로드해주세요.",
      });
    }

    return res.status(415).json({
      success: false,
      error: "지원하지 않는 파일 형식입니다. (PDF, JPG, PNG, WEBP만 가능)",
    });
  } catch (error) {
    console.error("❌ /analyze 에러:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// -----------------------------------------------------------------
// 라우트 2: POST /api/summarize
// 기존 summary.js (포트 3001) 역할
// 추출된 텍스트를 Gemini AI로 요약
// -----------------------------------------------------------------
app.post("/summarize", async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: "요약할 텍스트가 없습니다." });
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY.value());
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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

# Output Format Example:

## 📢 [행사/공지 명칭]
> **한 줄 요약:** (이 공지사항의 가장 중요한 목적을 한 줄로 요약)

---

### 📅 상세 일정 안내
| 구분 | 일시 | 장소 | 비고 |
| :--- | :--- | :--- | :--- |

### 📝 신청 및 참여 방법
* **신청 대상:**
* **신청 기간:**
* **신청 방법:**
* **준비물/주의사항:**

### 🔗 관련 링크 및 문의
* **[신청/설문 링크]:**
* **문의처:**

---

# Input Text:
${text}
    `.trim();

    const result = await model.generateContent(prompt);
    const response = await result.response;

    return res.json({ summary: response.text() });
  } catch (error) {
    console.error("❌ /summarize 에러:", error.message);
    res.status(500).json({ error: "요약 중 오류가 발생했습니다." });
  }
});

// -----------------------------------------------------------------
// 라우트 3: POST /api/recommend
// 기존 gemini.js (포트 3003) 역할
// 학생 정보 기반 맞춤 혜택 패키지 추천
// -----------------------------------------------------------------
app.post("/recommend", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "메시지를 입력해주세요." });
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY.value());
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const result = await model.generateContent(message);
    const response = await result.response;

    return res.json({ answer: response.text() });
  } catch (error) {
    console.error("❌ /recommend 에러:", error.message);
    res.status(500).json({
      error: "Gemini를 불러오는 중 에러가 발생했습니다.",
      details: error.message,
    });
  }
});

// -----------------------------------------------------------------
// Cloud Function 내보내기
// 메모리 1GB, 타임아웃 120초 (OCR/PDF 처리 고려)
// GEMINI_API_KEY 시크릿 주입
// -----------------------------------------------------------------
exports.api = onRequest(
  {
    memory: "1GiB",
    timeoutSeconds: 120,
    secrets: [GEMINI_API_KEY],
    region: "asia-northeast3", // 서울 리전
  },
  app
);