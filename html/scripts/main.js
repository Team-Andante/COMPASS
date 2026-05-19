// 1. Firebase Auth 라이브러리를 CDN 주소로 가져옴
import { 
  getAuth, 
  createUserWithEmailAndPassword,
  updateProfile 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// 2. firebase 폴더 안에 있는 firebase.js 파일을 가져옴
import app from "./firebase/firebase.js";

// 3. Auth 서비스 초기화
const auth = getAuth(app);

// 회원가입 처리
const onSubmit = async (event) => {
  // 폼 제출 시 페이지 새로고침 방지
  event.preventDefault();

  // HTML input 요소에서 직접 값 불러옴
  const email = document.getElementById('email').value;
  const name = document.getElementById('name').value;
  const password = document.getElementById('password').value;
  const passwordConfirm = document.getElementById('password-confirm').value;

  // 비밀번호 일치 확인
  if (password !== passwordConfirm) {
    alert("비밀번호가 서로 일치하지 않습니다.");
    return;
  }

  try {
    // Firebase 회원가입 시도
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // 2단계: 사용자 프로필에 이름 저장 (추가된 부분)
    await updateProfile(user, {
      displayName: name
    });

    console.log("회원가입 성공:", user);
    alert(`${user.displayName}님, 회원가입이 완료되었습니다!`);
    
    // 성공 시 로그인 페이지 이동
    location.href = './login.html';

  } catch (error) {
    const errorCode = error.code;
    const errorMessage = error.message;

    console.error("회원가입 실패:", errorCode, errorMessage);

    // 에러 메시지 처리
    if (errorCode === 'auth/email-already-in-use') {
      alert("이미 사용 중인 이메일 주소입니다.");
    } else if (errorCode === 'auth/weak-password') {
      alert("비밀번호는 최소 6자 이상이어야 합니다.");
    } else {
      alert("오류가 발생했습니다: " + errorMessage);
    }
  }
};

// 이벤트 리스너
const signupForm = document.getElementById('signup-form');

if (signupForm) {
  signupForm.addEventListener('submit', onSubmit);
  console.log("회원가입 폼 감지 및 이벤트 연결 완료");
} else {
  console.error("ID가 'signup-form'인 요소를 찾을 수 없습니다. HTML의 form ID를 확인하세요.");
}

export default app;