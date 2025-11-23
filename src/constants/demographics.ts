// Inclusive demographic options for youth and guardian collection

export const SEXUAL_ORIENTATION_OPTIONS = [
  { value: 'heterosexual', label: 'Heterosexual/Straight' },
  { value: 'gay', label: 'Gay' },
  { value: 'lesbian', label: 'Lesbian' },
  { value: 'bisexual', label: 'Bisexual' },
  { value: 'pansexual', label: 'Pansexual' },
  { value: 'asexual', label: 'Asexual' },
  { value: 'queer', label: 'Queer' },
  { value: 'questioning', label: 'Questioning/Unsure' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
  { value: 'other', label: 'Other (please specify)' }
];

export const GENDER_IDENTITY_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'transgender_male', label: 'Transgender Male/Trans Man' },
  { value: 'transgender_female', label: 'Transgender Female/Trans Woman' },
  { value: 'non_binary', label: 'Non-binary' },
  { value: 'genderfluid', label: 'Genderfluid' },
  { value: 'genderqueer', label: 'Genderqueer' },
  { value: 'agender', label: 'Agender' },
  { value: 'two_spirit', label: 'Two-Spirit' },
  { value: 'questioning', label: 'Questioning/Unsure' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
  { value: 'other', label: 'Other (please specify)' }
];

export const PRONOUNS_OPTIONS = [
  { value: 'he_him', label: 'He/Him' },
  { value: 'she_her', label: 'She/Her' },
  { value: 'they_them', label: 'They/Them' },
  { value: 'he_they', label: 'He/They' },
  { value: 'she_they', label: 'She/They' },
  { value: 'ze_zir', label: 'Ze/Zir' },
  { value: 'xe_xem', label: 'Xe/Xem' },
  { value: 'name_only', label: 'Use my name only' },
  { value: 'any', label: 'Any pronouns' },
  { value: 'ask_me', label: 'Ask me' },
  { value: 'other', label: 'Other (please specify)' }
];

export const RACIAL_IDENTITY_OPTIONS = [
  { value: 'indigenous_north_america', label: 'Indigenous (North America)' },
  { value: 'black', label: 'Black/African' },
  { value: 'east_asian', label: 'East Asian' },
  { value: 'south_asian', label: 'South Asian' },
  { value: 'southeast_asian', label: 'Southeast Asian' },
  { value: 'middle_eastern', label: 'Middle Eastern/North African' },
  { value: 'pacific_islander', label: 'Pacific Islander' },
  { value: 'latinx', label: 'Latinx/Hispanic' },
  { value: 'white', label: 'White/Caucasian' },
  { value: 'mixed_multiracial', label: 'Mixed/Multiracial' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
  { value: 'other', label: 'Other (please specify)' }
];

export const DISABILITY_OPTIONS = [
  { value: 'none', label: 'No disability' },
  { value: 'physical', label: 'Physical disability' },
  { value: 'visual', label: 'Visual impairment' },
  { value: 'hearing', label: 'Hearing impairment' },
  { value: 'cognitive', label: 'Cognitive/Intellectual disability' },
  { value: 'mental_health', label: 'Mental health condition' },
  { value: 'learning', label: 'Learning disability' },
  { value: 'chronic_illness', label: 'Chronic illness' },
  { value: 'neurodivergent', label: 'Neurodivergent (ADHD, Autism, etc.)' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
  { value: 'multiple', label: 'Multiple disabilities' }
];

export const GUARDIAN_RELATIONSHIP_OPTIONS = [
  { value: 'mother', label: 'Mother' },
  { value: 'father', label: 'Father' },
  { value: 'stepmother', label: 'Stepmother' },
  { value: 'stepfather', label: 'Stepfather' },
  { value: 'grandmother', label: 'Grandmother' },
  { value: 'grandfather', label: 'Grandfather' },
  { value: 'aunt', label: 'Aunt' },
  { value: 'uncle', label: 'Uncle' },
  { value: 'sibling', label: 'Older Sibling' },
  { value: 'foster_parent', label: 'Foster Parent' },
  { value: 'guardian', label: 'Legal Guardian' },
  { value: 'other', label: 'Other' }
];

export const AWARENESS_LEVEL_OPTIONS = [
  { value: 'very_well', label: 'I know my youth very well' },
  { value: 'well', label: 'I know them well' },
  { value: 'somewhat', label: 'I know them somewhat' },
  { value: 'not_well', label: 'I don\'t know them that well' },
  { value: 'unsure', label: 'I\'m unsure' }
];

export const COMFORT_LEVEL_OPTIONS = [
  { value: 'very_comfortable', label: 'Very comfortable and supportive' },
  { value: 'comfortable', label: 'Comfortable' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'uncomfortable', label: 'Somewhat uncomfortable' },
  { value: 'very_uncomfortable', label: 'Very uncomfortable' },
  { value: 'learning', label: 'I\'m still learning and growing' }
];

export const SUPPORT_PROVIDED_OPTIONS = [
  { value: 'emotional', label: 'Emotional support' },
  { value: 'financial', label: 'Financial support' },
  { value: 'medical', label: 'Medical/healthcare support' },
  { value: 'educational', label: 'Educational advocacy' },
  { value: 'social', label: 'Social connections' },
  { value: 'housing', label: 'Safe housing' },
  { value: 'transportation', label: 'Transportation' },
  { value: 'none', label: 'Not currently providing support' }
];