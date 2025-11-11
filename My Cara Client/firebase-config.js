// Firebase configuration placeholder.
// Create a Firebase project at https://console.firebase.google.com/
// Then copy your web app config here and replace the placeholder values.
// Example:
// const firebaseConfig = {
//   apiKey: "AIza...",
//   authDomain: "your-app.firebaseapp.com",
//   projectId: "your-app",
//   storageBucket: "your-app.appspot.com",
//   messagingSenderId: "1234567890",
//   appId: "1:1234567890:web:abcdef"
// };

// After filling the object below, the app will auto-initialize if Firebase SDK is loaded.
var firebaseConfig = {
  apiKey: "AIzaSyDB8nLI_UgboLdTz0Wu8OPKhw-2_G3vNOo",
  authDomain: "my-cara-f7f69.firebaseapp.com",
  projectId: "my-cara-f7f69",
  // Ensure storage bucket uses the usual appspot.com pattern which Firebase expects
  storageBucket: "my-cara-f7f69.appspot.com",
  messagingSenderId: "211920931437",
  appId: "1:211920931437:web:51a13028fd209f9f99cd64",
  measurementId: "G-H2D7QG9G5Q"
};

// Initialize Firebase if SDK loaded
if (window.firebase && firebase.initializeApp) {
  try { firebase.initializeApp(firebaseConfig); }
  catch (e) { console.warn('Firebase init failed:', e); }
}

// after firebase initialized
if (window.firebase && firebase.auth) {
  firebase.auth().onAuthStateChanged(user => {
    if (user) {
      // show user name, change nav links
      const name = user.displayName || user.email;
      // example: set text of #userName element
      const userEl = document.getElementById('mcUserName');
      if (userEl) userEl.textContent = name;
    } else {
      // user signed out; hide user-specific UI
    }
  });
}

// Expose some debug info for the page if initialization had issues
try {
  window.__mcFirebaseDebug = {
    initialized: !!(window.firebase && firebase.apps && firebase.apps.length),
    appsCount: window.firebase && firebase.apps ? firebase.apps.length : 0,
    config: Object.assign({}, firebaseConfig)
  };
  if (window.__mcFirebaseDebug.initialized) console.info('Firebase initialized, apps:', window.__mcFirebaseDebug.appsCount);
  else console.warn('Firebase not initialized yet or SDK missing', window.__mcFirebaseDebug);
} catch (e) { console.warn('mcFirebaseDebug init error', e); }

function signOut() {
  if (window.firebase && firebase.auth) {
    firebase.auth().signOut().then(() => {
      window.location.href = 'index.html';
    });
  }
}
