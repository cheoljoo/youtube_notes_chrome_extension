document.getElementById('save').addEventListener('click', async ()=>{
  const apiKey = document.getElementById('apiKey').value.trim();
  const model = document.getElementById('model').value.trim() || 'text-bison-001';
  const sheetId = document.getElementById('sheetId').value.trim();
  const sheetRange = document.getElementById('sheetRange').value.trim() || 'Sheet1!A:D';
  await chrome.storage.sync.set({gemini_api_key:apiKey, gemini_model:model, spreadsheetId:sheetId, sheetRange, api_type:'palm'});
  document.getElementById('status').textContent='저장됨';
});

async function load(){
  const s = await chrome.storage.sync.get({gemini_api_key:'',gemini_model:'text-bison-001',spreadsheetId:'',sheetRange:'Sheet1!A:D'});
  document.getElementById('apiKey').value = s.gemini_api_key || '';
  document.getElementById('model').value = s.gemini_model || 'text-bison-001';
  document.getElementById('sheetId').value = s.spreadsheetId || '';
  document.getElementById('sheetRange').value = s.sheetRange || 'Sheet1!A:D';
}

load();
