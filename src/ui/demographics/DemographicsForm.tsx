import { useState } from 'react';
import {
  SEXUAL_ORIENTATION_OPTIONS,
  GENDER_IDENTITY_OPTIONS,
  PRONOUNS_OPTIONS,
  RACIAL_IDENTITY_OPTIONS,
  DISABILITY_OPTIONS
} from '../../constants/demographics';

interface DemographicsFormProps {
  onSubmit: (data: any) => void;
  isOptional?: boolean;
}

export function DemographicsForm({ onSubmit, isOptional = true }: DemographicsFormProps) {
  const [formData, setFormData] = useState({
    sexualOrientation: '',
    sexualOrientationOther: '',
    genderIdentity: '',
    genderIdentityOther: '',
    pronouns: '',
    pronounsOther: '',
    racialIdentity: [] as string[],
    racialIdentityOther: '',
    disability: '',
    disabilityDetails: ''
  });

  const [showOtherFields, setShowOtherFields] = useState({
    sexualOrientation: false,
    genderIdentity: false,
    pronouns: false,
    racialIdentity: false
  });

  const handleSelectChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Show "other" text field if "other" option is selected
    if (field in showOtherFields) {
      setShowOtherFields(prev => ({
        ...prev,
        [field]: value === 'other'
      }));
    }
  };

  const handleRacialIdentityChange = (value: string) => {
    setFormData(prev => {
      const current = prev.racialIdentity;
      if (current.includes(value)) {
        return { ...prev, racialIdentity: current.filter(v => v !== value) };
      } else {
        return { ...prev, racialIdentity: [...current, value] };
      }
    });
    
    // Show other field if "other" is selected
    if (value === 'other') {
      setShowOtherFields(prev => ({
        ...prev,
        racialIdentity: !prev.racialIdentity
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-teal-50 p-4 rounded-lg">
        <p className="text-sm text-teal-800">
          <strong>Privacy Note:</strong> This information helps us better understand and serve our community. 
          All demographic data is optional and kept strictly confidential. Your parents/guardians will NOT see these responses.
        </p>
      </div>

      {/* Sexual Orientation */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          How do you describe your sexual orientation? {isOptional && <span className="text-gray-400">(Optional)</span>}
        </label>
        <select
          value={formData.sexualOrientation}
          onChange={(e) => handleSelectChange('sexualOrientation', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          <option value="">Select an option</option>
          {SEXUAL_ORIENTATION_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        {showOtherFields.sexualOrientation && (
          <input
            type="text"
            placeholder="Please specify"
            value={formData.sexualOrientationOther}
            onChange={(e) => setFormData(prev => ({ ...prev, sexualOrientationOther: e.target.value }))}
            className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        )}
      </div>

      {/* Gender Identity */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          What is your gender identity? {isOptional && <span className="text-gray-400">(Optional)</span>}
        </label>
        <select
          value={formData.genderIdentity}
          onChange={(e) => handleSelectChange('genderIdentity', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          <option value="">Select an option</option>
          {GENDER_IDENTITY_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        {showOtherFields.genderIdentity && (
          <input
            type="text"
            placeholder="Please specify"
            value={formData.genderIdentityOther}
            onChange={(e) => setFormData(prev => ({ ...prev, genderIdentityOther: e.target.value }))}
            className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        )}
      </div>

      {/* Pronouns */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          What pronouns do you use? {isOptional && <span className="text-gray-400">(Optional)</span>}
        </label>
        <select
          value={formData.pronouns}
          onChange={(e) => handleSelectChange('pronouns', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          <option value="">Select an option</option>
          {PRONOUNS_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        {showOtherFields.pronouns && (
          <input
            type="text"
            placeholder="Please specify"
            value={formData.pronounsOther}
            onChange={(e) => setFormData(prev => ({ ...prev, pronounsOther: e.target.value }))}
            className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        )}
      </div>

      {/* Racial/Ethnic Identity */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          How do you describe your racial/ethnic identity? {isOptional && <span className="text-gray-400">(Optional, select all that apply)</span>}
        </label>
        <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
          {RACIAL_IDENTITY_OPTIONS.map(opt => (
            <label key={opt.value} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
              <input
                type="checkbox"
                checked={formData.racialIdentity.includes(opt.value)}
                onChange={() => handleRacialIdentityChange(opt.value)}
                className="rounded text-teal-600 focus:ring-teal-500"
              />
              <span className="text-sm">{opt.label}</span>
            </label>
          ))}
        </div>
        {showOtherFields.racialIdentity && (
          <input
            type="text"
            placeholder="Please specify"
            value={formData.racialIdentityOther}
            onChange={(e) => setFormData(prev => ({ ...prev, racialIdentityOther: e.target.value }))}
            className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        )}
      </div>

      {/* Disability */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Do you identify as having a disability? {isOptional && <span className="text-gray-400">(Optional)</span>}
        </label>
        <select
          value={formData.disability}
          onChange={(e) => setFormData(prev => ({ ...prev, disability: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          <option value="">Select an option</option>
          {DISABILITY_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        {formData.disability && formData.disability !== 'none' && formData.disability !== 'prefer_not_to_say' && (
          <textarea
            placeholder="If you're comfortable, please share any accommodations that would be helpful (optional)"
            value={formData.disabilityDetails}
            onChange={(e) => setFormData(prev => ({ ...prev, disabilityDetails: e.target.value }))}
            className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            rows={3}
          />
        )}
      </div>

      <div className="flex gap-4">
        {isOptional && (
          <button
            type="button"
            onClick={() => onSubmit({})}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Skip for now
          </button>
        )}
        <button
          type="submit"
          className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
        >
          Continue
        </button>
      </div>
    </form>
  );
}