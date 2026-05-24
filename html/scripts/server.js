const express = require('express');
const multer = require('multer');
const pdf = require('pdf-parse'); 
const cors = require('cors');
const path = require('path');

const app = express();

const HTML_ROOT = path.join(__dirname, '..');

app.use(cors()); // 중요: 브라우저 차단 방지
app.use(express.static(HTML_ROOT));
const upload = multer({ storage: multer.memoryStorage() });

app.get('/', (req, res) => {
    res.sendFile(path.join(HTML_ROOT, 'notice.html'));
});

app.post('/analyze', upload.single('pdf_file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, error: '파일 없음' });

        // pdf-parse 함수 안전하게 로드
        let pdfParser = (typeof pdf === 'function') ? pdf : pdf.default;
        const data = await pdfParser(req.file.buffer);

        res.json({ success: true, text: data.text });
    } catch (error) {
        console.error('서버 내부 에러:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.listen(3000, () => console.log(`✅ PDF 서버: http://localhost:3000`));