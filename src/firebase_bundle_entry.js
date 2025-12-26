// Use Firebase compat so existing popup.js continues to work
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';

// Expose globally for popup.js
// MV3 CSP requires local bundling; this file will be bundled to vendor/firebase.bundle.js
if (typeof window !== 'undefined') {
  window.firebase = firebase;
}

// Also expose as global for older code
if (typeof globalThis !== 'undefined') {
  globalThis.firebase = firebase;
}

// Export for module usage
export default firebase;
