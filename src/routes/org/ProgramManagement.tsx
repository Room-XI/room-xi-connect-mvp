import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Calendar,
  MapPin,
  DollarSign,
  Users,
  Save,
  X
} from 'lucide-react';
import api from '@/lib/api';

interface Program {
  id: string;
  title: string;
  description: string | null;
  long_description: string | null;
  tags: string[];
  free: boolean;
  cost_cents: number | null;
  location_name: string | null;
  address: string | null;
  organizer: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  website_url: string | null;
  next_start: string | null;
  next_end: string | null;
  capacity: number | null;
  age_min: number | null;
  age_max: number | null;
  indoor: boolean | null;
  outdoor: boolean | null;
}

export default function ProgramManagement() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    loadPrograms();
  }, []);

  const loadPrograms = async () => {
    try {
      setLoading(true);
      const { data, error } = await api.programs.list();
      if (error) {
        console.error('Error loading programs:', error);
        return;
      }
      setPrograms(data || []);
    } catch (error) {
      console.error('Error loading programs:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteProgram = async (id: string) => {
    if (!confirm('Are you sure you want to delete this program? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await api.programs.delete(id);
      if (error) {
        throw new Error('Failed to delete program');
      }
      setPrograms(programs.filter(p => p.id !== id));
    } catch (error) {
      console.error('Error deleting program:', error);
      alert('Failed to delete program. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="py-6 space-y-4">
        <div className="h-8 bg-sage/10 rounded w-64 animate-pulse" />
        {[1, 2, 3].map(i => (
          <div key={i} className="cosmic-card p-6 animate-pulse">
            <div className="space-y-3">
              <div className="h-6 bg-sage/10 rounded w-3/4" />
              <div className="h-4 bg-sage/10 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="py-6 space-y-6">
      {/* Header */}
      <motion.div
        className="flex items-center justify-between"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h1 className="text-3xl font-display font-bold text-deepSage">
            Program Management
          </h1>
          <p className="text-textSecondaryLight mt-1">
            {programs.length} {programs.length === 1 ? 'program' : 'programs'} total
          </p>
        </div>
        
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2 cosmic-button"
        >
          <Plus className="w-5 h-5" />
          <span>New Program</span>
        </button>
      </motion.div>

      {/* Create Form Modal */}
      {showCreateForm && (
        <ProgramForm
          onClose={() => setShowCreateForm(false)}
          onSave={() => {
            setShowCreateForm(false);
            loadPrograms();
          }}
        />
      )}

      {/* Programs List */}
      <div className="space-y-4">
        {programs.length === 0 ? (
          <motion.div
            className="cosmic-card p-12 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="w-16 h-16 bg-sage/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-sage" />
            </div>
            <h3 className="text-xl font-semibold text-deepSage mb-2">
              No Programs Yet
            </h3>
            <p className="text-textSecondaryLight mb-6">
              Get started by creating your first program
            </p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="cosmic-button"
            >
              Create Program
            </button>
          </motion.div>
        ) : (
          programs.map((program, index) => (
            <motion.div
              key={program.id}
              className="cosmic-card p-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-3">
                  <div>
                    <h3 className="text-xl font-semibold text-deepSage">
                      {program.title}
                    </h3>
                    {program.organizer && (
                      <p className="text-sm text-textSecondaryLight mt-1">
                        by {program.organizer}
                      </p>
                    )}
                  </div>

                  {program.description && (
                    <p className="text-textSecondaryLight">
                      {program.description}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-4 text-sm">
                    {program.next_start && (
                      <div className="flex items-center gap-1.5 text-teal">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {new Date(program.next_start).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    
                    {program.location_name && (
                      <div className="flex items-center gap-1.5 text-textSecondaryLight">
                        <MapPin className="w-4 h-4" />
                        <span>{program.location_name}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-1.5 text-textSecondaryLight">
                      <DollarSign className="w-4 h-4" />
                      <span>
                        {program.free ? 'Free' : `$${(program.cost_cents || 0) / 100}`}
                      </span>
                    </div>

                    {program.capacity && (
                      <div className="flex items-center gap-1.5 text-textSecondaryLight">
                        <Users className="w-4 h-4" />
                        <span>{program.capacity} max</span>
                      </div>
                    )}
                  </div>

                  {program.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {program.tags.map(tag => (
                        <span key={tag} className="cosmic-chip text-xs">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingId(program.id)}
                    className="p-2 rounded-lg hover:bg-teal/10 text-teal transition-colors"
                    title="Edit program"
                  >
                    <Edit className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => deleteProgram(program.id)}
                    className="p-2 rounded-lg hover:bg-coral/10 text-coral transition-colors"
                    title="Delete program"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Edit Form */}
              {editingId === program.id && (
                <div className="mt-6 pt-6 border-t border-sage/10">
                  <ProgramForm
                    program={program}
                    onClose={() => setEditingId(null)}
                    onSave={() => {
                      setEditingId(null);
                      loadPrograms();
                    }}
                  />
                </div>
              )}
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

interface ProgramFormProps {
  program?: Program;
  onClose: () => void;
  onSave: () => void;
}

function ProgramForm({ program, onClose, onSave }: ProgramFormProps) {
  const [formData, setFormData] = useState({
    title: program?.title || '',
    description: program?.description || '',
    long_description: program?.long_description || '',
    organizer: program?.organizer || '',
    tags: program?.tags?.join(', ') || '',
    free: program?.free ?? true,
    cost_cents: program?.cost_cents ? (program.cost_cents / 100).toString() : '',
    location_name: program?.location_name || '',
    address: program?.address || '',
    contact_email: program?.contact_email || '',
    contact_phone: program?.contact_phone || '',
    website_url: program?.website_url || '',
    capacity: program?.capacity?.toString() || '',
    age_min: program?.age_min?.toString() || '',
    age_max: program?.age_max?.toString() || '',
    indoor: program?.indoor ?? false,
    outdoor: program?.outdoor ?? false,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = {
        title: formData.title,
        description: formData.description || null,
        long_description: formData.long_description || null,
        organizer: formData.organizer || null,
        tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
        free: formData.free,
        cost_cents: formData.free ? 0 : (parseFloat(formData.cost_cents) || 0) * 100,
        location_name: formData.location_name || null,
        address: formData.address || null,
        contact_email: formData.contact_email || null,
        contact_phone: formData.contact_phone || null,
        website_url: formData.website_url || null,
        capacity: formData.capacity ? parseInt(formData.capacity) : null,
        age_min: formData.age_min ? parseInt(formData.age_min) : null,
        age_max: formData.age_max ? parseInt(formData.age_max) : null,
        indoor: formData.indoor,
        outdoor: formData.outdoor,
      };

      const result = program 
        ? await api.programs.update(program.id, payload)
        : await api.programs.create(payload);

      if (result.error) {
        throw new Error('Failed to save program');
      }

      onSave();
    } catch (error) {
      console.error('Error saving program:', error);
      alert('Failed to save program. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!program) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-deepSage">Create New Program</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-sage/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <FormFields
            formData={formData}
            setFormData={setFormData}
            saving={saving}
            onSubmit={handleSubmit}
            onCancel={onClose}
          />
        </motion.div>
      </div>
    );
  }

  return (
    <FormFields
      formData={formData}
      setFormData={setFormData}
      saving={saving}
      onSubmit={handleSubmit}
      onCancel={onClose}
      isInline
    />
  );
}

function FormFields({ 
  formData, 
  setFormData, 
  saving, 
  onSubmit, 
  onCancel
}: {
  formData: any;
  setFormData: any;
  saving: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  isInline?: boolean;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-deepSage mb-1">
          Program Title *
        </label>
        <input
          type="text"
          required
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="w-full px-4 py-2 rounded-lg border border-sage/20 focus:border-teal focus:ring-2 focus:ring-teal/20"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-deepSage mb-1">
          Short Description
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={2}
          className="w-full px-4 py-2 rounded-lg border border-sage/20 focus:border-teal focus:ring-2 focus:ring-teal/20"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-deepSage mb-1">
            Organizer
          </label>
          <input
            type="text"
            value={formData.organizer}
            onChange={(e) => setFormData({ ...formData, organizer: e.target.value })}
            className="w-full px-4 py-2 rounded-lg border border-sage/20 focus:border-teal focus:ring-2 focus:ring-teal/20"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-deepSage mb-1">
            Tags (comma-separated)
          </label>
          <input
            type="text"
            value={formData.tags}
            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
            placeholder="sports, youth, free"
            className="w-full px-4 py-2 rounded-lg border border-sage/20 focus:border-teal focus:ring-2 focus:ring-teal/20"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.free}
            onChange={(e) => setFormData({ ...formData, free: e.target.checked })}
            className="w-4 h-4 text-teal border-sage/20 rounded focus:ring-teal"
          />
          <span className="text-sm text-deepSage">Free Program</span>
        </label>

        {!formData.free && (
          <div className="flex-1">
            <label className="block text-sm font-medium text-deepSage mb-1">
              Cost ($)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.cost_cents}
              onChange={(e) => setFormData({ ...formData, cost_cents: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-sage/20 focus:border-teal focus:ring-2 focus:ring-teal/20"
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-deepSage mb-1">
            Location Name
          </label>
          <input
            type="text"
            value={formData.location_name}
            onChange={(e) => setFormData({ ...formData, location_name: e.target.value })}
            className="w-full px-4 py-2 rounded-lg border border-sage/20 focus:border-teal focus:ring-2 focus:ring-teal/20"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-deepSage mb-1">
            Capacity
          </label>
          <input
            type="number"
            min="1"
            value={formData.capacity}
            onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
            className="w-full px-4 py-2 rounded-lg border border-sage/20 focus:border-teal focus:ring-2 focus:ring-teal/20"
          />
        </div>
      </div>

      <div className="flex gap-6 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 cosmic-button disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Save Program</span>
            </>
          )}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 ghost-button"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
