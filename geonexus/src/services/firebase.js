import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyBYS9IOqUnHvN9C_UQHxlkPDr-BGwDKTFc",
  authDomain: "geonexus-cc89f.firebaseapp.com",
  databaseURL: "https://geonexus-cc89f-default-rtdb.firebaseio.com",
  projectId: "geonexus-cc89f",
  storageBucket: "geonexus-cc89f.firebasestorage.app",
  messagingSenderId: "518950350996",
  appId: "1:518950350996:web:361037bb7262c288404481"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getDatabase(app);
export default app;