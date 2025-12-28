document.getElementById('save').addEventListener('click', async ()=>{
  const supabaseUrl = document.getElementById('supabaseUrl').value.trim();
  const supabaseKey = document.getElementById('supabaseKey').value.trim();
  const manualUserEmail = document.getElementById('manualUserEmail').value.trim();
  if (!manualUserEmail) {
    debugWarning('Manual user email/ID is required');
    document.getElementById('status').textContent='Please enter your email or ID';
    document.getElementById('status').style.color='red';
    return;
  }

  const prev = await chrome.storage.sync.get({ supabase_user_email: '', user_identifier: '' });
  const changedUser = (prev.supabase_user_email || '') !== manualUserEmail;

  await chrome.storage.sync.set({
    supabase_url: supabaseUrl,
    supabase_key: supabaseKey,
    supabase_user_email: manualUserEmail,
    user_identifier: manualUserEmail
  });

  if (changedUser) {
    // Clear local data so the popup list switches to the new user context
    await chrome.storage.local.set({ notes: [], deletedNotes: [] });
    await chrome.storage.sync.set({ tags: [] });
    document.getElementById('status').textContent='Saved. Email/ID changed; loading notes for the new user...';
    document.getElementById('status').style.color='black';
    try {
      const count = await refreshNotesForUser(manualUserEmail);
      document.getElementById('status').textContent=`Loaded ${count} notes for ${manualUserEmail}`;
      document.getElementById('status').style.color='green';
    } catch (e) {
      debugError('Reload after email change failed', e);
      document.getElementById('status').textContent='Saved. Failed to load notes for new user (check URL/key).';
      document.getElementById('status').style.color='red';
    }
  } else {
    document.getElementById('status').textContent='Saved';
  }
  document.getElementById('status').style.color='green';
  setTimeout(()=>{ document.getElementById('status').textContent=''; }, 4000);
});

// Google login/logout removed from Settings

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

// No user display in Settings anymore

async function load(){
  const s = await chrome.storage.sync.get({
    supabase_url:'',
    supabase_key:'',
    supabase_user_email:''
  });
  document.getElementById('supabaseUrl').value = s.supabase_url || 'https://rjivwtxcgyfpirsvfaqn.supabase.co';
  document.getElementById('supabaseKey').value = s.supabase_key || 'sb_publishable_2_wthncAW6WCAoEpjILw7Q_UjEZASHo';
  document.getElementById('manualUserEmail').value = s.supabase_user_email || '';
}

load();

// Fetch remote notes for the given user and replace local notes/tags
async function refreshNotesForUser(userEmail) {
  const client = await getSupabaseClient();
  const remoteNotes = await client.getAllNotesAll(userEmail);
  const converted = (remoteNotes || []).map(r => ({
    time: r?.time ?? Date.now(),
    tags: Array.isArray(r?.tags) ? r.tags : [],
    opinion: r?.opinion ?? null,
    url: r?.url ?? null,
    youtubeTitle: r?.youtube_title ?? null,
    youtubePublished: r?.youtube_published ?? null
  }));

  const deduped = dedupeByContentLocal(converted);
  await chrome.storage.local.set({ notes: deduped, deletedNotes: [] });

  const tagSet = new Set();
  deduped.forEach(n => (n.tags || []).forEach(t => tagSet.add(t)));
  await chrome.storage.sync.set({ tags: Array.from(tagSet) });

  return deduped.length;
}

function dedupeByContentLocal(list) {
  const byKey = new Map();
  for (const n of (list || [])) {
    const title = String(n?.youtubeTitle || '').trim();
    const tags = (Array.isArray(n?.tags) ? n.tags : []).map(v => String(v || '').trim()).sort();
    const opinion = String(n?.opinion || '').trim();
    const key = `${title}|${tags.join(',')}|${opinion}`;
    if (!byKey.has(key) || ((n?.time || 0) > (byKey.get(key)?.time || 0))) {
      byKey.set(key, n);
    }
  }
  return Array.from(byKey.values()).sort((a, b) => (b.time || 0) - (a.time || 0));
}
