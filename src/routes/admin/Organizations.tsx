import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building, Plus, Edit, X, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

interface Organization {
  id: string;
  name: string;
  description: string | null;
  contactEmail: string | null;
  website: string | null;
  createdAt: string;
  memberCount: number;
}

interface OrgFormData {
  name: string;
  description: string;
  contactEmail: string;
  website: string;
}

export default function Organizations() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<OrgFormData>({
    name: '',
    description: '',
    contactEmail: '',
    website: ''
  });

  useEffect(() => {
    loadOrganizations();
  }, []);

  const loadOrganizations = async () => {
    try {
      setLoading(true);
      const { data, error } = await api.admin.getOrganizations();
      if (error) throw new Error(error);
      setOrganizations(data?.organizations || []);
    } catch (err) {
      console.error('Error loading organizations:', err);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingOrg(null);
    setFormData({ name: '', description: '', contactEmail: '', website: '' });
    setShowModal(true);
  };

  const openEditModal = (org: Organization) => {
    setEditingOrg(org);
    setFormData({
      name: org.name,
      description: org.description || '',
      contactEmail: org.contactEmail || '',
      website: org.website || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      setSaving(true);
      if (editingOrg) {
        const { error } = await api.admin.updateOrganization(editingOrg.id, formData);
        if (error) throw new Error(error);
      } else {
        const { error } = await api.admin.createOrganization(formData);
        if (error) throw new Error(error);
      }
      setShowModal(false);
      loadOrganizations();
    } catch (err) {
      console.error('Error saving organization:', err);
      alert('Failed to save organization');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-CA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-sage/10 rounded w-48 animate-pulse" />
        <div className="cosmic-card p-6 animate-pulse">
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-sage/10 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-deepSage">Organizations</h1>
          <p className="text-textSecondaryLight mt-1">
            Manage partner organizations
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-teal text-white rounded-lg hover:bg-teal/90 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Organization
        </button>
      </div>

      <motion.div
        className="cosmic-card overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {organizations.length === 0 ? (
          <div className="p-12 text-center">
            <Building className="w-12 h-12 text-sage/40 mx-auto mb-4" />
            <p className="text-textSecondaryLight">No organizations yet</p>
            <button
              onClick={openCreateModal}
              className="mt-4 text-teal hover:underline"
            >
              Create your first organization
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-sage/5 border-b border-borderMutedLight">
                <tr>
                  <th className="text-left p-4 text-sm font-medium text-textSecondaryLight">
                    Organization
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-textSecondaryLight">
                    Contact
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-textSecondaryLight">
                    Members
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-textSecondaryLight">
                    Created
                  </th>
                  <th className="text-right p-4 text-sm font-medium text-textSecondaryLight">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {organizations.map((org) => (
                  <tr
                    key={org.id}
                    className="border-b border-borderMutedLight last:border-0 hover:bg-sage/5 transition-colors"
                  >
                    <td className="p-4">
                      <div>
                        <p className="font-medium text-deepSage">{org.name}</p>
                        {org.description && (
                          <p className="text-sm text-textSecondaryLight line-clamp-1">
                            {org.description}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      {org.contactEmail ? (
                        <a
                          href={`mailto:${org.contactEmail}`}
                          className="text-teal hover:underline text-sm"
                        >
                          {org.contactEmail}
                        </a>
                      ) : (
                        <span className="text-textSecondaryLight text-sm">—</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-deepSage">
                        {org.memberCount}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-textSecondaryLight">
                        {formatDate(org.createdAt)}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => openEditModal(org)}
                        className="p-2 text-sage hover:text-teal hover:bg-teal/10 rounded-lg transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {showModal && (
          <motion.div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowModal(false)}
          >
            <motion.div
              className="bg-surface rounded-xl shadow-xl max-w-md w-full p-6"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-deepSage">
                  {editingOrg ? 'Edit Organization' : 'New Organization'}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-1 text-sage hover:text-deepSage"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-deepSage mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-borderMutedLight rounded-lg focus:outline-none focus:ring-2 focus:ring-teal"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-deepSage mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-borderMutedLight rounded-lg focus:outline-none focus:ring-2 focus:ring-teal"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-deepSage mb-1">
                    Contact Email
                  </label>
                  <input
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) =>
                      setFormData({ ...formData, contactEmail: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-borderMutedLight rounded-lg focus:outline-none focus:ring-2 focus:ring-teal"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-deepSage mb-1">
                    Website
                  </label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) =>
                      setFormData({ ...formData, website: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-borderMutedLight rounded-lg focus:outline-none focus:ring-2 focus:ring-teal"
                    placeholder="https://"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-2 border border-borderMutedLight text-deepSage rounded-lg hover:bg-sage/5 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving || !formData.name.trim()}
                    className="flex-1 px-4 py-2 bg-teal text-white rounded-lg hover:bg-teal/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    {editingOrg ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
