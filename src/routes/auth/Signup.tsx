import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../lib/api';
import { AlertCircle } from 'lucide-react';
import { DemographicsForm } from '../../ui/demographics/DemographicsForm';

type SignupStep = 'name' | 'age' | 'location' | 'contact' | 'guardian' | 'demographics';

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

      // After successful account creation, show demographics step
      setStep('demographics');
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
                placeholder="Password (min 8 characters)"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
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
                disabled={!formData.email || !formData.password || formData.password.length < 8}
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
              Step {step === 'name' ? 1 : step === 'age' ? 2 : step === 'location' ? 3 : step === 'contact' ? 4 : step === 'guardian' ? 5 : 6}{' '}
              of {formData.age && formData.age < 16 ? 6 : 5}
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${
                  step === 'name' ? 17 : 
                  step === 'age' ? 34 : 
                  step === 'location' ? 51 : 
                  step === 'contact' ? 68 : 
                  step === 'guardian' ? 85 : 
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