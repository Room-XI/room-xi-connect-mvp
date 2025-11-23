import { useState } from 'react';
import {
  SEXUAL_ORIENTATION_OPTIONS,
  GENDER_IDENTITY_OPTIONS,
  RACIAL_IDENTITY_OPTIONS,
  GUARDIAN_RELATIONSHIP_OPTIONS,
  AWARENESS_LEVEL_OPTIONS,
  COMFORT_LEVEL_OPTIONS,
  SUPPORT_PROVIDED_OPTIONS
} from '../../constants/demographics';

interface GuardianPerceptionFormProps {
  youthName?: string;
  onSubmit: (data: any) => void;
}

export function GuardianPerceptionForm({ youthName = 'your youth', onSubmit }: GuardianPerceptionFormProps) {
  const [formData, setFormData] = useState({
    // Guardian's own demographics
    guardianRelationship: '',
    guardianAge: '',
    guardianGender: '',
    guardianRace: [] as string[],
    
    // Guardian's perception of youth
    perceivedSexualOrientation: '',
    perceivedGenderIdentity: '',
    perceivedRacialIdentity: [] as string[],
    
    // Awareness and comfort levels
    awarenessLevel: '',
    comfortWithIdentity: '',
    supportProvided: [] as string[]
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleRaceToggle = (value: string, isGuardian: boolean) => {
    if (isGuardian) {
      setFormData(prev => ({
        ...prev,
        guardianRace: prev.guardianRace.includes(value)
          ? prev.guardianRace.filter(v => v !== value)
          : [...prev.guardianRace, value]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        perceivedRacialIdentity: prev.perceivedRacialIdentity.includes(value)
          ? prev.perceivedRacialIdentity.filter(v => v !== value)
          : [...prev.perceivedRacialIdentity, value]
      }));
    }
  };

  const handleSupportToggle = (value: string) => {
    setFormData(prev => ({
      ...prev,
      supportProvided: prev.supportProvided.includes(value)
        ? prev.supportProvided.filter(v => v !== value)
        : [...prev.supportProvided, value]
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">About This Survey</h3>
        <p className="text-sm text-blue-800">
          This information helps us understand how we can better support families. 
          Your responses are confidential and will be used to improve our programs and resources.
        </p>
      </div>

      {/* Section 1: Guardian's Own Demographics */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">About You</h3>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Your relationship to {youthName}
          </label>
          <select
            value={formData.guardianRelationship}
            onChange={(e) => setFormData(prev => ({ ...prev, guardianRelationship: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Select relationship</option>
            {GUARDIAN_RELATIONSHIP_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Your age range
          </label>
          <select
            value={formData.guardianAge}
            onChange={(e) => setFormData(prev => ({ ...prev, guardianAge: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select age range</option>
            <option value="under_30">Under 30</option>
            <option value="30_39">30-39</option>
            <option value="40_49">40-49</option>
            <option value="50_59">50-59</option>
            <option value="60_plus">60+</option>
            <option value="prefer_not_to_say">Prefer not to say</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Your gender
          </label>
          <select
            value={formData.guardianGender}
            onChange={(e) => setFormData(prev => ({ ...prev, guardianGender: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select gender</option>
            {GENDER_IDENTITY_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Your racial/ethnic identity <span className="text-gray-400">(select all that apply)</span>
          </label>
          <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
            {RACIAL_IDENTITY_OPTIONS.map(opt => (
              <label key={opt.value} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                <input
                  type="checkbox"
                  checked={formData.guardianRace.includes(opt.value)}
                  onChange={() => handleRaceToggle(opt.value, true)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Section 2: Perception of Youth */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Your Understanding of {youthName}</h3>
        
        <div className="bg-amber-50 p-3 rounded-lg">
          <p className="text-sm text-amber-800">
            These questions help us understand family dynamics. There are no right or wrong answers.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            How well do you feel you know {youthName}?
          </label>
          <select
            value={formData.awarenessLevel}
            onChange={(e) => setFormData(prev => ({ ...prev, awarenessLevel: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Select an option</option>
            {AWARENESS_LEVEL_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            How would you describe {youthName}'s sexual orientation?
          </label>
          <select
            value={formData.perceivedSexualOrientation}
            onChange={(e) => setFormData(prev => ({ ...prev, perceivedSexualOrientation: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select an option</option>
            <option value="dont_know">I don't know</option>
            <option value="never_discussed">We've never discussed it</option>
            {SEXUAL_ORIENTATION_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            How would you describe {youthName}'s gender identity?
          </label>
          <select
            value={formData.perceivedGenderIdentity}
            onChange={(e) => setFormData(prev => ({ ...prev, perceivedGenderIdentity: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select an option</option>
            <option value="dont_know">I don't know</option>
            <option value="never_discussed">We've never discussed it</option>
            {GENDER_IDENTITY_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            How would you describe {youthName}'s racial/ethnic identity? <span className="text-gray-400">(select all that apply)</span>
          </label>
          <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
            <label className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
              <input
                type="checkbox"
                checked={formData.perceivedRacialIdentity.includes('dont_know')}
                onChange={() => handleRaceToggle('dont_know', false)}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm">I don't know</span>
            </label>
            {RACIAL_IDENTITY_OPTIONS.map(opt => (
              <label key={opt.value} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                <input
                  type="checkbox"
                  checked={formData.perceivedRacialIdentity.includes(opt.value)}
                  onChange={() => handleRaceToggle(opt.value, false)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                  disabled={formData.perceivedRacialIdentity.includes('dont_know')}
                />
                <span className="text-sm">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            How comfortable are you with {youthName}'s identity and expression?
          </label>
          <select
            value={formData.comfortWithIdentity}
            onChange={(e) => setFormData(prev => ({ ...prev, comfortWithIdentity: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select an option</option>
            {COMFORT_LEVEL_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            What kinds of support do you provide to {youthName}? <span className="text-gray-400">(select all that apply)</span>
          </label>
          <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
            {SUPPORT_PROVIDED_OPTIONS.map(opt => (
              <label key={opt.value} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                <input
                  type="checkbox"
                  checked={formData.supportProvided.includes(opt.value)}
                  onChange={() => handleSupportToggle(opt.value)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <button
        type="submit"
        className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
      >
        Complete Verification
      </button>
    </form>
  );
}