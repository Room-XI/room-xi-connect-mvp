import { useState, useEffect } from 'react';
import { Shield, Download, Trash2, Eye, AlertCircle, CheckCircle2, ChevronRight } from 'lucide-react';
import { api } from '../../lib/api';
import { motion, AnimatePresence } from 'framer-motion';

export default function PrivacyDashboard() {
  const [consents, setConsents] = useState<Record<string, boolean>>({});
  const [auditTrail, setAuditTrail] = useState<any[]>([]);
  const [guardianStatus, setGuardianStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [exporting, setExporting] = useState(false);
  
  useEffect(() => {
    loadPrivacyData();
  }, []);
  
  const loadPrivacyData = async () => {
    try {
      const [consentsRes, guardianRes] = await Promise.all([
        api.consent.myConsents(),
        api.consent.guardianStatus(),
      ]);
      
      if (consentsRes.data) {
        setConsents(consentsRes.data);
      }
      
      if (guardianRes.data) {
        setGuardianStatus(guardianRes.data);
      }
    } catch (error) {
      console.error('Failed to load privacy data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleExportData = async () => {
    setExporting(true);
    try {
      const response = await fetch('/api/consent/export-data', {
        credentials: 'include',
      });
      
      if (!response.ok) throw new Error('Export failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `room-xi-data-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export data. Please try again.');
    } finally {
      setExporting(false);
    }
  };
  
  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'DELETE MY ACCOUNT') {
      alert('Please type exactly: DELETE MY ACCOUNT');
      return;
    }
    
    try {
      await api.consent.deleteAccount(deleteConfirmation);
      window.location.href = '/';
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Failed to delete account. Please try again.');
    }
  };
  
  const handleRevokeConsent = async (consentType: string) => {
    try {
      await api.consent.update(consentType, false);
      await loadPrivacyData();
    } catch (error) {
      console.error('Failed to revoke consent:', error);
      alert('Failed to revoke consent. Please try again.');
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="text-blue-600" size={24} />
          <h2 className="text-2xl font-bold text-gray-900">Privacy Dashboard</h2>
        </div>
      </div>
      
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
        <p className="text-sm text-blue-900">
          <strong>Privacy by Design:</strong> You control your data. View what we collect, export it anytime, or delete your account completely.
        </p>
      </div>
      
      {/* Guardian Status */}
      {guardianStatus && guardianStatus.required && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Guardian Verification</h3>
          <div className="flex items-center gap-2">
            {guardianStatus.verified ? (
              <>
                <CheckCircle2 className="text-green-500" size={20} />
                <span className="text-green-700">Guardian verified</span>
              </>
            ) : guardianStatus.pending ? (
              <>
                <AlertCircle className="text-yellow-500" size={20} />
                <span className="text-yellow-700">Guardian verification pending</span>
              </>
            ) : (
              <>
                <AlertCircle className="text-red-500" size={20} />
                <span className="text-red-700">Guardian verification required</span>
              </>
            )}
          </div>
        </div>
      )}
      
      {/* Active Consents */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Active Consents</h3>
          <Eye size={20} className="text-gray-400" />
        </div>
        
        {Object.keys(consents).length === 0 ? (
          <p className="text-gray-500 text-sm">No consents recorded yet.</p>
        ) : (
          <div className="space-y-3">
            {Object.entries(consents).map(([type, value]) => (
              <div key={type} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  {value ? (
                    <CheckCircle2 className="text-green-500" size={20} />
                  ) : (
                    <AlertCircle className="text-gray-400" size={20} />
                  )}
                  <div>
                    <p className="font-medium text-gray-900 capitalize">
                      {type.replace(/_/g, ' ')}
                    </p>
                    <p className="text-xs text-gray-500">
                      {value ? 'Granted' : 'Revoked'}
                    </p>
                  </div>
                </div>
                
                {value && !['terms_of_use', 'privacy_notice'].includes(type) && (
                  <button
                    onClick={() => handleRevokeConsent(type)}
                    className="text-sm text-red-600 hover:underline"
                  >
                    Revoke
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Data You've Shared */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-900 mb-4">Data You've Shared</h3>
        
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
            <span className="text-gray-700">Profile Information</span>
            <ChevronRight size={16} className="text-gray-400" />
          </div>
          <div className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
            <span className="text-gray-700">Mood Check-ins</span>
            <ChevronRight size={16} className="text-gray-400" />
          </div>
          <div className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
            <span className="text-gray-700">Program Attendance</span>
            <ChevronRight size={16} className="text-gray-400" />
          </div>
          <div className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
            <span className="text-gray-700">Ximi Conversations</span>
            <ChevronRight size={16} className="text-gray-400" />
          </div>
        </div>
      </div>
      
      {/* Your Privacy Rights */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-900 mb-4">Your Privacy Rights</h3>
        
        <div className="space-y-3">
          <button
            onClick={handleExportData}
            disabled={exporting}
            className="w-full flex items-center justify-between p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-3">
              <Download className="text-blue-600" size={20} />
              <div className="text-left">
                <p className="font-medium text-gray-900">Export Your Data</p>
                <p className="text-xs text-gray-600">Download a copy of all your data (PIPA compliant)</p>
              </div>
            </div>
            {exporting ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            ) : (
              <ChevronRight className="text-blue-600" size={20} />
            )}
          </button>
          
          <button
            onClick={() => setShowDeleteModal(true)}
            className="w-full flex items-center justify-between p-4 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-3">
              <Trash2 className="text-red-600" size={20} />
              <div className="text-left">
                <p className="font-medium text-gray-900">Delete Account</p>
                <p className="text-xs text-gray-600">Permanently delete all your data</p>
              </div>
            </div>
            <ChevronRight className="text-red-600" size={20} />
          </button>
        </div>
      </div>
      
      {/* Legal Compliance Notice */}
      <div className="bg-gray-50 p-4 rounded-lg text-xs text-gray-600">
        <p>
          <strong>Alberta PIPA & FOIP Compliance:</strong> Room XI Connect complies with Alberta's 
          Personal Information Protection Act (PIPA) and Freedom of Information and Protection of Privacy Act (FOIP). 
          All data is stored in Canada. You have the right to access, correct, and delete your personal information at any time.
        </p>
      </div>
      
      {/* Delete Account Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-lg p-6 max-w-md w-full"
            >
              <div className="flex items-start gap-3 mb-4">
                <AlertCircle className="text-red-500 mt-1" size={24} />
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Delete Account?</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    This action cannot be undone. All your data will be permanently deleted.
                  </p>
                </div>
              </div>
              
              <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
                <p className="text-sm text-red-900">
                  <strong>What will be deleted:</strong>
                </p>
                <ul className="text-sm text-red-800 mt-2 space-y-1 list-disc list-inside">
                  <li>Your profile and account</li>
                  <li>All mood check-ins</li>
                  <li>Program attendance records</li>
                  <li>Ximi conversation history</li>
                  <li>All consent records</li>
                </ul>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type exactly: <strong>DELETE MY ACCOUNT</strong>
                </label>
                <input
                  type="text"
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="DELETE MY ACCOUNT"
                />
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteConfirmation('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmation !== 'DELETE MY ACCOUNT'}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Delete Forever
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
