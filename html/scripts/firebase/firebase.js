/* Firebase 초기화용 표준 설정 코드 */

// Firebase SDK 모듈 Import
// v9 이상부터는 필요한 서비스만 선택해서 가져오는 Modular 방식 사용
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";

// 추가 기능 필요 시 아래 형식으로 Import
// import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Firebase 프로젝트 설정 정보
const firebaseConfig = {
  apiKey: "AIzaSyDGS8rTUCi95_yF1v6Q35DvjWRb25J6FPs",      // API 인증 키
  authDomain: "compass-85721.firebaseapp.com",            // 인증 도메인
  projectId: "compass-85721",                             // 프로젝트 ID
  storageBucket: "compass-85721.firebasestorage.app",     // 저장소 버킷 주소
  messagingSenderId: "918747440994",                      // 클라우드 메시징 발신자 ID
  appId: "1:918747440994:web:d4384f03580be94d662e3b",     // 애플리케이션 고유 ID
  measurementId: "G-NFSESJBX9P"                           // 구글 애널리틱스 측정 ID (선택 사항)
};

const app = initializeApp(firebaseConfig);      // Firebase 초기화
const analytics = getAnalytics(app);            // Google Analytics 초기화
export default app;                             // 다른 파일에서 Firebase 사용할 수 있게 Export