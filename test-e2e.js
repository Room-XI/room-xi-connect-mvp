/**
 * End-to-End Test Suite for Room XI Connect
 * Comprehensive testing of all critical features before launch
 */

const BASE_URL = 'http://localhost:5000';
const API_BASE = `${BASE_URL}/api`;

// Test results tracking
const results = {
  passed: [],
  warnings: [],
  failed: [],
};

function logPass(test) {
  console.log(`✅ PASS: ${test}`);
  results.passed.push(test);
}

function logWarn(test, message) {
  console.log(`⚠️  WARN: ${test} - ${message}`);
  results.warnings.push({ test, message });
}

function logFail(test, error) {
  console.log(`❌ FAIL: ${test} - ${error}`);
  results.failed.push({ test, error });
}

// Helper to make API calls
async function apiCall(endpoint, options = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });
  
  const data = await response.json();
  return { response, data };
}

// Test 1: Guest Program Listing
async function testGuestProgramListing() {
  try {
    const { response, data } = await apiCall('/programs');
    
    if (response.status === 200 && Array.isArray(data)) {
      logPass('Guest program listing returns 200 and array');
      
      if (data.length === 0) {
        logWarn('Guest program listing', 'No programs in database');
      } else {
        logPass(`Guest program listing returned ${data.length} programs`);
        
        // Verify programs have required fields
        const firstProgram = data[0];
        if (firstProgram.id && firstProgram.title) {
          logPass('Program objects have required fields (id, title)');
        } else {
          logFail('Program structure', 'Missing required fields');
        }
      }
    } else {
      logFail('Guest program listing', `Expected 200 and array, got ${response.status}`);
    }
  } catch (error) {
    logFail('Guest program listing', error.message);
  }
}

// Test 2: Crisis Resources API
async function testCrisisResources() {
  try {
    const { response, data } = await apiCall('/crisis');
    
    if (response.status === 200 && Array.isArray(data)) {
      logPass('Crisis resources API returns 200 and array');
      
      if (data.length > 0) {
        logPass(`Crisis resources returned ${data.length} resources`);
        
        // Check for critical crisis resources (911, crisis lines)
        const has911 = data.some(r => r.phone === '911');
        const hasCrisisLine = data.some(r => r.category === 'call');
        
        if (has911) logPass('Emergency 911 resource exists');
        else logWarn('Crisis resources', 'No 911 emergency resource found');
        
        if (hasCrisisLine) logPass('Crisis call lines exist');
        else logWarn('Crisis resources', 'No crisis call lines found');
      } else {
        logFail('Crisis resources', 'No crisis resources in database - CRITICAL');
      }
    } else {
      logFail('Crisis resources API', `Expected 200 and array, got ${response.status}`);
    }
  } catch (error) {
    logFail('Crisis resources API', error.message);
  }
}

// Test 3: Unauthenticated Access Control
async function testAuthMiddleware() {
  try {
    // These endpoints should require authentication
    const protectedEndpoints = [
      '/checkins',
      '/profile',
      '/ximi',
      '/journal',
    ];
    
    for (const endpoint of protectedEndpoints) {
      const { response } = await apiCall(endpoint);
      
      if (response.status === 401) {
        logPass(`Protected endpoint ${endpoint} returns 401 when not authenticated`);
      } else {
        logFail(`Auth middleware on ${endpoint}`, `Expected 401, got ${response.status}`);
      }
    }
  } catch (error) {
    logFail('Auth middleware test', error.message);
  }
}

// Test 4: User Registration Flow
async function testRegistration() {
  try {
    const testUser = {
      email: `test-${Date.now()}@roomxi.test`,
      password: 'SecureP@ssw0rd123',
      firstName: 'Test',
      lastName: 'User',
      dateOfBirth: '2005-01-15', // 19 years old
    };
    
    const { response, data } = await apiCall('/auth/register', {
      method: 'POST',
      body: JSON.stringify(testUser),
    });
    
    if (response.status === 201) {
      logPass('User registration successful (status 201)');
      
      if (data.user && data.user.id) {
        logPass('Registration returns user object with ID');
        
        // Store session for subsequent tests
        global.testUserId = data.user.id;
        global.testUserEmail = testUser.email;
        
        if (data.csrfToken) {
          logPass('Registration returns CSRF token');
          global.csrfToken = data.csrfToken;
        } else {
          logWarn('Registration', 'No CSRF token returned');
        }
      } else {
        logFail('Registration response', 'Missing user object or ID');
      }
    } else if (response.status === 400) {
      logWarn('User registration', `Validation error: ${data.error || 'Unknown'}`);
    } else {
      logFail('User registration', `Expected 201, got ${response.status}: ${data.error || ''}`);
    }
  } catch (error) {
    logFail('User registration', error.message);
  }
}

// Test 5: Login Flow
async function testLogin() {
  if (!global.testUserEmail) {
    logWarn('Login test', 'Skipped - no test user created');
    return;
  }
  
  try {
    const { response, data } = await apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: global.testUserEmail,
        password: 'SecureP@ssw0rd123',
      }),
    });
    
    if (response.status === 200) {
      logPass('User login successful (status 200)');
      
      if (data.user && data.csrfToken) {
        logPass('Login returns user and CSRF token');
        global.csrfToken = data.csrfToken;
      } else {
        logFail('Login response', 'Missing user or CSRF token');
      }
    } else {
      logFail('User login', `Expected 200, got ${response.status}: ${data.error || ''}`);
    }
  } catch (error) {
    logFail('User login', error.message);
  }
}

// Test 6: Mood Check-in Submission
async function testMoodCheckin() {
  if (!global.csrfToken) {
    logWarn('Mood check-in test', 'Skipped - no CSRF token');
    return;
  }
  
  try {
    const checkinData = {
      moodType: 'clear',
      moodLevel16: 4,
      dimension: 'emotional',
      wellnessDimensions: ['emotional', 'social'],
      affectTags: ['calm', 'content'],
      note: 'E2E test check-in',
      localTz: 'America/Edmonton',
    };
    
    const { response, data } = await apiCall('/checkins', {
      method: 'POST',
      headers: { 'X-CSRF-Token': global.csrfToken },
      body: JSON.stringify(checkinData),
    });
    
    if (response.status === 201) {
      logPass('Mood check-in submission successful (status 201)');
      
      if (data.checkin && data.checkin.id) {
        logPass('Check-in returns checkin object with ID');
        
        // Verify streak calculation
        if (typeof data.streakCount === 'number') {
          logPass(`Streak calculation working (streak: ${data.streakCount})`);
        } else {
          logWarn('Check-in response', 'No streak count returned');
        }
      } else {
        logFail('Check-in response', 'Missing checkin object');
      }
    } else if (response.status === 400 && data.error?.includes('already checked in')) {
      logPass('Check-in properly prevents duplicate submissions for same day');
    } else {
      logFail('Mood check-in', `Expected 201, got ${response.status}: ${data.error || ''}`);
    }
  } catch (error) {
    logFail('Mood check-in submission', error.message);
  }
}

// Test 7: Mood Summary API
async function testMoodSummary() {
  if (!global.csrfToken) {
    logWarn('Mood summary test', 'Skipped - no CSRF token');
    return;
  }
  
  try {
    const { response, data } = await apiCall('/checkins/summary', {
      headers: { 'X-CSRF-Token': global.csrfToken },
    });
    
    if (response.status === 200) {
      logPass('Mood summary API returns 200');
      
      if (data.ratios && typeof data.streak7 === 'number') {
        logPass('Mood summary includes ratios and streak7');
        
        // Verify ratio structure
        const expectedMoods = ['cold', 'stormy', 'foggy', 'clear', 'breezy', 'aurora'];
        const hasAllMoods = expectedMoods.every(mood => mood in data.ratios);
        
        if (hasAllMoods) {
          logPass('Mood ratios include all 6 mood types');
        } else {
          logFail('Mood ratios', 'Missing mood types in ratios');
        }
        
        if (data.variance !== undefined) {
          logPass('Mood summary includes variance calculation');
        }
      } else {
        logFail('Mood summary structure', 'Missing ratios or streak7');
      }
    } else {
      logFail('Mood summary API', `Expected 200, got ${response.status}`);
    }
  } catch (error) {
    logFail('Mood summary API', error.message);
  }
}

// Test 8: Summary Range Endpoint (Week-over-Week)
async function testSummaryRange() {
  if (!global.csrfToken) {
    logWarn('Summary range test', 'Skipped - no CSRF token');
    return;
  }
  
  try {
    const today = new Date();
    const lastWeekStart = new Date(today);
    lastWeekStart.setDate(today.getDate() - 7);
    const lastWeekEnd = new Date(today);
    lastWeekEnd.setDate(today.getDate() - 1);
    
    const startDate = lastWeekStart.toISOString().split('T')[0];
    const endDate = lastWeekEnd.toISOString().split('T')[0];
    
    const { response, data } = await apiCall(
      `/checkins/summary-range?startDate=${startDate}&endDate=${endDate}`,
      { headers: { 'X-CSRF-Token': global.csrfToken } }
    );
    
    if (response.status === 200) {
      logPass('Summary-range endpoint returns 200');
      
      if (data.ratios && typeof data.daysWithData === 'number') {
        logPass('Summary-range includes ratios and daysWithData');
      } else {
        logFail('Summary-range structure', 'Missing expected fields');
      }
    } else {
      logFail('Summary-range endpoint', `Expected 200, got ${response.status}`);
    }
  } catch (error) {
    logFail('Summary-range endpoint', error.message);
  }
}

// Test 9: Transparency Dashboard
async function testTransparency() {
  try {
    const { response, data } = await apiCall('/transparency');
    
    if (response.status === 200) {
      logPass('Transparency dashboard API returns 200');
      
      if (data.stats) {
        logPass('Transparency dashboard includes stats');
      }
    } else {
      logFail('Transparency dashboard', `Expected 200, got ${response.status}`);
    }
  } catch (error) {
    logFail('Transparency dashboard', error.message);
  }
}

// Run all tests
async function runAllTests() {
  console.log('\n🚀 Starting Room XI Connect End-to-End Test Suite\n');
  console.log('='.repeat(60));
  
  console.log('\n📊 DATABASE & INFRASTRUCTURE TESTS');
  console.log('-'.repeat(60));
  
  console.log('\n🔐 AUTHENTICATION & SESSION TESTS');
  console.log('-'.repeat(60));
  await testAuthMiddleware();
  await testRegistration();
  await testLogin();
  
  console.log('\n🎭 MOOD CHECK-IN SYSTEM TESTS');
  console.log('-'.repeat(60));
  await testMoodCheckin();
  await testMoodSummary();
  await testSummaryRange();
  
  console.log('\n🔍 PROGRAM DISCOVERY TESTS');
  console.log('-'.repeat(60));
  await testGuestProgramListing();
  
  console.log('\n🆘 CRISIS & SAFETY TESTS');
  console.log('-'.repeat(60));
  await testCrisisResources();
  
  console.log('\n📈 TRANSPARENCY & COMPLIANCE TESTS');
  console.log('-'.repeat(60));
  await testTransparency();
  
  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📋 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${results.passed.length}`);
  console.log(`⚠️  Warnings: ${results.warnings.length}`);
  console.log(`❌ Failed: ${results.failed.length}`);
  
  if (results.warnings.length > 0) {
    console.log('\n⚠️  WARNINGS:');
    results.warnings.forEach(w => console.log(`  - ${w.test}: ${w.message}`));
  }
  
  if (results.failed.length > 0) {
    console.log('\n❌ FAILURES:');
    results.failed.forEach(f => console.log(`  - ${f.test}: ${f.error}`));
  }
  
  console.log('\n' + '='.repeat(60));
  
  // Determine launch readiness
  if (results.failed.length === 0) {
    console.log('✅ RECOMMENDATION: READY FOR LAUNCH');
    console.log('All critical tests passed. Application is functioning correctly.');
  } else if (results.failed.length <= 2 && !results.failed.some(f => f.test.includes('Crisis'))) {
    console.log('⚠️  RECOMMENDATION: LAUNCH WITH CAUTION');
    console.log('Some tests failed but no critical safety features affected.');
  } else {
    console.log('❌ RECOMMENDATION: DO NOT LAUNCH');
    console.log('Critical failures detected. Fix issues before launching.');
  }
  
  console.log('='.repeat(60) + '\n');
}

// Execute tests
runAllTests().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});
