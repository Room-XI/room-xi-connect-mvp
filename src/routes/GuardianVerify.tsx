import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, CheckCircle2, AlertCircle, Lock } from 'lucide-react';
import { api } from '../lib/api';
import { GuardianPerceptionForm } from '../ui/demographics/GuardianPerceptionForm';

export default function GuardianVerify() {
  const { token } = useParams();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [step, setStep] = useState<'verify' | 'demographics' | 'complete'>('verify');
  const [verificationId, setVerificationId] = useState<string | null>(null);
  
  const [guardianName, setGuardianName] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  
  const handleVerify = async () => {
    if (!guardianName || !pin) {
      setError('Please fill in all fields');
      return;
    }
    
    if (pin.length < 4) {
      setError('PIN must be at least 4 digits');
      return;
    }
    
    if (pin !== confirmPin) {
      setError('PINs do not match');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const response = await api.consent.verifyGuardian(token!, pin, guardianName);
      
      // Get the verification ID from response if available
      if (response?.data?.verificationId) {
        setVerificationId(response.data.verificationId);
      } else {
        // Try to extract from token (usually the verification ID)
        setVerificationId(token || null);
      }
      
      // Move to demographics step
      setStep('demographics');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Verification failed. Please check the link and try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleDemographicsSubmit = async (demographicsData: any) => {
    setLoading(true);
    setError('');
    
    try {
      // Save guardian perceptions if verification ID is available
      if (verificationId || token) {
        const verifyId = verificationId || token;
        const response = await fetch(`/api/demographics/guardian-perception/${verifyId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(demographicsData),
        });
        
        if (!response.ok) {
          throw new Error('Failed to save demographics');
        }
      }
      
      setStep('complete');
      setSuccess(true);
    } catch (err: any) {
      console.error('Demographics save error:', err);
      // Don't fail - demographics are optional, move to completion
      setStep('complete');
      setSuccess(true);
    } finally {
      setLoading(false);
    }
  };
  
  if (step === 'demographics') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl p-8 max-w-2xl w-full">
          <div className="mb-6 text-center">
            <Shield className="w-16 h-16 text-blue-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Almost Done!</h1>
            <p className="text-gray-600">Help us understand your family better</p>
          </div>
          
          <GuardianPerceptionForm 
            youthName="your youth"
            onSubmit={handleDemographicsSubmit}
          />
        </div>
      </div>
    );
  }
  
  if (step === 'complete' || success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full text-center"
        >
          <div className="mb-6">
            <CheckCircle2 className="w-20 h-20 text-green-500 mx-auto" />
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            Verification Complete!
          </h1>
          
          <p className="text-gray-600 mb-6">
            Thank you for approving your youth's Room XI Connect account. They can now access the platform and start their wellness journey.
          </p>
          
          <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-900">
            <p className="font-semibold mb-2">What Happens Next?</p>
            <ul className="text-left space-y-1">
              <li>• Your youth can now sign in and complete their profile</li>
              <li>• They'll have access to mood tracking and local programs</li>
              <li>• You can revoke consent at any time by contacting Room XI</li>
            </ul>
          </div>
          
          <button
            onClick={() => window.close()}
            className="mt-6 px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300"
          >
            Close Window
          </button>
        </motion.div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full">
        <div className="mb-6 text-center">
          <Shield className="w-16 h-16 text-blue-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Guardian Verification</h1>
          <p className="text-gray-600">Room XI Connect requires your approval</p>
        </div>
        
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
          <p className="text-sm text-blue-900">
            A youth has provided your contact information to create a Room XI Connect account. 
            As their guardian, we need your approval to ensure their safety and privacy.
          </p>
        </div>
        
        <div className="space-y-4 mb-6">
          <h2 className="font-semibold text-gray-900">What Room XI Collects:</h2>
          <ul className="text-sm text-gray-700 space-y-2">
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Basic profile info (name, age, city)</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Daily mood check-ins (voluntary)</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Program attendance at partner organizations</span>
            </li>
          </ul>
          
          <h2 className="font-semibold text-gray-900 mt-4">Privacy Protections:</h2>
          <ul className="text-sm text-gray-700 space-y-2">
            <li className="flex items-start">
              <span className="mr-2">✓</span>
              <span>All data stored in Canada (Alberta PIPA compliant)</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">✓</span>
              <span>No data sold or shared with third parties</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">✓</span>
              <span>Youth can export or delete data anytime</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">✓</span>
              <span>You can revoke consent at any time</span>
            </li>
          </ul>
        </div>
        
        <div className="border-t pt-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Approve This Account</h2>
          
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 flex items-start">
              <AlertCircle className="text-red-500 mr-3 mt-0.5" size={20} />
              <p className="text-sm text-red-900">{error}</p>
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Full Name
            </label>
            <input
              type="text"
              value={guardianName}
              onChange={(e) => setGuardianName(e.target.value)}
              placeholder="Jane Smith"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Lock size={16} />
              Create a Verification PIN
            </label>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="4-digit PIN"
              maxLength={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              This PIN protects the verification record
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirm PIN
            </label>
            <input
              type="password"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value)}
              placeholder="Re-enter PIN"
              maxLength={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <button
            onClick={handleVerify}
            disabled={loading || !guardianName || !pin || !confirmPin}
            className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold text-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {loading ? 'Verifying...' : 'Approve Account'}
          </button>
          
          <p className="text-xs text-gray-500 text-center">
            By approving, you acknowledge that Room XI Connect collects and stores the data listed above 
            in accordance with Alberta PIPA and FOIP regulations.
          </p>
        </div>
      </div>
    </div>
  );
}
