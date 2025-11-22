import { useState } from 'react';
import { CheckCircle, XCircle, Loader2, User, Mail, Shield, QrCode, ClipboardCheck } from 'lucide-react';
import api from '../lib/api';

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  message?: string;
  details?: any;
}

export function TestParentConsent() {
  const [tests, setTests] = useState<TestResult[]>([
    { name: 'Youth Registration', status: 'pending' },
    { name: 'Send Parent Invitation', status: 'pending' },
    { name: 'Accept Parent Invitation', status: 'pending' },
    { name: 'Check Parent Status', status: 'pending' },
    { name: 'Request Platform Consent', status: 'pending' },
    { name: 'Approve Consent', status: 'pending' },
    { name: 'Generate QR Code', status: 'pending' },
    { name: 'Validate QR Code', status: 'pending' },
    { name: 'Submit Demographics', status: 'pending' },
    { name: 'Check Mood Tasks', status: 'pending' },
  ]);
  
  const [isRunning, setIsRunning] = useState(false);
  const [testData, setTestData] = useState<any>({});

  const updateTest = (name: string, status: TestResult['status'], message?: string, details?: any) => {
    setTests(prev => prev.map(test => 
      test.name === name ? { ...test, status, message, details } : test
    ));
  };

  const runTests = async () => {
    setIsRunning(true);
    const timestamp = Date.now();
    const youthEmail = `youth_test_${timestamp}@test.com`;
    const parentEmail = `parent_test_${timestamp}@test.com`;
    const password = 'TestPass123!';
    let data: any = {};

    try {
      // Test 1: Youth Registration
      updateTest('Youth Registration', 'running');
      try {
        const signupRes = await api.auth.register(youthEmail, password, {
          name: 'Test Youth',
          age: 16
        });
        data.userId = signupRes.data?.user?.id;
        updateTest('Youth Registration', 'success', `Created ${youthEmail}`, signupRes);
      } catch (err: any) {
        updateTest('Youth Registration', 'failed', err.message);
      }

      // Test 2: Send Parent Invitation
      updateTest('Send Parent Invitation', 'running');
      try {
        const inviteRes = await api.parentAuth.sendInvite(parentEmail);
        data.parentToken = inviteRes.data?.token;
        updateTest('Send Parent Invitation', 'success', `Sent to ${parentEmail}`, inviteRes);
      } catch (err: any) {
        updateTest('Send Parent Invitation', 'failed', err.message);
      }

      // Test 3: Accept Parent Invitation (simulate)
      updateTest('Accept Parent Invitation', 'running');
      try {
        if (data.parentToken) {
          // Directly call the accept endpoint
          const response = await fetch(`/api/parent-auth/accept/${data.parentToken}`);
          const acceptData = await response.text();
          if (response.ok) {
            updateTest('Accept Parent Invitation', 'success', 'Parent linked successfully', acceptData);
          } else {
            throw new Error(`Accept failed: ${response.status}`);
          }
        } else {
          throw new Error('No parent token available');
        }
      } catch (err: any) {
        updateTest('Accept Parent Invitation', 'failed', err.message);
      }

      // Test 4: Check Parent Status
      updateTest('Check Parent Status', 'running');
      try {
        const statusRes = await api.parentAuth.getStatus();
        updateTest('Check Parent Status', 'success', 'Parent authenticated', statusRes);
      } catch (err: any) {
        updateTest('Check Parent Status', 'failed', err.message);
      }

      // Test 5: Request Platform Consent
      updateTest('Request Platform Consent', 'running');
      try {
        const consentRes = await api.consentAuto.bootstrapPlatform();
        updateTest('Request Platform Consent', 'success', 'Platform consent requested', consentRes);
      } catch (err: any) {
        updateTest('Request Platform Consent', 'failed', err.message);
      }

      // Test 6: Approve Consent
      updateTest('Approve Consent', 'running');
      try {
        const approveRes = await api.consentAuto.approve(data.userId, 'platform_terms', true);
        updateTest('Approve Consent', 'success', 'Consent approved', approveRes);
      } catch (err: any) {
        updateTest('Approve Consent', 'failed', err.message);
      }

      // Test 7: Generate QR Code
      updateTest('Generate QR Code', 'running');
      try {
        const qrRes = await api.qr.rotateToken();
        data.qrToken = qrRes.data?.token;
        updateTest('Generate QR Code', 'success', `Token expires in ${qrRes.data?.expiresIn}ms`, qrRes);
      } catch (err: any) {
        updateTest('Generate QR Code', 'failed', err.message);
      }

      // Test 8: Validate QR Code
      updateTest('Validate QR Code', 'running');
      try {
        if (data.qrToken) {
          const validateRes = await api.qr.validate(data.qrToken);
          updateTest('Validate QR Code', 'success', 'QR is valid', validateRes);
        } else {
          throw new Error('No QR token available');
        }
      } catch (err: any) {
        updateTest('Validate QR Code', 'failed', err.message);
      }

      // Test 9: Submit Demographics
      updateTest('Submit Demographics', 'running');
      try {
        const demoRes = await api.demographics.saveYouth({
          gender: 'non-binary',
          pronouns: 'they/them',
          ethnicity: ['indigenous'],
          schoolGrade: '10',
          livingArrangement: 'both_parents',
          challenges: ['anxiety']
        });
        updateTest('Submit Demographics', 'success', 'Demographics saved', demoRes);
      } catch (err: any) {
        updateTest('Submit Demographics', 'failed', err.message);
      }

      // Test 10: Check Mood Tasks
      updateTest('Check Mood Tasks', 'running');
      try {
        const tasksRes = await api.moodTasks.getDue();
        updateTest('Check Mood Tasks', 'success', `${tasksRes.data?.tasks?.length || 0} tasks found`, tasksRes);
      } catch (err: any) {
        updateTest('Check Mood Tasks', 'failed', err.message);
      }

      setTestData(data);
    } catch (error) {
      console.error('Test suite error:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'pending': return <div className="w-5 h-5 rounded-full border-2 border-gray-300" />;
      case 'running': return <Loader2 className="w-5 h-5 animate-spin text-blue-500" />;
      case 'success': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed': return <XCircle className="w-5 h-5 text-red-500" />;
    }
  };

  const getTestIcon = (name: string) => {
    if (name.includes('Youth')) return <User className="w-4 h-4" />;
    if (name.includes('Parent')) return <Mail className="w-4 h-4" />;
    if (name.includes('Consent')) return <Shield className="w-4 h-4" />;
    if (name.includes('QR')) return <QrCode className="w-4 h-4" />;
    return <ClipboardCheck className="w-4 h-4" />;
  };

  const successCount = tests.filter(t => t.status === 'success').length;
  const failCount = tests.filter(t => t.status === 'failed').length;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6" />
            Parent Consent System Test Suite
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Comprehensive testing of all parent consent features
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <button
              onClick={runTests}
              disabled={isRunning}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isRunning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Running Tests...
                </>
              ) : (
                'Run All Tests'
              )}
            </button>
            
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-1">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>{successCount} passed</span>
              </div>
              <div className="flex items-center gap-1">
                <XCircle className="w-4 h-4 text-red-500" />
                <span>{failCount} failed</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {tests.map((test) => (
              <div
                key={test.name}
                className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800"
              >
                <div className="flex items-center gap-3">
                  {getStatusIcon(test.status)}
                  <div className="flex items-center gap-2">
                    {getTestIcon(test.name)}
                    <span className="font-medium">{test.name}</span>
                  </div>
                </div>
                {test.message && (
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {test.message}
                  </span>
                )}
              </div>
            ))}
          </div>

          {Object.keys(testData).length > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 rounded-lg">
              <strong>Test Data:</strong>
              <pre className="mt-2 text-xs overflow-auto">
                {JSON.stringify(testData, null, 2)}
              </pre>
            </div>
          )}

          {tests.every(t => t.status === 'success') && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 rounded-lg flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-green-800 dark:text-green-200">
                All tests passed! The parent consent system is working correctly.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}