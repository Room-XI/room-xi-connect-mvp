import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useSession } from '../lib/session';
import { AlertCircle, Shield, Check } from 'lucide-react';

export default function SafetyProfile() {
  const navigate = useNavigate();
  const { user } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'info' | 'health' | 'media' | 'complete'>('info');

  const [formData, setFormData] = useState({
    legalFirstName: '',
    legalLastName: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelationship: '',
    
    allergies: '',
    medicalConditions: '',
    medications: '',
    accessibilityNeeds: '',
    dietaryRestrictions: '',
    healthDataConsent: false,
    
    photoInternal: false,
    photoSocialMedia: false,
    photoWebsite: false,
    photoFundraising: false,
    photoStory: false,
    
    indigenousIdentity: '' as '' | 'first_nations' | 'metis' | 'inuit' | 'prefer_not_to_say',
    indigenousCommunity: '',
  });

  useEffect(() => {
    if (!user) {
      navigate('/auth/login');
      return;
    }

    const loadProfile = async () => {
      try {
        const { data, error } = await api.profile.get();
        
        if (!error && data) {
          setFormData({
            legalFirstName: data.legalFirstName || '',
            legalLastName: data.legalLastName || '',
            emergencyContactName: data.emergencyContactName || '',
            emergencyContactPhone: data.emergencyContactPhone || '',
            emergencyContactRelationship: data.emergencyContactRelationship || '',
            allergies: data.allergies || '',
            medicalConditions: data.medicalConditions || '',
            medications: data.medications || '',
            accessibilityNeeds: data.accessibilityNeeds || '',
            dietaryRestrictions: data.dietaryRestrictions || '',
            healthDataConsent: data.healthDataConsent || false,
            photoInternal: data.photoInternal || false,
            photoSocialMedia: data.photoSocialMedia || false,
            photoWebsite: data.photoWebsite || false,
            photoFundraising: data.photoFundraising || false,
            photoStory: data.photoStory || false,
            indigenousIdentity: data.indigenousIdentity || '',
            indigenousCommunity: data.indigenousCommunity || '',
          });
        }
      } catch (err) {
        console.error('Error loading profile:', err);
      }
    };

    loadProfile();
  }, [user, navigate]);

  const handleSave = async () => {
    if (!user) return;

    if (!formData.legalFirstName || !formData.legalLastName) {
      setError('Legal name is required');
      return;
    }

    if (!formData.emergencyContactName || !formData.emergencyContactPhone) {
      setError('Emergency contact information is required');
      return;
    }

    if ((formData.allergies || formData.medicalConditions || formData.medications || formData.accessibilityNeeds || formData.dietaryRestrictions) && !formData.healthDataConsent) {
      setError('You must consent to health data collection to provide medical information');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Update profile with safety information
      const profileUpdate = {
        legalFirstName: formData.legalFirstName,
        legalLastName: formData.legalLastName,
        emergencyContactName: formData.emergencyContactName,
        emergencyContactPhone: formData.emergencyContactPhone,
        emergencyContactRelationship: formData.emergencyContactRelationship,
        indigenousIdentity: formData.indigenousIdentity || null,
        indigenousCommunity: formData.indigenousCommunity || null,
        safetyProfileComplete: true,
      };

      const { error: profileError } = await api.profile.update(profileUpdate);
      
      if (profileError) {
        throw new Error(profileError);
      }

      // Update health information if consent is given
      if (formData.healthDataConsent) {
        const healthUpdate = {
          allergies: formData.allergies || null,
          medicalConditions: formData.medicalConditions || null,
          medications: formData.medications || null,
          accessibilityNeeds: formData.accessibilityNeeds || null,
          dietaryRestrictions: formData.dietaryRestrictions || null,
          healthDataConsent: true,
        };

        const { error: healthError } = await api.profile.update(healthUpdate);
        
        if (healthError) {
          console.error('Health update error:', healthError);
        }

        // Record health consent
        await api.consent.update('health_data_consent', true, 'self');
      }

      // Update media consent
      const mediaConsentTypes = [
        { key: 'media_internal', value: formData.photoInternal },
        { key: 'media_social', value: formData.photoSocialMedia },
        { key: 'media_website', value: formData.photoWebsite },
        { key: 'media_fundraising', value: formData.photoFundraising },
        { key: 'media_story', value: formData.photoStory },
      ];

      for (const consent of mediaConsentTypes) {
        if (consent.value) {
          try {
            await api.consent.update(consent.key, consent.value, 'self');
          } catch (err) {
            console.error(`Error updating ${consent.key}:`, err);
          }
        }
      }

      // Navigate to completion
      setStep('complete');
      
      // Redirect to home after 3 seconds
      setTimeout(() => {
        navigate('/home');
      }, 3000);

    } catch (err: any) {
      setError(err.message || 'An error occurred while saving your profile');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'complete') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Safety Profile Complete!</h2>
          <p className="text-gray-600 mb-4">
            Your safety information has been saved. You've earned 30 XP points for completing your profile!
          </p>
          <p className="text-sm text-gray-500">Redirecting to home...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Safety Profile</h1>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="mb-8">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setStep('info')}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  step === 'info' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'
                }`}
              >
                Basic Info
              </button>
              <button
                onClick={() => setStep('health')}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  step === 'health' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'
                }`}
              >
                Health & Safety
              </button>
              <button
                onClick={() => setStep('media')}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  step === 'media' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'
                }`}
              >
                Media Consent
              </button>
            </div>
          </div>

          {step === 'info' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Legal Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Legal First Name *
                    </label>
                    <input
                      type="text"
                      value={formData.legalFirstName}
                      onChange={(e) => setFormData({ ...formData, legalFirstName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Legal Last Name *
                    </label>
                    <input
                      type="text"
                      value={formData.legalLastName}
                      onChange={(e) => setFormData({ ...formData, legalLastName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Emergency Contact</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contact Name *
                    </label>
                    <input
                      type="text"
                      value={formData.emergencyContactName}
                      onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        value={formData.emergencyContactPhone}
                        onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Relationship
                      </label>
                      <input
                        type="text"
                        value={formData.emergencyContactRelationship}
                        onChange={(e) => setFormData({ ...formData, emergencyContactRelationship: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="e.g., Parent, Guardian"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Indigenous Identity (Optional)</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Do you identify as Indigenous?
                    </label>
                    <select
                      value={formData.indigenousIdentity}
                      onChange={(e) => setFormData({ ...formData, indigenousIdentity: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select an option</option>
                      <option value="first_nations">First Nations</option>
                      <option value="metis">Métis</option>
                      <option value="inuit">Inuit</option>
                      <option value="prefer_not_to_say">Prefer not to say</option>
                    </select>
                  </div>
                  {formData.indigenousIdentity && formData.indigenousIdentity !== 'prefer_not_to_say' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Community/Nation (Optional)
                      </label>
                      <input
                        type="text"
                        value={formData.indigenousCommunity}
                        onChange={(e) => setFormData({ ...formData, indigenousCommunity: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="e.g., Cree Nation"
                      />
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={() => setStep('health')}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition"
              >
                Continue to Health & Safety
              </button>
            </div>
          )}

          {step === 'health' && (
            <div className="space-y-6">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h4 className="font-semibold text-amber-900 mb-2">Health Information Consent</h4>
                <p className="text-sm text-amber-800 mb-3">
                  Providing health information is optional but helps us better support you during programs.
                  This information is kept confidential and only shared with program facilitators when necessary.
                </p>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={formData.healthDataConsent}
                    onChange={(e) => setFormData({ ...formData, healthDataConsent: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">
                    I consent to providing health information
                  </span>
                </label>
              </div>

              {formData.healthDataConsent && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Allergies
                    </label>
                    <textarea
                      value={formData.allergies}
                      onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={2}
                      placeholder="List any allergies (food, environmental, medication)"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Medical Conditions
                    </label>
                    <textarea
                      value={formData.medicalConditions}
                      onChange={(e) => setFormData({ ...formData, medicalConditions: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={2}
                      placeholder="List any medical conditions we should be aware of"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Medications
                    </label>
                    <textarea
                      value={formData.medications}
                      onChange={(e) => setFormData({ ...formData, medications: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={2}
                      placeholder="List any medications you take regularly"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Accessibility Needs
                    </label>
                    <textarea
                      value={formData.accessibilityNeeds}
                      onChange={(e) => setFormData({ ...formData, accessibilityNeeds: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={2}
                      placeholder="Describe any accessibility accommodations needed"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Dietary Restrictions
                    </label>
                    <textarea
                      value={formData.dietaryRestrictions}
                      onChange={(e) => setFormData({ ...formData, dietaryRestrictions: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={2}
                      placeholder="List any dietary restrictions or preferences"
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('info')}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200 transition"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep('media')}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition"
                >
                  Continue to Media Consent
                </button>
              </div>
            </div>
          )}

          {step === 'media' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">Photo & Media Consent</h4>
                <p className="text-sm text-blue-800">
                  We may take photos during programs. Please indicate how you're comfortable with us using your image.
                </p>
              </div>

              <div className="space-y-3">
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={formData.photoInternal}
                    onChange={(e) => setFormData({ ...formData, photoInternal: e.target.checked })}
                    className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <div>
                    <span className="font-medium text-gray-700">Internal Use</span>
                    <p className="text-sm text-gray-500">Photos for internal documentation and records</p>
                  </div>
                </label>

                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={formData.photoSocialMedia}
                    onChange={(e) => setFormData({ ...formData, photoSocialMedia: e.target.checked })}
                    className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <div>
                    <span className="font-medium text-gray-700">Social Media</span>
                    <p className="text-sm text-gray-500">Photos on our social media channels</p>
                  </div>
                </label>

                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={formData.photoWebsite}
                    onChange={(e) => setFormData({ ...formData, photoWebsite: e.target.checked })}
                    className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <div>
                    <span className="font-medium text-gray-700">Website</span>
                    <p className="text-sm text-gray-500">Photos on our website and online materials</p>
                  </div>
                </label>

                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={formData.photoFundraising}
                    onChange={(e) => setFormData({ ...formData, photoFundraising: e.target.checked })}
                    className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <div>
                    <span className="font-medium text-gray-700">Fundraising</span>
                    <p className="text-sm text-gray-500">Photos in fundraising materials and grant applications</p>
                  </div>
                </label>

                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={formData.photoStory}
                    onChange={(e) => setFormData({ ...formData, photoStory: e.target.checked })}
                    className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <div>
                    <span className="font-medium text-gray-700">Story Sharing</span>
                    <p className="text-sm text-gray-500">Share your story and experiences (with your approval)</p>
                  </div>
                </label>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('health')}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200 transition"
                >
                  Back
                </button>
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="flex-1 bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 transition disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Complete Safety Profile'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}