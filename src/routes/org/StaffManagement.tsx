import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  UserPlus, 
  Shield, 
  Edit2, 
  Trash2,
  X,
  Mail,
  ChevronDown
} from 'lucide-react';
import { api } from '@/lib/api';

interface OrgMember {
  id: string;
  email: string;
  role: 'admin' | 'facilitator' | 'viewer';
  active: boolean;
  createdAt: string;
  firstName: string | null;
  lastName: string | null;
}

const ROLE_LABELS: Record<string, { label: string; color: string; bgColor: string }> = {
  admin: { label: 'Admin', color: 'text-purple-700', bgColor: 'bg-purple-100' },
  facilitator: { label: 'Facilitator', color: 'text-teal-700', bgColor: 'bg-teal-100' },
  viewer: { label: 'Viewer', color: 'text-gray-700', bgColor: 'bg-gray-100' },
};

export default function StaffManagement() {
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'facilitator' | 'viewer'>('facilitator');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: err } = await api.org.getMembers();
      if (err) {
        setError(err);
        return;
      }
      setMembers(data || []);
    } catch (err) {
      console.error('Error loading members:', err);
      setError('Failed to load team members');
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteLoading(true);
    setInviteError(null);

    try {
      const { data, error } = await api.org.inviteMember(inviteEmail, inviteRole);
      if (error) {
        setInviteError(error);
        return;
      }
      setMembers([...members, data]);
      setShowInviteForm(false);
      setInviteEmail('');
      setInviteRole('facilitator');
    } catch (err) {
      console.error('Error inviting member:', err);
      setInviteError('Failed to invite member');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'facilitator' | 'viewer') => {
    try {
      const { error } = await api.org.updateMemberRole(userId, newRole);
      if (error) {
        alert(error);
        return;
      }
      setMembers(members.map(m => m.id === userId ? { ...m, role: newRole } : m));
      setEditingId(null);
    } catch (err) {
      console.error('Error updating role:', err);
      alert('Failed to update role');
    }
  };

  const handleRemove = async (userId: string, email: string) => {
    if (!confirm(`Are you sure you want to remove ${email} from the organization? This cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await api.org.removeMember(userId);
      if (error) {
        alert(error);
        return;
      }
      setMembers(members.filter(m => m.id !== userId));
    } catch (err) {
      console.error('Error removing member:', err);
      alert('Failed to remove member');
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="h-8 bg-gray-200 rounded w-48 mb-6 animate-pulse" />
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-xl p-6 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-48" />
                  <div className="h-3 bg-gray-200 rounded w-32" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Staff Management</h1>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={loadMembers}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <motion.div
        className="flex items-center justify-between mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Users className="w-8 h-8 text-teal-600" />
            Staff Management
          </h1>
          <p className="text-gray-600 mt-1">
            {members.length} team {members.length === 1 ? 'member' : 'members'}
          </p>
        </div>
        <button
          onClick={() => setShowInviteForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition"
        >
          <UserPlus className="w-5 h-5" />
          <span>Add Staff</span>
        </button>
      </motion.div>

      {showInviteForm && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Add Staff Member</h2>
              <button
                onClick={() => { setShowInviteForm(false); setInviteError(null); }}
                className="p-2 rounded-lg hover:bg-gray-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="staff@organization.org"
                    required
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  The user must already have a Room XI account
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <div className="relative">
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as any)}
                    className="w-full appearance-none px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  >
                    <option value="admin">Admin - Full access</option>
                    <option value="facilitator">Facilitator - Manage programs & attendance</option>
                    <option value="viewer">Viewer - Read-only access</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {inviteError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                  {inviteError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={inviteLoading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition disabled:opacity-50"
                >
                  {inviteLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Adding...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Add Member</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowInviteForm(false); setInviteError(null); }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}

      <div className="space-y-4">
        {members.length === 0 ? (
          <motion.div
            className="bg-white rounded-xl p-12 text-center shadow-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No Team Members Yet
            </h3>
            <p className="text-gray-500 mb-6">
              Start building your team by adding staff members
            </p>
            <button
              onClick={() => setShowInviteForm(true)}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition"
            >
              Add First Member
            </button>
          </motion.div>
        ) : (
          members.map((member, index) => (
            <motion.div
              key={member.id}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center">
                    <span className="text-teal-700 font-semibold text-lg">
                      {(member.firstName?.[0] || member.email[0]).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {member.firstName && member.lastName 
                        ? `${member.firstName} ${member.lastName}`
                        : member.email}
                    </h3>
                    {member.firstName && (
                      <p className="text-sm text-gray-500">{member.email}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${ROLE_LABELS[member.role]?.bgColor || 'bg-gray-100'} ${ROLE_LABELS[member.role]?.color || 'text-gray-700'}`}>
                        <Shield className="w-3 h-3 inline mr-1" />
                        {ROLE_LABELS[member.role]?.label || member.role}
                      </span>
                      <span className="text-xs text-gray-400">
                        Added {new Date(member.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {editingId === member.id ? (
                    <div className="flex items-center gap-2">
                      <select
                        value={member.role}
                        onChange={(e) => handleRoleChange(member.id, e.target.value as any)}
                        className="appearance-none px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                      >
                        <option value="admin">Admin</option>
                        <option value="facilitator">Facilitator</option>
                        <option value="viewer">Viewer</option>
                      </select>
                      <button
                        onClick={() => setEditingId(null)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 transition"
                      >
                        <X className="w-4 h-4 text-gray-500" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => setEditingId(member.id)}
                        className="p-2 rounded-lg hover:bg-teal-50 text-teal-600 transition"
                        title="Edit role"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleRemove(member.id, member.email)}
                        className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition"
                        title="Remove member"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
