// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDGS8rTUCi95_yF1v6Q35DvjWRb25J6FPs",
  authDomain: "compass-85721.firebaseapp.com",
  projectId: "compass-85721",
  storageBucket: "compass-85721.firebasestorage.app",
  messagingSenderId: "918747440994",
  appId: "1:918747440994:web:d4384f03580be94d662e3b",
  measurementId: "G-NFSESJBX9P"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export default app;