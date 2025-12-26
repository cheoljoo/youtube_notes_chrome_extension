document.getElementById('save').addEventListener('click', async ()=>{
  // Firebase 설정
  const firebaseApiKey = document.getElementById('firebaseApiKey').value.trim();
  const firebaseAuthDomain = document.getElementById('firebaseAuthDomain').value.trim();
  const firebaseProjectId = document.getElementById('firebaseProjectId').value.trim();
  const firebaseStorageBucket = document.getElementById('firebaseStorageBucket').value.trim();
  const firebaseMessagingSenderId = document.getElementById('firebaseMessagingSenderId').value.trim();
  const firebaseAppId = document.getElementById('firebaseAppId').value.trim();
  
  // Gemini API 설정
  const apiKey = document.getElementById('apiKey').value.trim();
  const model = document.getElementById('model').value.trim() || 'text-bison-001';
  const sheetId = document.getElementById('sheetId').value.trim();
  const sheetRange = document.getElementById('sheetRange').value.trim() || 'Sheet1!A:D';
  
  await chrome.storage.sync.set({
    firebase_api_key: firebaseApiKey,
    firebase_auth_domain: firebaseAuthDomain,
    firebase_project_id: firebaseProjectId,
    firebase_storage_bucket: firebaseStorageBucket,
    firebase_messaging_sender_id: firebaseMessagingSenderId,
    firebase_app_id: firebaseAppId,
    gemini_api_key: apiKey,
    gemini_model: model,
    spreadsheetId: sheetId,
    sheetRange,
    api_type: 'palm'
  });
  
  document.getElementById('status').textContent = 'Saved!';
  setTimeout(() => {
    document.getElementById('status').textContent = '';
  }, 2000);
});

async function load(){
  const s = await chrome.storage.sync.get({
    firebase_api_key: '',
    firebase_auth_domain: '',
    firebase_project_id: '',
    firebase_storage_bucket: '',
    firebase_messaging_sender_id: '',
    firebase_app_id: '',
    gemini_api_key: '',
    gemini_model: 'text-bison-001',
    spreadsheetId: '',
    sheetRange: 'Sheet1!A:D'
  });
  
  document.getElementById('firebaseApiKey').value = s.firebase_api_key || '';
  document.getElementById('firebaseAuthDomain').value = s.firebase_auth_domain || '';
  document.getElementById('firebaseProjectId').value = s.firebase_project_id || '';
  document.getElementById('firebaseStorageBucket').value = s.firebase_storage_bucket || '';
  document.getElementById('firebaseMessagingSenderId').value = s.firebase_messaging_sender_id || '';
  document.getElementById('firebaseAppId').value = s.firebase_app_id || '';
  
  document.getElementById('apiKey').value = s.gemini_api_key || '';
  document.getElementById('model').value = s.gemini_model || 'text-bison-001';
  document.getElementById('sheetId').value = s.spreadsheetId || '';
  document.getElementById('sheetRange').value = s.sheetRange || 'Sheet1!A:D';
}

load();
