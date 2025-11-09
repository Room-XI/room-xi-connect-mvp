import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';
const TEST_USER = {
  email: `ximi-test-${Date.now()}@test.local`,
  password: 'TestPassword123!',
  firstName: 'Ximi',
  lastName: 'Tester',
  dateOfBirth: '2006-01-15'
};

let sessionCookie = null;
let csrfToken = null;

async function getCsrfToken() {
  const response = await fetch(`${BASE_URL}/api/auth/csrf-token`, {
    credentials: 'include',
    headers: sessionCookie ? { 'Cookie': sessionCookie } : {}
  });
  
  const data = await response.json();
  
  if (response.headers.get('set-cookie')) {
    sessionCookie = response.headers.get('set-cookie');
  }
  
  return data.csrfToken;
}

async function registerUser() {
  console.log('\n📝 Step 1: Registering test user...');
  
  csrfToken = await getCsrfToken();
  
  const response = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': sessionCookie,
      'X-CSRF-Token': csrfToken
    },
    credentials: 'include',
    body: JSON.stringify(TEST_USER)
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(`Registration failed: ${data.error || response.statusText}`);
  }
  
  if (response.headers.get('set-cookie')) {
    sessionCookie = response.headers.get('set-cookie');
  }
  
  console.log(`✅ User registered: ${TEST_USER.email}`);
  console.log(`   User ID: ${data.user?.id}`);
  return data;
}

async function loginUser() {
  console.log('\n🔐 Step 2: Logging in...');
  
  csrfToken = await getCsrfToken();
  
  const response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': sessionCookie,
      'X-CSRF-Token': csrfToken
    },
    credentials: 'include',
    body: JSON.stringify({
      email: TEST_USER.email,
      password: TEST_USER.password
    })
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(`Login failed: ${data.error || response.statusText}`);
  }
  
  if (response.headers.get('set-cookie')) {
    sessionCookie = response.headers.get('set-cookie');
  }
  
  console.log('✅ Logged in successfully');
  return data;
}

async function enableXimiConsent() {
  console.log('\n🤖 Step 3: Enabling Ximi AI consent...');
  
  csrfToken = await getCsrfToken();
  
  const response = await fetch(`${BASE_URL}/api/ximi/consent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': sessionCookie,
      'X-CSRF-Token': csrfToken
    },
    credentials: 'include',
    body: JSON.stringify({ consent: true })
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(`Consent failed: ${data.error || response.statusText}`);
  }
  
  console.log('✅ Ximi consent enabled');
  return data;
}

async function testXimiChat(message, mode, moodType = null) {
  console.log(`\n💬 Testing Ximi chat (${mode} mode)...`);
  console.log(`   Message: "${message}"`);
  
  csrfToken = await getCsrfToken();
  
  const payload = {
    message,
    moodType,
    wellnessDimensions: moodType ? ['emotional', 'social'] : []
  };
  
  const response = await fetch(`${BASE_URL}/api/ximi/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': sessionCookie,
      'X-CSRF-Token': csrfToken
    },
    credentials: 'include',
    body: JSON.stringify(payload)
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(`Chat failed: ${data.error || response.statusText}`);
  }
  
  console.log(`\n📨 Ximi Response:`);
  console.log(`   Mode: ${data.mode}`);
  console.log(`   Response: "${data.ximiResponse}"`);
  console.log(`   Crisis Detected: ${data.crisisDetected || false}`);
  console.log(`   Length: ${data.ximiResponse?.length || 0} characters`);
  
  return data;
}

async function switchXimiMode(mode) {
  console.log(`\n🔄 Switching Ximi to ${mode} mode...`);
  
  csrfToken = await getCsrfToken();
  
  const response = await fetch(`${BASE_URL}/api/ximi/toggle-mode`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': sessionCookie,
      'X-CSRF-Token': csrfToken
    },
    credentials: 'include',
    body: JSON.stringify({ mode })
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(`Mode switch failed: ${data.error || response.statusText}`);
  }
  
  console.log(`✅ ${data.message}`);
  return data;
}

function analyzeResponse(response, testName) {
  console.log(`\n🔍 Analyzing ${testName}...`);
  
  const text = response.ximiResponse || '';
  
  const isFallback = 
    text.includes("I'm having trouble thinking right now") ||
    text.includes("Something's off on my end") ||
    text.includes("I'm here if you want to talk more");
  
  const isGeneric = text.length < 20;
  
  const isContextual = 
    text.length > 30 &&
    !isFallback &&
    (text.includes('?') || text.toLowerCase().includes('you'));
  
  let status = '❌ ERROR';
  let type = 'Unknown';
  
  if (isFallback) {
    status = '⚠️  FALLBACK';
    type = 'Fallback response (AI not activated)';
  } else if (isGeneric) {
    status = '⚠️  GENERIC';
    type = 'Generic response (possibly scripted)';
  } else if (isContextual) {
    status = '✅ AI-GENERATED';
    type = 'Contextual AI response';
  } else {
    status = '⚠️  UNCERTAIN';
    type = 'Response received but uncertain if AI-generated';
  }
  
  console.log(`   Status: ${status}`);
  console.log(`   Type: ${type}`);
  console.log(`   Is Fallback: ${isFallback}`);
  console.log(`   Is Contextual: ${isContextual}`);
  
  return { status, type, isFallback, isContextual };
}

async function runTests() {
  console.log('🧪 XIMI AI INTEGRATION TEST');
  console.log('=' .repeat(60));
  
  const results = {
    registration: false,
    login: false,
    consent: false,
    siblingMode: null,
    peerMode: null,
    overallStatus: '❌ NOT WORKING'
  };
  
  try {
    await registerUser();
    results.registration = true;
    
    await loginUser();
    results.login = true;
    
    await enableXimiConsent();
    results.consent = true;
    
    console.log('\n' + '='.repeat(60));
    console.log('🧪 TESTING SIBLING MODE');
    console.log('='.repeat(60));
    
    const siblingResponse = await testXimiChat(
      "I've been feeling down lately and don't know what to do",
      'sibling',
      'stormy'
    );
    results.siblingMode = analyzeResponse(siblingResponse, 'Sibling Mode');
    
    console.log('\n' + '='.repeat(60));
    console.log('🧪 TESTING PEER MODE');
    console.log('='.repeat(60));
    
    await switchXimiMode('peer');
    
    const peerResponse = await testXimiChat(
      "I want to make positive changes but need guidance",
      'peer',
      'foggy'
    );
    results.peerMode = analyzeResponse(peerResponse, 'Peer Mode');
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 FINAL RESULTS');
    console.log('='.repeat(60));
    
    console.log('\n✓ Authentication & Setup:');
    console.log(`  • User Registration: ${results.registration ? '✅' : '❌'}`);
    console.log(`  • Login: ${results.login ? '✅' : '❌'}`);
    console.log(`  • Ximi Consent: ${results.consent ? '✅' : '❌'}`);
    
    console.log('\n✓ Ximi Chat Tests:');
    console.log(`  • Sibling Mode: ${results.siblingMode.status}`);
    console.log(`    ${results.siblingMode.type}`);
    console.log(`  • Peer Mode: ${results.peerMode.status}`);
    console.log(`    ${results.peerMode.type}`);
    
    const bothWorking = 
      results.siblingMode.isContextual && 
      results.peerMode.isContextual;
    
    const bothFallback = 
      results.siblingMode.isFallback && 
      results.peerMode.isFallback;
    
    if (bothWorking) {
      results.overallStatus = '✅ FULLY WORKING WITH AI RESPONSES';
    } else if (bothFallback) {
      results.overallStatus = '⚠️  WORKING BUT USING FALLBACK RESPONSES (AI NOT ACTIVATED)';
    } else {
      results.overallStatus = '⚠️  PARTIALLY WORKING (MIXED RESULTS)';
    }
    
    console.log('\n' + '='.repeat(60));
    console.log(`OVERALL STATUS: ${results.overallStatus}`);
    console.log('='.repeat(60));
    
    console.log('\n✓ Environment Variables:');
    console.log(`  • AI_INTEGRATIONS_OPENAI_API_KEY: ${process.env.AI_INTEGRATIONS_OPENAI_API_KEY ? '✅ Set' : '❌ Missing'}`);
    console.log(`  • AI_INTEGRATIONS_OPENAI_BASE_URL: ${process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || '❌ Missing'}`);
    
    console.log('\n✓ Sample Responses:');
    console.log(`  • Sibling Mode (${siblingResponse.moodContext || 'no mood'}): "${siblingResponse.ximiResponse}"`);
    console.log(`  • Peer Mode (${peerResponse.moodContext || 'no mood'}): "${peerResponse.ximiResponse}"`);
    
    if (!bothWorking && !bothFallback) {
      console.log('\n⚠️  Note: Mixed results may indicate API rate limits or model availability issues.');
      console.log('   Check server logs for detailed error messages.');
    }
    
    if (bothFallback) {
      console.log('\n⚠️  Note: Fallback responses indicate the OpenAI API is not responding.');
      console.log('   This could be due to:');
      console.log('   • Replit AI integration not fully configured');
      console.log('   • API rate limits or quota exceeded');
      console.log('   • Model availability issues (gpt-5 or gpt-4o-mini)');
      console.log('   • Network connectivity issues');
    }
    
    process.exit(bothWorking ? 0 : 1);
    
  } catch (error) {
    console.error('\n❌ TEST FAILED');
    console.error('Error:', error.message);
    console.error('\nStack:', error.stack);
    process.exit(1);
  }
}

runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
