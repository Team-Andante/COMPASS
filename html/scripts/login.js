import { 
  getAuth, 
  signInWithEmailAndPassword 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import app from "./firebase/firebase.js";

const auth = getAuth(app);

const onLogin = async (event) => {
  event.preventDefault();

  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    console.log("로그인 성공:", user);
    alert("환영합니다!");
    
    // 로그인 성공 후 메인 페이지로 이동
    location.href = './index_reged.html'; 

  } catch (error) {
    console.error("로그인 실패:", error.code, error.message);

    // 에러 메시지 세분화
    if (error.code === 'auth/invalid-credential') {
      alert("이메일 또는 비밀번호가 올바르지 않습니다.");
    } else if (error.code === 'auth/user-not-found') {
      alert("존재하지 않는 계정입니다.");
    } else {
      alert("로그인 중 오류가 발생했습니다.");
    }
  }
};

const loginForm = document.getElementById('login-form');
if (loginForm) {
  loginForm.addEventListener('submit', onLogin);
}