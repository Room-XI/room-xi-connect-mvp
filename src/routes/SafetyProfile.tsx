import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
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
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (data) {
        setFormData({
          legalFirstName: data.legal_first_name || '',
          legalLastName: data.legal_last_name || '',
          emergencyContactName: data.emergency_contact_name || '',
          emergencyContactPhone: data.emergency_contact_phone || '',
          emergencyContactRelationship: data.emergency_contact_relationship || '',
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
          indigenousIdentity: (data.indigenous_identity as any) || '',
          indigenousCommunity: data.indigenous_community || '',
        });
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
      const ipAddress = await fetch('https://api.ipify.org?format=json')
        .then((res) => res.json())
        .then((data) => data.ip)
        .catch(() => 'unknown');

      const userAgent = navigator.userAgent;

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          legal_first_name: formData.legalFirstName,
          legal_last_name: formData.legalLastName,
          emergency_contact_name: formData.emergencyContactName,
          emergency_contact_phone: formData.emergencyContactPhone,
          emergency_contact_relationship: formData.emergencyContactRelationship,
          indigenous_identity: formData.indigenousIdentity || null,
          indigenous_community: formData.indigenousCommunity || null,
          safety_profile_complete: true,
        })
        .eq('user_id', user.id);

      if (profileError) throw profileError;

      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('xp_points')
        .eq('user_id', user.id)
        .single();

      const newXpPoints = (currentProfile?.xp_points || 0) + 30;

      const { error: xpError } = await supabase
        .from('profiles')
        .update({ xp_points: newXpPoints })
        .eq('user_id', user.id);

      if (xpError) throw xpError;

      const { data: existingHealth } = await supabase
        .from('health_profiles')
        .select('health_data_consent')
        .eq('user_id', user.id)
        .single();

      const previousHealthConsent = existingHealth?.health_data_consent || false;

      if (formData.healthDataConsent) {
        const { error: healthError } = await supabase.from('health_profiles').upsert({
          user_id: user.id,
          allergies: formData.allergies || null,
          medical_conditions: formData.medicalConditions || null,
          medications: formData.medications || null,
          accessibility_needs: formData.accessibilityNeeds || null,
          dietary_restrictions: formData.dietaryRestrictions || null,
          health_data_consent: true,
          health_consent_granted_at: new Date().toISOString(),
          health_consent_ip: ipAddress,
          health_consent_user_agent: userAgent,
          parq_status: 'not_completed',
        });

        if (healthError) throw healthError;

        await supabase.from('consent_events').insert({
          user_id: user.id,
          actor: 'youth',
          event_type: previousHealthConsent ? 'updated' : 'granted',
          consent_key: 'health_data_consent',
          old_value: previousHealthConsent,
          new_value: true,
          ip_address: ipAddress,
          user_agent: userAgent,
          notes: 'Health data consent granted via safety profile',
        });
      } else if (previousHealthConsent && !formData.healthDataConsent) {
        const { error: revokeError } = await supabase
          .from('health_profiles')
          .update({
            allergies: null,
            medical_conditions: null,
            medications: null,
            accessibility_needs: null,
            dietary_restrictions: null,
            health_data_consent: false,
            health_consent_granted_at: null,
            health_consent_ip: null,
            health_consent_user_agent: null,
          })
          .eq('user_id', user.id);

        if (revokeError) throw revokeError;

        await supabase.from('consent_events').insert({
          user_id: user.id,
          actor: 'youth',
          event_type: 'revoked',
          consent_key: 'health_data_consent',
          old_value: true,
          new_value: false,
          ip_address: ipAddress,
          user_agent: userAgent,
          notes: 'Health data consent revoked, data scrubbed',
        });
      }

      const photoConsents = [];
      if (formData.photoInternal !== undefined) {
        photoConsents.push({
          user_id: user.id,
          consent_type: 'photo_internal' as const,
          value: formData.photoInternal,
          ip_address: ipAddress,
          user_agent: userAgent,
          granted_by: 'self' as const,
          text_version: '1.0',
        });
      }
      if (formData.photoSocialMedia !== undefined) {
        photoConsents.push({
          user_id: user.id,
          consent_type: 'photo_social_media' as const,
          value: formData.photoSocialMedia,
          ip_address: ipAddress,
          user_agent: userAgent,
          granted_by: 'self' as const,
          text_version: '1.0',
        });
      }
      if (formData.photoWebsite !== undefined) {
        photoConsents.push({
          user_id: user.id,
          consent_type: 'photo_website' as const,
          value: formData.photoWebsite,
          ip_address: ipAddress,
          user_agent: userAgent,
          granted_by: 'self' as const,
          text_version: '1.0',
        });
      }
      if (formData.photoFundraising !== undefined) {
        photoConsents.push({
          user_id: user.id,
          consent_type: 'photo_fundraising' as const,
          value: formData.photoFundraising,
          ip_address: ipAddress,
          user_agent: userAgent,
          granted_by: 'self' as const,
          text_version: '1.0',
        });
      }
      if (formData.photoStory !== undefined) {
        photoConsents.push({
          user_id: user.id,
          consent_type: 'photo_story' as const,
          value: formData.photoStory,
          ip_address: ipAddress,
          user_agent: userAgent,
          granted_by: 'self' as const,
          text_version: '1.0',
        });
      }

      if (photoConsents.length > 0) {
        await supabase.from('consents').upsert(photoConsents);
      }

      photoConsents.forEach(async (consent) => {
        await supabase.from('consent_events').insert({
          user_id: user.id,
          actor: 'youth',
          event_type: 'granted',
          consent_key: consent.consent_type,
          new_value: consent.value,
          ip_address: ipAddress,
          user_agent: userAgent,
          notes: 'Safety profile completed',
        });
      });

      setStep('complete');
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving your profile');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'complete') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-teal-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 text-center space-y-6">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <Check className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Safety Profile Complete!</h2>
          <p className="text-gray-600">
            You've earned <span className="font-bold text-teal-600">+30 XP</span> for completing your safety profile.
            You can now attend in-person programs safely.
          </p>
          <button
            onClick={() => navigate('/home')}
            className="w-full bg-teal-600 text-white py-3 rounded-lg font-medium hover:bg-teal-700 transition"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-2xl mx-auto bg-white rounded-2xl shadow-xl p-8 space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Safety Profile</h1>
            <p className="text-sm text-gray-600">Required before attending in-person programs</p>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div className="space-y-6">
          {step === 'info' && (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
                <p className="font-medium mb-2">Why we need this information</p>
                <p>
                  To keep you safe at programs, we need to know your legal name (for emergencies), emergency contact,
                  and any allergies or medical needs. This information is stored securely and only accessible to
                  program staff in case of emergency.
                </p>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">Legal Name</h3>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Legal first name"
                    value={formData.legalFirstName}
                    onChange={(e) => setFormData({ ...formData, legalFirstName: e.target.value })}
                    className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <input
                    type="text"
                    placeholder="Legal last name"
                    value={formData.legalLastName}
                    onChange={(e) => setFormData({ ...formData, legalLastName: e.target.value })}
                    className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <h3 className="font-semibold text-gray-900 mt-6">Emergency Contact</h3>
                <input
                  type="text"
                  placeholder="Emergency contact name"
                  value={formData.emergencyContactName}
                  onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <input
                  type="tel"
                  placeholder="Emergency contact phone"
                  value={formData.emergencyContactPhone}
                  onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <input
                  type="text"
                  placeholder="Relationship (e.g., Parent, Guardian)"
                  value={formData.emergencyContactRelationship}
                  onChange={(e) => setFormData({ ...formData, emergencyContactRelationship: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <button
                onClick={() => setStep('health')}
                disabled={!formData.legalFirstName || !formData.legalLastName || !formData.emergencyContactName || !formData.emergencyContactPhone}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue to Health Information
              </button>
            </>
          )}

          {step === 'health' && (
            <>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-900">
                <p className="font-medium mb-2">Health Information Act (HIA) Notice</p>
                <p>
                  Health information (allergies, medical conditions, medications) is governed by Alberta's Health
                  Information Act. This data is stored separately with enhanced security and requires explicit consent.
                  You can skip this section if you don't have any health concerns to share.
                </p>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">Health & Accessibility (Optional)</h3>
                <textarea
                  placeholder="Allergies (if any)"
                  value={formData.allergies}
                  onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[80px]"
                />
                <textarea
                  placeholder="Medical conditions we should know about (if any)"
                  value={formData.medicalConditions}
                  onChange={(e) => setFormData({ ...formData, medicalConditions: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[80px]"
                />
                <textarea
                  placeholder="Current medications (if any)"
                  value={formData.medications}
                  onChange={(e) => setFormData({ ...formData, medications: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[80px]"
                />
                <textarea
                  placeholder="Accessibility needs (if any)"
                  value={formData.accessibilityNeeds}
                  onChange={(e) => setFormData({ ...formData, accessibilityNeeds: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[80px]"
                />
                <textarea
                  placeholder="Dietary restrictions (if any)"
                  value={formData.dietaryRestrictions}
                  onChange={(e) => setFormData({ ...formData, dietaryRestrictions: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[80px]"
                />

                {(formData.allergies || formData.medicalConditions || formData.medications || formData.accessibilityNeeds || formData.dietaryRestrictions) && (
                  <label className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.healthDataConsent}
                      onChange={(e) => setFormData({ ...formData, healthDataConsent: e.target.checked })}
                      className="mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">
                      <strong>I consent</strong> to the collection, storage, and use of my health information for
                      safety purposes at Room 11 programs, as governed by Alberta's Health Information Act. This
                      information will only be accessed by authorized program staff in case of emergency.
                    </span>
                  </label>
                )}
              </div>

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
                  Continue to Photo Consent
                </button>
              </div>
            </>
          )}

          {step === 'media' && (
            <>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-sm text-purple-900">
                <p className="font-medium mb-2">Photo & Media Consent</p>
                <p>
                  We sometimes take photos at programs. You have full control over how your image is used. Each option
                  can be changed anytime in your settings. All are optional.
                </p>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">Photo Permissions (All Optional)</h3>

                <label className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition">
                  <input
                    type="checkbox"
                    checked={formData.photoInternal}
                    onChange={(e) => setFormData({ ...formData, photoInternal: e.target.checked })}
                    className="mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <div>
                    <p className="font-medium text-gray-900">Internal program documentation</p>
                    <p className="text-sm text-gray-600">Photos for program records and improvement only (not shared publicly)</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition">
                  <input
                    type="checkbox"
                    checked={formData.photoSocialMedia}
                    onChange={(e) => setFormData({ ...formData, photoSocialMedia: e.target.checked })}
                    className="mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <div>
                    <p className="font-medium text-gray-900">Social media posts</p>
                    <p className="text-sm text-gray-600">Photos shared on Room 11's social media channels</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition">
                  <input
                    type="checkbox"
                    checked={formData.photoWebsite}
                    onChange={(e) => setFormData({ ...formData, photoWebsite: e.target.checked })}
                    className="mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <div>
                    <p className="font-medium text-gray-900">Website & marketing materials</p>
                    <p className="text-sm text-gray-600">Photos used on the Room 11 website and printed materials</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition">
                  <input
                    type="checkbox"
                    checked={formData.photoFundraising}
                    onChange={(e) => setFormData({ ...formData, photoFundraising: e.target.checked })}
                    className="mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <div>
                    <p className="font-medium text-gray-900">Fundraising materials</p>
                    <p className="text-sm text-gray-600">Photos used in grant applications and donor communications</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition">
                  <input
                    type="checkbox"
                    checked={formData.photoStory}
                    onChange={(e) => setFormData({ ...formData, photoStory: e.target.checked })}
                    className="mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <div>
                    <p className="font-medium text-gray-900">Story & testimonial use</p>
                    <p className="text-sm text-gray-600">Photos paired with your story or testimonial (separate written consent required)</p>
                  </div>
                </label>

                <h3 className="font-semibold text-gray-900 mt-6">Optional: Indigenous Identity (OCAP Principles)</h3>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-900 mb-4">
                  <p className="font-medium mb-1">OCAP® Principles Apply</p>
                  <p>
                    Indigenous data is governed by OCAP® (Ownership, Control, Access, Possession) principles. This
                    information helps us understand who we serve and report to funders. It's completely optional and
                    you control how it's used.
                  </p>
                </div>

                <select
                  value={formData.indigenousIdentity}
                  onChange={(e) => setFormData({ ...formData, indigenousIdentity: e.target.value as any })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Prefer not to answer</option>
                  <option value="first_nations">First Nations</option>
                  <option value="metis">Métis</option>
                  <option value="inuit">Inuit</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </select>

                {formData.indigenousIdentity && formData.indigenousIdentity !== 'prefer_not_to_say' && formData.indigenousIdentity !== '' && (
                  <input
                    type="text"
                    placeholder="Community or Nation (optional)"
                    value={formData.indigenousCommunity}
                    onChange={(e) => setFormData({ ...formData, indigenousCommunity: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                )}
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
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Complete Safety Profile'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
