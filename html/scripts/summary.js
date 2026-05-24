import express from 'express';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';
import 'dotenv/config'; // dotenv를 import와 동시에 실행

const app = express();

// PDF 텍스트는 길 수 있으므로 전송 용량 제한을 늘려줍니다.
app.use(express.json({ limit: '10mb' }));
app.use(cors());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

// 요약 전용 엔드포인트
app.post('/ask-ai', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: "요약할 텍스트가 없습니다." });
    }

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
      ${text}
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    return res.json({ summary: response.text() });

  } catch (error) {
    console.error("요약 에러:", error);
    return res.status(500).json({ error: "요약 중 오류가 발생했습니다." });
  }
});

// 기존 3000번 포트와 겹치지 않게 3001번으로 설정하거나, 
// 필요에 따라 포트를 조정하세요.
app.listen(3001, () => console.log('Summary Server running on http://localhost:3001'));