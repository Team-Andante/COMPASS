/**
 * Firebase 초기화 모듈
 * auth, app 인스턴스를 한 곳에서 export하여 각 스크립트가 재사용
 *
 * Firebase Client SDK 키는 클라이언트에 노출되도록 설계된 공개 키이며,
 * Firebase Security Rules로 접근을 제어합니다.
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";

const firebaseConfig = {
  apiKey: "AIzaSyDGS8rTUCi95_yF1v6Q35DvjWRb25J6FPs",
  authDomain: "compass-85721.firebaseapp.com",
  projectId: "compass-85721",
  storageBucket: "compass-85721.firebasestorage.app",
  messagingSenderId: "918747440994",
  appId: "1:918747440994:web:d4384f03580be94d662e3b",
  measurementId: "G-NFSESJBX9P",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
getAnalytics(app);

export default auth; 
export { app, auth };