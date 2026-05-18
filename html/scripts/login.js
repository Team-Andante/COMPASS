import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import app from "./firebase/firebase.js";
// 💡 공통 토스트 함수 가져오기
import { showToast, reserveToast } from "./toast.js"; 

const auth = getAuth(app);

const onLogin = async (event) => {
  event.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // 💡 다음 페이지로 토스트 예약 후 즉시 이동
    // showToast(`${user.displayName || '사용자'}님, 환영합니다!`, 'success');
    reserveToast(`${user.displayName || '사용자'}님, 환영합니다!`, 'success');
    window.location.replace('./index_reged.html'); 
  }
  catch (error) {
    let errorMsg = "로그인 중 오류가 발생했습니다.";
    if (error.code === 'auth/invalid-credential') {
      errorMsg = "이메일 또는 비밀번호가 올바르지 않습니다.";
    }
    
    // 💡 실패 시에는 그 자리에서 바로 토스트 표시
    showToast(error, 'error');
  }
};

document.getElementById('login-form')?.addEventListener('submit', onLogin);