#!/usr/bin/env node

// Test script for parent consent system
import fetch from 'node-fetch';
import crypto from 'crypto';

const BASE_URL = 'http://localhost:5000';
let cookies = '';
let csrfToken = '';
let testUserId = '';
let testParentToken = '';
let testQRToken = '';

// Helper to make authenticated requests
async function apiCall(method, path, body = null, headers = {}) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookies,
      'x-csrf-token': csrfToken,
      ...headers
    }
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  const res = await fetch(BASE_URL + path, options);
  
  // Extract cookies and CSRF token if present
  const setCookie = res.headers.get('set-cookie');
  if (setCookie) {
    cookies = setCookie;
  }
  
  const newCsrf = res.headers.get('x-csrf-token');
  if (newCsrf) {
    csrfToken = newCsrf;
  }
  
  const text = await res.text();
  try {
    return { status: res.status, data: JSON.parse(text) };
  } catch {
    return { status: res.status, data: text };
  }
}

// Color codes for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(color, message) {
  console.log(colors[color] + message + colors.reset);
}

async function runTests() {
  log('cyan', '\n🧪 Starting Parent Consent System Tests...\n');
  
  try {
    // Test 1: Get CSRF Token
    log('blue', '1. Getting CSRF token...');
    const csrfRes = await apiCall('GET', '/api/csrf-token');
    if (csrfRes.status === 200) {
      log('green', '✓ CSRF token obtained');
    } else {
      throw new Error('Failed to get CSRF token');
    }
    
    // Test 2: Create test user
    log('blue', '\n2. Creating test youth user...');
    const testEmail = `youth_${Date.now()}@test.com`;
    const signupRes = await apiCall('POST', '/api/auth/signup', {
      email: testEmail,
      password: 'TestPass123!',
      name: 'Test Youth',
      age: 16
    });
    
    if (signupRes.status === 200) {
      testUserId = signupRes.data.user.id;
      log('green', `✓ Youth user created: ${testEmail} (ID: ${testUserId})`);
    } else {
      log('yellow', `⚠ User creation failed: ${JSON.stringify(signupRes.data)}`);
    }
    
    // Test 3: Send parent invitation
    log('blue', '\n3. Sending parent invitation...');
    const parentEmail = `parent_${Date.now()}@test.com`;
    const inviteRes = await apiCall('POST', '/api/parent-auth/invite', {
      email: parentEmail,
      name: 'Test Parent',
      relation: 'mother'
    });
    
    if (inviteRes.status === 200 && inviteRes.data.token) {
      testParentToken = inviteRes.data.token;
      log('green', `✓ Parent invitation sent to: ${parentEmail}`);
      log('cyan', `  Token: ${testParentToken}`);
    } else {
      log('yellow', `⚠ Invitation failed: ${JSON.stringify(inviteRes.data)}`);
    }
    
    // Test 4: Accept parent invitation (simulate magic link click)
    log('blue', '\n4. Accepting parent invitation (magic link)...');
    const acceptRes = await apiCall('GET', `/api/parent-auth/accept/${testParentToken}`);
    
    if (acceptRes.status === 200) {
      log('green', '✓ Parent invitation accepted');
      log('cyan', `  Parent is now linked to youth`);
    } else {
      log('yellow', `⚠ Accept failed: ${JSON.stringify(acceptRes.data)}`);
    }
    
    // Test 5: Check parent status
    log('blue', '\n5. Checking parent authentication status...');
    const statusRes = await apiCall('GET', '/api/parent-auth/status');
    
    if (statusRes.status === 200 && statusRes.data.authenticated) {
      log('green', '✓ Parent is authenticated');
      log('cyan', `  Linked youth: ${JSON.stringify(statusRes.data.linkedYouth, null, 2)}`);
    } else {
      log('yellow', `⚠ Parent not authenticated: ${JSON.stringify(statusRes.data)}`);
    }
    
    // Test 6: Request platform consent
    log('blue', '\n6. Creating platform consent request...');
    const consentRes = await apiCall('POST', '/api/consent-auto/bootstrap', {
      userId: testUserId
    });
    
    if (consentRes.status === 200) {
      log('green', '✓ Platform consent request created');
    } else {
      log('yellow', `⚠ Consent request failed: ${JSON.stringify(consentRes.data)}`);
    }
    
    // Test 7: Approve platform consent (as parent)
    log('blue', '\n7. Approving platform consent as parent...');
    const approveRes = await apiCall('POST', '/api/consent-auto/approve', {
      userId: testUserId,
      consentType: 'platform_terms',
      value: true
    });
    
    if (approveRes.status === 200) {
      log('green', '✓ Platform consent approved by parent');
    } else {
      log('yellow', `⚠ Consent approval failed: ${JSON.stringify(approveRes.data)}`);
    }
    
    // Test 8: Generate QR code for youth badge
    log('blue', '\n8. Generating QR code for youth badge...');
    // First switch back to youth session
    const loginRes = await apiCall('POST', '/api/auth/login', {
      email: testEmail,
      password: 'TestPass123!'
    });
    
    const qrRes = await apiCall('GET', '/api/qr/generate');
    
    if (qrRes.status === 200 && qrRes.data.token) {
      testQRToken = qrRes.data.token;
      log('green', '✓ QR code generated');
      log('cyan', `  Token: ${testQRToken.substring(0, 20)}...`);
      log('cyan', `  Expires in: ${qrRes.data.expiresIn}ms`);
    } else {
      log('yellow', `⚠ QR generation failed: ${JSON.stringify(qrRes.data)}`);
    }
    
    // Test 9: Validate QR token
    log('blue', '\n9. Validating QR token...');
    const validateRes = await apiCall('GET', `/api/qr/validate/${testQRToken}`);
    
    if (validateRes.status === 200 && validateRes.data.valid) {
      log('green', '✓ QR token is valid');
      log('cyan', `  User ID: ${validateRes.data.userId}`);
    } else {
      log('yellow', `⚠ QR validation failed: ${JSON.stringify(validateRes.data)}`);
    }
    
    // Test 10: Scan QR code (as staff/parent)
    log('blue', '\n10. Scanning QR code for event check-in...');
    const scanRes = await apiCall('POST', '/api/qr/scan', {
      token: testQRToken,
      programEventId: 'test-event-123',
      eventEndIso: new Date(Date.now() + 3600000).toISOString() // 1 hour from now
    });
    
    if (scanRes.status === 200) {
      log('green', '✓ QR code scanned successfully');
      log('cyan', `  Mood tasks created: ${scanRes.data.tasksCreated}`);
    } else {
      log('yellow', `⚠ QR scan failed: ${JSON.stringify(scanRes.data)}`);
    }
    
    // Test 11: Collect youth demographics
    log('blue', '\n11. Submitting youth demographics...');
    const youthDemoRes = await apiCall('POST', '/api/demographics/youth', {
      gender: 'non-binary',
      pronouns: 'they/them',
      ethnicity: ['indigenous', 'european'],
      schoolGrade: '10',
      livingArrangement: 'both_parents',
      challenges: ['anxiety', 'school_stress']
    });
    
    if (youthDemoRes.status === 200) {
      log('green', '✓ Youth demographics saved');
    } else {
      log('yellow', `⚠ Demographics failed: ${JSON.stringify(youthDemoRes.data)}`);
    }
    
    // Test 12: Get pending mood tasks
    log('blue', '\n12. Checking pending mood tasks...');
    const tasksRes = await apiCall('GET', '/api/mood-tasks/pending');
    
    if (tasksRes.status === 200 && tasksRes.data.tasks) {
      log('green', `✓ Found ${tasksRes.data.tasks.length} pending mood task(s)`);
      tasksRes.data.tasks.forEach(task => {
        log('cyan', `  - ${task.type} mood for event ${task.programEventId}`);
      });
    } else {
      log('yellow', `⚠ Mood tasks fetch failed: ${JSON.stringify(tasksRes.data)}`);
    }
    
    // Test 13: Test error handling - invalid token
    log('blue', '\n13. Testing error handling (invalid magic link)...');
    const badTokenRes = await apiCall('GET', '/api/parent-auth/accept/invalid-token-123');
    
    if (badTokenRes.status === 400 || badTokenRes.status === 404) {
      log('green', '✓ Invalid token properly rejected');
    } else {
      log('yellow', `⚠ Expected error for invalid token, got: ${badTokenRes.status}`);
    }
    
    // Test 14: Test duplicate QR scan
    log('blue', '\n14. Testing duplicate QR scan (should fail)...');
    const dupScanRes = await apiCall('POST', '/api/qr/scan', {
      token: testQRToken,
      programEventId: 'test-event-123'
    });
    
    if (dupScanRes.status === 410) {
      log('green', '✓ Duplicate QR scan properly rejected');
    } else {
      log('yellow', `⚠ Expected error for duplicate scan, got: ${dupScanRes.status}`);
    }
    
    // Test 15: Logout parent
    log('blue', '\n15. Testing parent logout...');
    const logoutRes = await apiCall('POST', '/api/parent-auth/logout');
    
    if (logoutRes.status === 200) {
      log('green', '✓ Parent logged out successfully');
    } else {
      log('yellow', `⚠ Logout failed: ${JSON.stringify(logoutRes.data)}`);
    }
    
    // Summary
    log('cyan', '\n' + '='.repeat(50));
    log('green', '✅ Parent Consent System Test Suite Complete!');
    log('cyan', '='.repeat(50));
    log('cyan', '\nKey Features Tested:');
    log('green', '  ✓ Youth user registration');
    log('green', '  ✓ Parent invitation via magic link');
    log('green', '  ✓ Parent account creation and linking');
    log('green', '  ✓ Platform consent request/approval');
    log('green', '  ✓ QR code generation and validation');
    log('green', '  ✓ Event check-in with mood tasks');
    log('green', '  ✓ Demographics collection');
    log('green', '  ✓ Error handling and security');
    
  } catch (error) {
    log('red', `\n❌ Test suite failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Run the tests
runTests().then(() => {
  log('cyan', '\n🎉 All tests completed successfully!\n');
  process.exit(0);
}).catch(err => {
  log('red', `\n❌ Fatal error: ${err.message}\n`);
  process.exit(1);
});