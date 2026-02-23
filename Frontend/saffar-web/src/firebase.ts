import { initializeApp } from "firebase/app";
import { getMessaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyAJyi5Q49ovISzvG1LP21Fbv0kuF8Qs3LI",
  authDomain: "saffar-1b910.firebaseapp.com",
  projectId: "saffar-1b910",
  storageBucket: "saffar-1b910.appspot.com",
  messagingSenderId: "873083494145",
  appId: "1:873083494145:web:08fa9aa9c1dc99ba6c8500",
};

export const firebaseApp = initializeApp(firebaseConfig);
export const messaging = getMessaging(firebaseApp);