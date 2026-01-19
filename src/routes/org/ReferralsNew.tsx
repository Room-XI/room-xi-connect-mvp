import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Search, 
  User,
  Building2,
  AlertCircle,
  Check,
  Loader2
} from 'lucide-react';
import { api } from '@/lib/api';

interface Youth {
  id: string;
  displayName: string;
  lastAttendance: string | null;
}

interface Organization {
  id: string;
  name: string;
  type: string;
}

export default function ReferralsNew() {
  const navigate = useNavigate();
  
  const [youthSearch, setYouthSearch] = useState('');
  const [youthResults, setYouthResults] = useState<Youth[]>([]);
  const [selectedYouth, setSelectedYouth] = useState<Youth | null>(null);
  const [youthLoading, setYouthLoading] = useState(false);
  
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [orgsLoading, setOrgsLoading] = useState(true);
  
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [summary, setSummary] = useState('');
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadOrganizations();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (youthSearch.length >= 2) {
        searchYouth();
      } else {
        setYouthResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [youthSearch]);

  const loadOrganizations = async () => {
    try {
      setOrgsLoading(true);
      const response = await api.get<{ organizations: Organization[] }>('/org/partner-organizations');
      if (response.data) {
        setOrganizations(response.data.organizations);
      }
    } catch (err) {
      console.error('Error loading organizations:', err);
      setError('Failed to load partner organizations');
    } finally {
      setOrgsLoading(false);
    }
  };

  const searchYouth = async () => {
    try {
      setYouthLoading(true);
      const response = await api.get<{ youth: Youth[] }>(`/org/youth?q=${encodeURIComponent(youthSearch)}`);
      if (response.data) {
        setYouthResults(response.data.youth);
      }
    } catch (err) {
      console.error('Error searching youth:', err);
    } finally {
      setYouthLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedYouth || !selectedOrg) {
      setError('Please select a youth and destination organization');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      
      const response = await api.post('/org/referrals', {
        youth_id: selectedYouth.id,
        to_org_id: selectedOrg.id,
        priority,
        summary
      });
      if (response.error) {
        throw new Error(response.error);
      }

      setSuccess(true);
      setTimeout(() => {
        navigate('/org/referrals');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to create referral');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-xl p-8 shadow-lg text-center"
        >
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Referral Created</h2>
          <p className="text-gray-600">Redirecting to referrals list...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link to="/org/referrals" className="text-gray-500 hover:text-gray-700">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-semibold text-gray-900">New Referral</h1>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-red-700">{error}</p>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-teal" />
              Select Youth
            </h2>
            
            {selectedYouth ? (
              <div className="flex items-center justify-between p-3 bg-teal/5 border border-teal/20 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{selectedYouth.displayName}</p>
                  {selectedYouth.lastAttendance && (
                    <p className="text-sm text-gray-500">
                      Last attended: {new Date(selectedYouth.lastAttendance).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedYouth(null);
                    setYouthSearch('');
                  }}
                  className="text-sm text-teal hover:underline"
                >
                  Change
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name..."
                    value={youthSearch}
                    onChange={(e) => setYouthSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal focus:border-teal"
                  />
                  {youthLoading && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
                  )}
                </div>
                
                {youthResults.length > 0 && (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    {youthResults.map((youth) => (
                      <button
                        key={youth.id}
                        type="button"
                        onClick={() => {
                          setSelectedYouth(youth);
                          setYouthResults([]);
                        }}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                      >
                        <p className="font-medium text-gray-900">{youth.displayName}</p>
                        {youth.lastAttendance && (
                          <p className="text-sm text-gray-500">
                            Last attended: {new Date(youth.lastAttendance).toLocaleDateString()}
                          </p>
                        )}
                      </button>
                    ))}
                  </div>
                )}
                
                {youthSearch.length >= 2 && !youthLoading && youthResults.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No youth found matching "{youthSearch}"
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-teal" />
              Destination Organization
            </h2>
            
            {orgsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-teal animate-spin" />
              </div>
            ) : (
              <div className="space-y-2">
                {organizations.map((org) => (
                  <label
                    key={org.id}
                    className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedOrg?.id === org.id
                        ? 'border-teal bg-teal/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="organization"
                      value={org.id}
                      checked={selectedOrg?.id === org.id}
                      onChange={() => setSelectedOrg(org)}
                      className="sr-only"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{org.name}</p>
                      <p className="text-sm text-gray-500">{org.type}</p>
                    </div>
                    {selectedOrg?.id === org.id && (
                      <Check className="w-5 h-5 text-teal" />
                    )}
                  </label>
                ))}
                
                {organizations.length === 0 && (
                  <p className="text-gray-500 text-center py-4">
                    No partner organizations available
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Referral Details</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority
                </label>
                <div className="flex gap-3">
                  {(['low', 'medium', 'high'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={`flex-1 py-2 px-4 rounded-lg border font-medium capitalize transition-colors ${
                        priority === p
                          ? p === 'high'
                            ? 'border-red-500 bg-red-50 text-red-700'
                            : p === 'medium'
                            ? 'border-amber-500 bg-amber-50 text-amber-700'
                            : 'border-gray-400 bg-gray-50 text-gray-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="summary" className="block text-sm font-medium text-gray-700 mb-2">
                  Summary / Notes
                </label>
                <textarea
                  id="summary"
                  rows={4}
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="Provide context for this referral..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal focus:border-teal resize-none"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Link
              to="/org/referrals"
              className="flex-1 py-3 px-4 text-center border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting || !selectedYouth || !selectedOrg}
              className="flex-1 py-3 px-4 bg-teal text-white rounded-lg hover:bg-teal/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Referral'
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
