from flask import Flask, render_template, request
import fitz  # PyMuPDF
import io

app = Flask(__name__)

@app.route('/')
def index():
    # 업로드 페이지 렌더링
    return render_template('index.html')

@app.route('/analyze', methods=['POST'])
def analyze():
    if 'pdf_file' not in request.files:
        return "파일이 없습니다.", 400
    
    file = request.files['pdf_file']
    if file.filename == '':
        return "선택된 파일이 없습니다.", 400

    if file and file.filename.endswith('.pdf'):
        # 1. 업로드된 파일 읽기
        pdf_stream = file.read()
        
        # 2. PyMuPDF를 사용하여 텍스트 추출
        doc = fitz.open(stream=io.BytesIO(pdf_stream), filetype="pdf")
        full_text = ""
        for page in doc:
            full_text += page.get_text()
        doc.close()
        
        # 3. 결과 페이지로 텍스트 전달
        return render_template('index.html', filename=file.filename, content=full_text)
    
    return "PDF 파일만 업로드 가능합니다.", 400

if __name__ == '__main__':
    app.run(debug=True)