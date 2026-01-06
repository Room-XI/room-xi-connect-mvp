import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../lib/api';
import { AlertCircle, Share2, Copy, Check, Mail, Clock } from 'lucide-react';
import { DemographicsForm } from '../../ui/demographics/DemographicsForm';

type SignupStep = 'name' | 'age' | 'location' | 'contact' | 'guardian' | 'guardian_success' | 'demographics';

export default function Signup() {
  const navigate = useNavigate();
  const [step, setStep] = useState<SignupStep>('name');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    preferredName: '',
    age: null as number | null,
    dateOfBirth: '',
    city: '',
    postalCode: '',
    email: '',
    password: '',
    guardianEmail: '',
    guardianPhone: '',
    guardianName: '',
    guardianContactType: 'email' as 'email' | 'phone',
  });

  const [consentLink, setConsentLink] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  // Convert age to date of birth (approximate)
  const calculateDateOfBirth = (age: number) => {
    const today = new Date();
    const birthYear = today.getFullYear() - age;
    const birthMonth = today.getMonth();
    const birthDay = today.getDate();
    return new Date(birthYear, birthMonth, birthDay).toISOString().split('T')[0];
  };

  const handleSignup = async () => {
    if (!formData.email || !formData.password) {
      setError('Please provide email and password');
      return;
    }

    if (!formData.age) {
      setError('Please select your age');
      return;
    }

    if (formData.age < 13) {
      setError('You must be at least 13 years old to use this platform');
      return;
    }

    if (formData.age > 25) {
      setError('This platform is designed for youth ages 13-25');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Convert age to date of birth for API
      const dateOfBirth = calculateDateOfBirth(formData.age);
      
      // Prepare registration data
      const registrationData: any = {
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        dateOfBirth,
      };

      // Add guardian info if under 16
      if (formData.age < 16) {
        const guardianContact = formData.guardianContactType === 'email' 
          ? formData.guardianEmail 
          : formData.guardianPhone;
        
        registrationData.guardianEmail = guardianContact;
        registrationData.guardianName = formData.guardianName || 'Guardian';
      }

      // Call the Express API register endpoint
      const { data: authData, error: authError } = await api.auth.register(
        registrationData.email,
        registrationData.password,
        {
          firstName: registrationData.firstName,
          lastName: registrationData.lastName,
          dateOfBirth: registrationData.dateOfBirth,
          guardianEmail: registrationData.guardianEmail,
          guardianName: registrationData.guardianName,
        }
      );

      if (authError) {
        throw new Error(authError);
      }

      if (!authData?.user) {
        throw new Error('Registration failed');
      }

      // Save profile data (city, postal code, preferred name)
      try {
        await api.profile.update({
          city: formData.city,
          postalCode: formData.postalCode,
          preferredName: formData.preferredName || formData.firstName,
        });
      } catch (profileError) {
        console.error('Profile update error:', profileError);
        // Don't fail the signup if profile update fails
      }

      // Record basic consent
      try {
        await api.consent.update('terms_of_use', true, 'self');
        await api.consent.update('privacy_notice', true, 'self');
        await api.consent.update('data_collection', true, 'self');
      } catch (consentError) {
        console.error('Consent recording error:', consentError);
        // Don't fail signup if consent recording fails
      }

      // For under-16 users, show guardian success screen with share link
      if (formData.age && formData.age < 16 && authData?.guardianVerification?.consentLink) {
        setConsentLink(authData.guardianVerification.consentLink);
        setStep('guardian_success');
      } else {
        // After successful account creation, show demographics step
        setStep('demographics');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during signup');
    } finally {
      setLoading(false);
    }
  };

  const handleDemographicsSubmit = async (demographicsData: any) => {
    setLoading(true);
    setError('');

    try {
      // Save demographics if provided
      if (Object.keys(demographicsData).length > 0) {
        const response = await fetch('/api/demographics/youth', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(demographicsData),
        });
        
        if (!response.ok) {
          throw new Error('Failed to save demographics');
        }
      }

      // Navigate to home page
      navigate('/home');
    } catch (err: any) {
      console.error('Demographics save error:', err);
      // Don't fail - demographics are optional
      navigate('/home');
    } finally {
      setLoading(false);
    }
  };

  const ageOptions = Array.from({ length: 13 }, (_, i) => i + 13);

  const renderStep = () => {
    switch (step) {
      case 'name':
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900">What's your name?</h2>
            <p className="text-gray-600">Tell us what you'd like to be called</p>

            <div className="space-y-3">
              <input
                type="text"
                placeholder="First name"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <input
                type="text"
                placeholder="Last name"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <input
                type="text"
                placeholder="Preferred name (optional)"
                value={formData.preferredName}
                onChange={(e) => setFormData({ ...formData, preferredName: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <button
              onClick={() => setStep('age')}
              disabled={!formData.firstName || !formData.lastName}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue
            </button>
          </div>
        );

      case 'age':
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900">How old are you?</h2>
            <p className="text-gray-600">Select your age to personalize your experience</p>

            <div className="grid grid-cols-4 gap-2">
              {ageOptions.map((age) => (
                <button
                  key={age}
                  onClick={() => setFormData({ ...formData, age })}
                  className={`py-3 rounded-lg border-2 font-medium transition ${
                    formData.age === age
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {age}
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep('name')}
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200 transition"
              >
                Back
              </button>
              <button
                onClick={() => setStep('location')}
                disabled={!formData.age}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </div>
          </div>
        );

      case 'location':
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900">Where are you located?</h2>
            <p className="text-gray-600">This helps us show you local programs near you</p>

            <div className="space-y-3">
              <input
                type="text"
                placeholder="City (e.g., Edmonton)"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <input
                type="text"
                placeholder="Postal code (optional)"
                value={formData.postalCode}
                onChange={(e) => setFormData({ ...formData, postalCode: e.target.value.toUpperCase() })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep('age')}
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200 transition"
              >
                Back
              </button>
              <button
                onClick={() => setStep('contact')}
                disabled={!formData.city}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </div>
          </div>
        );

      case 'contact':
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900">Create your account</h2>
            <p className="text-gray-600">Choose an email and password to sign in</p>

            <div className="space-y-3">
              <input
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <input
                type="password"
                placeholder="Password (min 12 characters)"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {formData.password && formData.password.length > 0 && formData.password.length < 12 && (
                <p className="text-xs text-amber-600">Password must be at least 12 characters</p>
              )}
              {formData.password && formData.password.length >= 12 && (
                <div className="text-xs space-y-1">
                  {!/[A-Z]/.test(formData.password) && <p className="text-amber-600">Include an uppercase letter</p>}
                  {!/[a-z]/.test(formData.password) && <p className="text-amber-600">Include a lowercase letter</p>}
                  {!/[0-9]/.test(formData.password) && <p className="text-amber-600">Include a number</p>}
                  {!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.password) && <p className="text-amber-600">Include a special character (!@#$%^&*...)</p>}
                </div>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
              <h3 className="font-semibold text-blue-900 mb-2">By continuing, you agree to:</h3>
              <ul className="space-y-1 text-blue-800">
                <li>• Room XI's Terms of Use</li>
                <li>• Privacy Notice and data collection practices</li>
                <li>• Non-identifying XID system for attendance</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep('location')}
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200 transition"
              >
                Back
              </button>
              <button
                onClick={() => {
                  if (formData.age && formData.age < 16) {
                    setStep('guardian');
                  } else {
                    handleSignup();
                  }
                }}
                disabled={!formData.email || !formData.password || formData.password.length < 12 || !/[A-Z]/.test(formData.password) || !/[a-z]/.test(formData.password) || !/[0-9]/.test(formData.password) || !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.password)}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {formData.age && formData.age < 16 ? 'Continue' : 'Create Account'}
              </button>
            </div>
          </div>
        );

      case 'guardian':
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900">Guardian verification required</h2>
            <p className="text-gray-600">
              Users under 16 require guardian verification for added trust and safety
            </p>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-900">
              <p className="font-medium mb-1">Required for users under 16</p>
              <p>
                Alberta law requires guardian consent for users under 16. Your guardian will receive an email
                to verify your account.
              </p>
            </div>

            <div className="space-y-3">
              <input
                type="text"
                placeholder="Guardian's name"
                value={formData.guardianName}
                onChange={(e) => setFormData({ ...formData, guardianName: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Contact type</span>
                <div className="flex gap-3 mt-2">
                  <button
                    onClick={() => setFormData({ ...formData, guardianContactType: 'email' })}
                    className={`flex-1 py-2 rounded-lg border-2 font-medium transition ${
                      formData.guardianContactType === 'email'
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    Email
                  </button>
                  <button
                    onClick={() => setFormData({ ...formData, guardianContactType: 'phone' })}
                    className={`flex-1 py-2 rounded-lg border-2 font-medium transition ${
                      formData.guardianContactType === 'phone'
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    Phone
                  </button>
                </div>
              </label>

              {formData.guardianContactType === 'email' ? (
                <input
                  type="email"
                  placeholder="Guardian's email"
                  value={formData.guardianEmail}
                  onChange={(e) => setFormData({ ...formData, guardianEmail: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              ) : (
                <input
                  type="tel"
                  placeholder="Guardian's phone number"
                  value={formData.guardianPhone}
                  onChange={(e) => setFormData({ ...formData, guardianPhone: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep('contact')}
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200 transition"
              >
                Back
              </button>
              <button
                onClick={handleSignup}
                disabled={loading || !formData.guardianName || 
                  (formData.guardianContactType === 'email' ? !formData.guardianEmail : !formData.guardianPhone)}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50"
              >
                {loading ? 'Creating account...' : 'Create Account'}
              </button>
            </div>
          </div>
        );

      case 'guardian_success':
        const handleShareWithParent = async () => {
          if (!consentLink) return;
          
          const shareData = {
            title: 'Room XI Connect - Guardian Consent Required',
            text: `Hi ${formData.guardianName || 'there'}! ${formData.firstName} has signed up for Room XI Connect and needs your consent. Please click this link to review and approve:`,
            url: consentLink,
          };

          if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
            try {
              await navigator.share(shareData);
            } catch (err) {
              if ((err as Error).name !== 'AbortError') {
                console.error('Share failed:', err);
              }
            }
          } else {
            handleCopyLink();
          }
        };

        const handleCopyLink = async () => {
          if (!consentLink) return;
          
          try {
            await navigator.clipboard.writeText(consentLink);
            setLinkCopied(true);
            setTimeout(() => setLinkCopied(false), 3000);
          } catch (err) {
            console.error('Copy failed:', err);
            const textArea = document.createElement('textarea');
            textArea.value = consentLink;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            setLinkCopied(true);
            setTimeout(() => setLinkCopied(false), 3000);
          }
        };

        return (
          <div className="space-y-6 text-center">
            <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
              <Mail className="w-8 h-8 text-green-600" />
            </div>
            
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Almost there!</h2>
              <p className="text-gray-600 mt-2">
                We've sent a consent request to <strong>{formData.guardianEmail || formData.guardianPhone}</strong>. 
                Your guardian needs to approve before you can fully access Room XI Connect.
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-left">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-900">
                  <p className="font-medium">Link expires in 24 hours</p>
                  <p className="mt-1">
                    If your parent hasn't received the email, you can share the link directly with them.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-700">Share the consent link with your parent:</p>
              
              <button
                onClick={handleShareWithParent}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition"
              >
                <Share2 className="w-5 h-5" />
                Share with Parent
              </button>
              
              <button
                onClick={handleCopyLink}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition ${
                  linkCopied 
                    ? 'bg-green-100 text-green-700 border border-green-300' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {linkCopied ? (
                  <>
                    <Check className="w-5 h-5" />
                    Link Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-5 h-5" />
                    Copy Link
                  </>
                )}
              </button>
            </div>

            {consentLink && (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 break-all">{consentLink}</p>
              </div>
            )}

            <div className="pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600 mb-3">
                Once your parent approves, you can continue setting up your profile.
              </p>
              <button
                onClick={() => setStep('demographics')}
                className="text-blue-600 hover:text-blue-700 font-medium text-sm"
              >
                Continue to profile setup →
              </button>
            </div>
          </div>
        );
      
      case 'demographics':
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900">Help us understand you better</h2>
            <p className="text-gray-600">This helps us create a more inclusive community</p>
            
            <DemographicsForm 
              onSubmit={handleDemographicsSubmit}
              isOptional={true}
            />
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-xl font-bold text-gray-900">Join Room XI</h1>
            <div className="text-sm text-gray-500">
              Step {step === 'name' ? 1 : step === 'age' ? 2 : step === 'location' ? 3 : step === 'contact' ? 4 : step === 'guardian' ? 5 : step === 'guardian_success' ? 6 : formData.age && formData.age < 16 ? 7 : 6}{' '}
              of {formData.age && formData.age < 16 ? 7 : 5}
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${
                  step === 'name' ? 14 : 
                  step === 'age' ? 28 : 
                  step === 'location' ? 42 : 
                  step === 'contact' ? 56 : 
                  step === 'guardian' ? 70 : 
                  step === 'guardian_success' ? 85 :
                  100
                }%`,
              }}
            />
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {renderStep()}

        <div className="mt-6 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link to="/auth/login" className="text-blue-600 hover:text-blue-700 font-medium">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}