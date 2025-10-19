import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Shield, Check, X, AlertCircle } from 'lucide-react';

export default function VerifyConsent() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [consentDetails, setConsentDetails] = useState<any>(null);
  const [guardianDob, setGuardianDob] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadConsentDetails();
  }, [token]);

  async function loadConsentDetails() {
    try {
      // In production, this would call an Edge Function to get consent details
      // For now, we'll simulate the response
      setConsentDetails({
        youthName: 'Youth',
        orgName: 'Partner Organization',
        scope: 'referral',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });
    } catch (err) {
      setError('Invalid or expired consent request');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(action: 'grant' | 'deny') {
    if (!guardianDob) {
      setError('Please enter your date of birth');
      return;
    }

    // Verify guardian is 18+
    const age = Math.floor(
      (new Date().getTime() - new Date(guardianDob).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
    );

    if (age < 18) {
      setError('You must be 18 or older to provide consent');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const response = await fetch('/functions/v1/verify-consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          action,
          guardian_dob: guardianDob
        })
      });

      const data = await response.json();

      if (!data.ok) {
        throw new Error(data.error || 'Failed to process consent');
      }

      setSuccess(true);
      setTimeout(() => {
        navigate('/');
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cosmic-teal"></div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h1>
          <p className="text-gray-600">Your response has been recorded.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cosmic-teal/10 to-cosmic-purple/10 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-cosmic-teal/10 rounded-full flex items-center justify-center">
              <Shield className="w-6 h-6 text-cosmic-teal" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Guardian Consent Request</h1>
              <p className="text-sm text-gray-500">Room XI Connect</p>
            </div>
          </div>

          {/* Consent Details */}
          {consentDetails && (
            <div className="mb-8 p-6 bg-gray-50 rounded-xl">
              <h2 className="font-semibold text-gray-900 mb-4">Consent Details</h2>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-gray-600">Youth:</span>
                  <span className="ml-2 font-medium text-gray-900">{consentDetails.youthName}</span>
                </div>
                <div>
                  <span className="text-gray-600">Organization:</span>
                  <span className="ml-2 font-medium text-gray-900">{consentDetails.orgName}</span>
                </div>
                <div>
                  <span className="text-gray-600">Purpose:</span>
                  <span className="ml-2 font-medium text-gray-900">
                    Share intake information for better support
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Expires:</span>
                  <span className="ml-2 font-medium text-gray-900">
                    {new Date(consentDetails.expiresAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* What This Means */}
          <div className="mb-8 p-6 bg-blue-50 rounded-xl border border-blue-100">
            <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              What This Means
            </h3>
            <ul className="space-y-2 text-sm text-blue-800">
              <li>• The youth's intake information will be shared with the receiving organization</li>
              <li>• This allows them to provide support without the youth repeating their story</li>
              <li>• You can revoke this consent at any time</li>
              <li>• No information will be shared without your approval</li>
            </ul>
          </div>

          {/* Age Verification */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Date of Birth (Age Verification)
            </label>
            <input
              type="date"
              value={guardianDob}
              onChange={(e) => setGuardianDob(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-cosmic-teal"
              required
            />
            <p className="mt-2 text-xs text-gray-500">
              You must be 18 or older to provide consent
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={() => handleSubmit('grant')}
              disabled={submitting || !guardianDob}
              className="flex-1 px-6 py-4 bg-cosmic-teal text-white rounded-xl hover:bg-cosmic-teal/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
            >
              <Check className="w-5 h-5" />
              {submitting ? 'Processing...' : 'Grant Consent'}
            </button>
            <button
              onClick={() => handleSubmit('deny')}
              disabled={submitting || !guardianDob}
              className="flex-1 px-6 py-4 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
            >
              <X className="w-5 h-5" />
              {submitting ? 'Processing...' : 'Deny Consent'}
            </button>
          </div>

          {/* Privacy Notice */}
          <div className="mt-6 p-4 bg-gray-50 rounded-xl">
            <p className="text-xs text-gray-600">
              <strong>Privacy Notice:</strong> Your response will be recorded along with your IP address
              and timestamp for security and compliance purposes. Your date of birth is used only for
              age verification and is not stored.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

