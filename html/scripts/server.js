import express from 'express';
import multer from 'multer';
import pdf from 'pdf-parse';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url'; // 경로 변환을 위해 추가
import Tesseract from 'tesseract.js';

const app = express();

// ES 모듈에서 __dirname 대체 로직
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HTML_ROOT = path.join(__dirname, '..');

app.use(cors());
app.use(express.static(HTML_ROOT));

const upload = multer({ storage: multer.memoryStorage() });

app.get('/', (req, res) => {
    res.sendFile(path.join(HTML_ROOT, 'notice.html'));
});

// PDF 텍스트 추출
app.post('/analyze', upload.single('pdf_file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, error: '파일 없음' });

        const mime = req.file.mimetype;
        const imageTypes = ['image/jpeg', 'image/png', 'image/webp'];

        // 이미지 파일 → Tesseract OCR
        if (imageTypes.includes(mime)) {
            console.log('🖼️ 이미지 감지 → OCR 시작');
            const { data: { text } } = await Tesseract.recognize(
                req.file.buffer,
                'kor+eng',   // 한국어 + 영어 동시 인식
                { logger: m => console.log(`  OCR: ${m.status} (${Math.round((m.progress || 0) * 100)}%)`) }
            );

            if (!text || text.trim().length === 0) {
                return res.status(422).json({ success: false, error: 'OCR 결과가 없습니다. 이미지 화질을 확인해주세요.' });
            }

            return res.json({ success: true, text: text.trim(), source: 'ocr' });
        }

        // PDF 파일 → pdf-parse
        if (mime === 'application/pdf') {
            console.log('📄 PDF 감지 → pdf-parse 시작');
            let pdfParser = (typeof pdf === 'function') ? pdf : pdf.default;
            const data = await pdfParser(req.file.buffer);

            if (!data.text || data.text.trim().length === 0) {
                return res.status(422).json({ success: false, error: 'PDF에서 텍스트를 추출할 수 없습니다. 스캔본이라면 이미지로 업로드해주세요.' });
            }

            return res.json({ success: true, text: data.text.trim(), source: 'pdf' });
        }

        return res.status(415).json({ success: false, error: '지원하지 않는 파일 형식입니다. (PDF, JPG, PNG, WEBP만 가능)' });

    } catch (error) {
        console.error('❌ 서버 내부 에러:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.listen(3000, () => console.log('✅ PDF/OCR 서버: http://localhost:3000'));