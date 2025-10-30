import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, CheckCircle2, AlertCircle, Mail, MessageSquare } from 'lucide-react';
import { api } from '../../lib/api';

interface ConsentCardProps {
  title: string;
  summary: string;
  legalText: string;
  required: boolean;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function ConsentCard({ title, summary, legalText, required, checked, onChange }: ConsentCardProps) {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <div className={`border-2 rounded-lg p-4 ${checked ? 'border-green-500' : 'border-gray-300'}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-lg">{title}</h3>
          {required && <span className="text-xs text-red-600">Required</span>}
        </div>
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="w-5 h-5 mt-1"
        />
      </div>
      
      <p className="text-gray-700 mb-3">{summary}</p>
      
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-sm text-blue-600 flex items-center gap-1 hover:underline"
      >
        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        {expanded ? 'Hide' : 'Read More'}
      </button>
      
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-3 p-3 bg-gray-50 rounded text-sm text-gray-600 overflow-hidden"
          >
            {legalText}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ConsentOnboarding({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(1);
  const [consents, setConsents] = useState({
    terms_of_use: false,
    privacy_notice: false,
    data_collection: false,
  });
  
  const [age, setAge] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [needsGuardian, setNeedsGuardian] = useState(false);
  const [guardianContact, setGuardianContact] = useState({ type: 'email', value: '' });
  const [guardianSent, setGuardianSent] = useState(false);
  
  const handleConsentChange = (type: string, value: boolean) => {
    setConsents(prev => ({ ...prev, [type]: value }));
  };
  
  const checkAge = () => {
    if (!dateOfBirth) return;
    
    const dob = new Date(dateOfBirth);
    const today = new Date();
    let calculatedAge = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      calculatedAge--;
    }
    
    setAge(calculatedAge.toString());
    setNeedsGuardian(calculatedAge < 16);
    setStep(2);
  };
  
  const handleGuardianRequest = async () => {
    try {
      await api.consent.requestGuardianVerification(
        guardianContact.type,
        guardianContact.value
      );
      
      setGuardianSent(true);
    } catch (error) {
      console.error('Failed to send guardian verification:', error);
      alert('Failed to send guardian verification. Please try again.');
    }
  };
  
  const handleComplete = async () => {
    try {
      for (const [consentType, value] of Object.entries(consents)) {
        await api.consent.update(consentType, value);
      }
      
      onComplete();
    } catch (error) {
      console.error('Failed to save consents:', error);
      alert('Failed to save your consent choices. Please try again.');
    }
  };
  
  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to Room XI Connect</h1>
        <p className="text-gray-600">Your space. Your data. Your choice.</p>
      </div>
      
      <div className="mb-6">
        <div className="flex items-center justify-between">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step >= s ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'
              }`}>
                {step > s ? <CheckCircle2 size={20} /> : s}
              </div>
              {s < 3 && (
                <div className={`w-16 h-1 ${step > s ? 'bg-green-500' : 'bg-gray-300'}`} />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-600">
          <span>Privacy & Consent</span>
          <span>Age Check</span>
          <span>Finish</span>
        </div>
      </div>
      
      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
              <div className="flex items-start">
                <AlertCircle className="text-blue-500 mr-3 mt-0.5" size={20} />
                <div>
                  <p className="font-semibold text-blue-900">Privacy by Design</p>
                  <p className="text-sm text-blue-800">We don't store any data without your active consent. You can see what we collect and revoke consent anytime.</p>
                </div>
              </div>
            </div>
            
            <ConsentCard
              title="Terms of Use"
              summary="I understand how Room XI Connect works and agree to use it responsibly."
              legalText="By using Room XI Connect, you agree to use the platform in a respectful, safe, and legal manner. You will not share your account credentials, impersonate others, or use the platform to harm yourself or others. Room XI is a support platform, not a replacement for emergency services or professional care. Alberta PIPA and FOIP regulations apply."
              required={true}
              checked={consents.terms_of_use}
              onChange={(checked) => handleConsentChange('terms_of_use', checked)}
            />
            
            <ConsentCard
              title="Privacy Notice"
              summary="I understand what data Room XI collects and how it's used."
              legalText="Room XI Connect collects only the data you provide: your email, name, check-in data, and program attendance. All data is stored in Canada (Neon PostgreSQL, Canadian region) and encrypted at rest. We do not sell or share your personal information with third parties. You can export or delete your data at any time from the Privacy Dashboard in your profile."
              required={true}
              checked={consents.privacy_notice}
              onChange={(checked) => handleConsentChange('privacy_notice', checked)}
            />
            
            <ConsentCard
              title="Data Collection"
              summary="I agree to let Room XI save my mood check-ins and program attendance."
              legalText="Room XI Connect saves your mood check-ins, wellness dimension data, and program attendance records to help you track patterns and build healthy habits. This data is used only to personalize your experience (e.g., showing your streak, suggesting programs). You can view and delete this data anytime. Mood data older than 30 days is automatically deleted unless you opt in to keep it."
              required={true}
              checked={consents.data_collection}
              onChange={(checked) => handleConsentChange('data_collection', checked)}
            />
            
            <div className="flex justify-end mt-6">
              <button
                onClick={checkAge}
                disabled={!consents.terms_of_use || !consents.privacy_notice || !consents.data_collection}
                className={`px-6 py-2 rounded-lg font-semibold ${
                  consents.terms_of_use && consents.privacy_notice && consents.data_collection
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Continue
              </button>
            </div>
          </motion.div>
        )}
        
        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <h2 className="text-xl font-semibold mb-4">Age Verification</h2>
            
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
              <p className="text-sm text-blue-900">
                Room XI Connect serves youth aged 13-25. If you're under 16, we'll need a guardian to approve your account.
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Date of Birth</label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            
            {age && (
              <div className={`p-4 rounded-lg ${needsGuardian ? 'bg-yellow-50 border-yellow-500' : 'bg-green-50 border-green-500'} border-l-4`}>
                <p className="font-semibold">Age: {age} years old</p>
                {needsGuardian && (
                  <p className="text-sm mt-2">Since you're under 16, we'll need a guardian to approve your account.</p>
                )}
              </div>
            )}
            
            {needsGuardian && (
              <div className="space-y-4 mt-6">
                <h3 className="font-semibold">Guardian Verification</h3>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Contact Method</label>
                  <select
                    value={guardianContact.type}
                    onChange={(e) => setGuardianContact({ ...guardianContact, type: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="email">Email</option>
                    <option value="sms">SMS/Text</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Guardian {guardianContact.type === 'email' ? 'Email' : 'Phone Number'}
                  </label>
                  <input
                    type={guardianContact.type === 'email' ? 'email' : 'tel'}
                    value={guardianContact.value}
                    onChange={(e) => setGuardianContact({ ...guardianContact, value: e.target.value })}
                    placeholder={guardianContact.type === 'email' ? 'parent@example.com' : '(780) 555-1234'}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                
                {!guardianSent ? (
                  <button
                    onClick={handleGuardianRequest}
                    disabled={!guardianContact.value}
                    className="w-full bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 flex items-center justify-center gap-2"
                  >
                    {guardianContact.type === 'email' ? <Mail size={18} /> : <MessageSquare size={18} />}
                    Send Verification Link
                  </button>
                ) : (
                  <div className="bg-green-50 border-l-4 border-green-500 p-4">
                    <CheckCircle2 className="text-green-500 inline mr-2" size={20} />
                    <span className="text-green-900 font-semibold">Verification sent!</span>
                    <p className="text-sm text-green-800 mt-2">
                      We've sent a verification link to your guardian. They'll need to approve your account before you can continue.
                      Check back later or ask them to check their {guardianContact.type === 'email' ? 'email' : 'messages'}.
                    </p>
                  </div>
                )}
              </div>
            )}
            
            <div className="flex justify-between mt-6">
              <button
                onClick={() => setStep(1)}
                className="px-6 py-2 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50"
              >
                Back
              </button>
              
              {!needsGuardian && (
                <button
                  onClick={() => setStep(3)}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700"
                >
                  Continue
                </button>
              )}
            </div>
          </motion.div>
        )}
        
        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <div className="bg-green-50 border-l-4 border-green-500 p-6 mb-6">
              <CheckCircle2 className="text-green-500 inline mr-2" size={24} />
              <h2 className="text-xl font-semibold text-green-900 inline">All Set!</h2>
              <p className="text-green-800 mt-2">
                You're ready to start using Room XI Connect. Remember, you can always change your privacy settings from your profile.
              </p>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">What's Next?</h3>
              <ul className="space-y-2 text-sm">
                <li>✓ Complete your profile (optional)</li>
                <li>✓ Do your first mood check-in</li>
                <li>✓ Explore local programs</li>
                <li>✓ Chat with Ximi, your AI companion</li>
              </ul>
            </div>
            
            <div className="flex justify-end mt-6">
              <button
                onClick={handleComplete}
                className="px-8 py-3 bg-green-600 text-white rounded-lg font-semibold text-lg hover:bg-green-700"
              >
                Get Started
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
