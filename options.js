document.getElementById('save').addEventListener('click', async ()=>{
  const apiKey = document.getElementById('apiKey').value.trim();
  const model = document.getElementById('model').value.trim() || 'text-bison-001';
  const sheetId = document.getElementById('sheetId').value.trim();
  const sheetRange = document.getElementById('sheetRange').value.trim() || 'Sheet1!A:D';
  const supabaseUrl = document.getElementById('supabaseUrl').value.trim();
  const supabaseKey = document.getElementById('supabaseKey').value.trim();
  const manualUserEmail = document.getElementById('manualUserEmail').value.trim();
  await chrome.storage.sync.set({
    gemini_api_key:apiKey, 
    gemini_model:model, 
    spreadsheetId:sheetId, 
    sheetRange, 
    api_type:'palm',
    supabase_url: supabaseUrl,
    supabase_key: supabaseKey,
    supabase_user_email: manualUserEmail,
    user_identifier: manualUserEmail || ''
  });
  document.getElementById('status').textContent='Saved';
  document.getElementById('status').style.color='green';
  setTimeout(()=>{ document.getElementById('status').textContent=''; }, 2000);
});

document.getElementById('loginBtn').addEventListener('click', async ()=>{
  debugLog('Login button clicked');
  document.getElementById('authStatus').textContent='Logging in...';
  try {
    debugLog('Calling getGoogleUserInfo()...');
    const userInfo = await getGoogleUserInfo();
    debugLog(`User info received: ${userInfo.email}`);
    await cacheUserInfo(userInfo);
    document.getElementById('authStatus').textContent='Login successful!';
    document.getElementById('authStatus').style.color='green';
    debugSuccess('Login process complete');
    setTimeout(()=>{ 
      document.getElementById('authStatus').textContent=''; 
      updateUserDisplay();
    }, 1500);
  } catch (e) {
    debugError('Login failed', e);
    document.getElementById('authStatus').textContent='Login failed: ' + e.message;
    document.getElementById('authStatus').style.color='red';
  }
});

document.getElementById('logoutBtn').addEventListener('click', async ()=>{
  debugLog('Logout button clicked');
  if (confirm('Are you sure you want to logout?')) {
    debugLog('Logout confirmed');
    await signOutGoogle();
    document.getElementById('authStatus').textContent='Logged out';
    document.getElementById('authStatus').style.color='green';
    setTimeout(()=>{ 
      document.getElementById('authStatus').textContent=''; 
      updateUserDisplay();
    }, 1500);
  } else {
    debugLog('Logout cancelled');
  }
});

document.getElementById('testConnection').addEventListener('click', async ()=>{
  debugLog('Test Connection button clicked');
  const supabaseUrl = document.getElementById('supabaseUrl').value.trim();
  const supabaseKey = document.getElementById('supabaseKey').value.trim();
  
  debugLog(`Testing connection to: ${supabaseUrl}`);
  
  if (!supabaseUrl || !supabaseKey) {
    debugWarning('URL or Key is empty');
    document.getElementById('status').textContent='Please enter URL and API Key';
    document.getElementById('status').style.color='red';
    return;
  }
  
  document.getElementById('status').textContent='Testing...';
  document.getElementById('status').style.color='black';
  
  try {
    debugLog('Sending test request...');
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'GET',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });
    
    debugLog(`Response status: ${response.status}`);
    
    if (response.ok) {
      debugSuccess('Connection test successful');
      document.getElementById('status').textContent='✓ Connection successful!';
      document.getElementById('status').style.color='green';
    } else {
      debugError(`Connection failed with status: ${response.status}`);
      document.getElementById('status').textContent='✗ Connection failed: ' + response.status;
      document.getElementById('status').style.color='red';
    }
  } catch (e) {
    debugError('Connection test error', e);
    document.getElementById('status').textContent='✗ Error: ' + e.message;
    document.getElementById('status').style.color='red';
  }
  
  setTimeout(()=>{ document.getElementById('status').textContent=''; }, 5000);
});

document.getElementById('testRest').addEventListener('click', async ()=>{
  debugLog('Test REST button clicked');
  const supabaseUrl = document.getElementById('supabaseUrl').value.trim();
  const supabaseKey = document.getElementById('supabaseKey').value.trim();

  if (!supabaseUrl || !supabaseKey) {
    debugWarning('URL or Key is empty (REST test)');
    document.getElementById('status').textContent='Please enter URL and API Key';
    document.getElementById('status').style.color='red';
    return;
  }

  document.getElementById('status').textContent='Testing REST...';
  document.getElementById('status').style.color='black';

  const testUrl = `${supabaseUrl}/rest/v1/notes?select=id&limit=1`;
  try {
    debugLog(`REST GET ${testUrl}`);
    const res = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Accept': 'application/json'
      },
      mode: 'cors',
      credentials: 'omit',
      cache: 'no-store',
      referrerPolicy: 'no-referrer'
    });

    debugLog(`REST status: ${res.status} ${res.statusText}`);
    const text = await res.text();
    debugLog(`REST body: ${text.slice(0,300)}`);

    if (res.ok) {
      document.getElementById('status').textContent='✓ REST OK';
      document.getElementById('status').style.color='green';
    } else {
      document.getElementById('status').textContent=`✗ REST failed: ${res.status}`;
      document.getElementById('status').style.color='red';
    }
  } catch (e) {
    debugError('REST test error', e);
    document.getElementById('status').textContent='✗ REST error: ' + e.message;
    document.getElementById('status').style.color='red';
  }

  setTimeout(()=>{ document.getElementById('status').textContent=''; }, 6000);
});

async function updateUserDisplay() {
  debugLog('Updating user display...');
  const result = await chrome.storage.local.get({
    user_email: null,
    user_name: null,
    user_picture: null
  });
  
  const userInfo = document.getElementById('userInfo');
  const loginBtn = document.getElementById('loginBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const userName = document.getElementById('userName');
  const userEmail = document.getElementById('userEmail');
  const userPicture = document.getElementById('userPicture');
  
  if (result.user_email) {
    // Logged in
    debugLog(`User logged in: ${result.user_email}`);
    userInfo.style.display = 'block';
    loginBtn.style.display = 'none';
    logoutBtn.style.display = 'inline-block';
    userName.textContent = result.user_name || 'User';
    userEmail.textContent = result.user_email;
    userPicture.src = result.user_picture || '';
  } else {
    // Not logged in
    debugLog('No user logged in');
    userInfo.style.display = 'none';
    loginBtn.style.display = 'inline-block';
    logoutBtn.style.display = 'none';
  }
}

async function load(){
  const s = await chrome.storage.sync.get({
    gemini_api_key:'',
    gemini_model:'text-bison-001',
    spreadsheetId:'',
    sheetRange:'Sheet1!A:D',
    supabase_url:'',
    supabase_key:'',
    supabase_user_email:''
  });
  document.getElementById('apiKey').value = s.gemini_api_key || '';
  document.getElementById('model').value = s.gemini_model || 'text-bison-001';
  document.getElementById('sheetId').value = s.spreadsheetId || '';
  document.getElementById('sheetRange').value = s.sheetRange || 'Sheet1!A:D';
  // Prefill defaults if not yet configured
  document.getElementById('supabaseUrl').value = s.supabase_url || 'https://rjivwtxcgyfpirsvfaqn.supabase.co';
  document.getElementById('supabaseKey').value = s.supabase_key || 'sb_publishable_2_wthncAW6WCAoEpjILw7Q_UjEZASHo';
  document.getElementById('manualUserEmail').value = s.supabase_user_email || '';
}

load();
updateUserDisplay();
