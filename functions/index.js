const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const pdf = require("pdf-parse");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Firebase Secret Manager에 저장된 API 키를 가져옵니다.
const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");

/**
 * AI 공지사항 분석 함수
 * 리전: 서울 (asia-northeast3)
 */
exports.analyzeNotice = onCall({
  memory: "1GiB",
  timeoutSeconds: 120,
  secrets: [GEMINI_API_KEY],
  region: "asia-northeast3", // 한국 리전 설정
}, async (request) => {
  // 1. 요청 데이터 확인
  const { fileBuffer, fileName, fileMime } = request.data;

  if (!fileBuffer) {
    throw new HttpsError("invalid-argument", "파일 데이터가 누락되었습니다.");
  }

  try {
    // 2. Base64 데이터를 Buffer로 변환
    const buffer = Buffer.from(fileBuffer, 'base64');
    let extractedText = "";

    // 3. 파일 형식에 따른 텍스트 추출 (PDF 중심)
    if (fileMime === "application/pdf" || fileName.toLowerCase().endsWith(".pdf")) {
      const data = await pdf(buffer);
      extractedText = data.text;
    } else if (fileMime.startsWith("image/")) {
      // 이미지일 경우 Tesseract.js를 함수 내부에서 동적으로 로드 (이미지 분석 필요 시)
      const Tesseract = require("tesseract.js");
      const { data: { text } } = await Tesseract.recognize(buffer, "kor+eng");
      extractedText = text;
    }

    if (!extractedText || extractedText.trim().length === 0) {
      throw new HttpsError("failed-precondition", "파일에서 텍스트를 추출할 수 없습니다.");
    }

    // 4. Gemini AI 초기화 및 프롬프트 설정
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
      ${extractedText};`;

    // 5. AI 요약 생성
    const result = await model.generateContent(prompt);
    const summaryText = result.response.text();

    // 6. 성공 응답 반환
    return {
      success: true,
      summary: summaryText
    };

  } catch (error) {
    console.error("서버 내부 에러:", error);
    throw new HttpsError("internal", error.message);
  }
});