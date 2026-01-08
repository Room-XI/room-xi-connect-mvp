import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  ChevronDown, 
  ChevronRight,
  AlertTriangle,
  Wind,
  MapPin,
  Users,
  Phone,
  Sparkles,
  FileText,
  Plus,
  Trash2,
  Share2,
  Loader,
  Check,
  MessageSquare
} from 'lucide-react';
import api from '@/lib/api';
import { useSession } from '@/lib/session';
import CrisisSheet from '@/ui/crisis/CrisisSheet';
import SafetyPlanShareModal from '@/components/SafetyPlanShareModal';

interface TrustedContact {
  name: string;
  phone: string;
  relationship: string;
  preferredMethod: 'call' | 'text';
}

interface ProfessionalSupport {
  name: string;
  phone: string;
  notes: string;
}

interface NotesForOthers {
  whatHelps: string;
  whatDoesntHelp: string;
  howToSupport: string;
}

interface SafetyPlanData {
  warningSigns: string[];
  copingSteps: string[];
  safePlaces: string[];
  trustedContacts: TrustedContact[];
  professionalSupport: ProfessionalSupport[];
  escalationSteps: string[];
  notesForOthers: NotesForOthers;
}

const defaultPlanData: SafetyPlanData = {
  warningSigns: [],
  copingSteps: [],
  safePlaces: [],
  trustedContacts: [],
  professionalSupport: [],
  escalationSteps: [],
  notesForOthers: {
    whatHelps: '',
    whatDoesntHelp: '',
    howToSupport: '',
  },
};

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  description?: string;
}

function AccordionSection({ title, icon, isOpen, onToggle, children, description }: SectionProps) {
  return (
    <div className="cosmic-card overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-sage/5 transition-colors"
      >
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-teal/10 flex items-center justify-center">
            {icon}
          </div>
          <div>
            <h3 className="font-semibold text-deepSage">{title}</h3>
            {description && (
              <p className="text-sm text-textSecondaryLight">{description}</p>
            )}
          </div>
        </div>
        {isOpen ? (
          <ChevronDown className="w-5 h-5 text-textSecondaryLight" />
        ) : (
          <ChevronRight className="w-5 h-5 text-textSecondaryLight" />
        )}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-4 pb-4 pt-2 border-t border-borderMutedLight/50">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ArrayEditor({ 
  items, 
  onAdd, 
  onRemove, 
  onChange, 
  placeholder,
  maxItems = 10 
}: { 
  items: string[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  onChange: (index: number, value: string) => void;
  placeholder: string;
  maxItems?: number;
}) {
  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={index} className="flex items-center space-x-2">
          <input
            type="text"
            value={item}
            onChange={(e) => onChange(index, e.target.value)}
            placeholder={placeholder}
            className="flex-1 px-3 py-2 bg-surface border border-borderMutedLight rounded-lg text-deepSage placeholder:text-textSecondaryLight/50 focus:outline-none focus:ring-2 focus:ring-teal/30"
          />
          <button
            onClick={() => onRemove(index)}
            className="p-2 text-coral hover:bg-coral/10 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}
      {items.length < maxItems && (
        <button
          onClick={onAdd}
          className="flex items-center space-x-2 text-teal hover:text-teal/80 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm">Add item</span>
        </button>
      )}
    </div>
  );
}

export default function SafetyPlan() {
  useSession();
  const [planData, setPlanData] = useState<SafetyPlanData>(defaultPlanData);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['warningSigns']));
  const [showCrisisSheet, setShowCrisisSheet] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadSafetyPlan();
  }, []);

  const loadSafetyPlan = async () => {
    try {
      setLoading(true);
      const { data, error } = await api.safetyPlan.get();
      if (error) {
        console.error('Error loading safety plan:', error);
        return;
      }
      if (data?.planData) {
        setPlanData({ ...defaultPlanData, ...data.planData });
      }
    } catch (err) {
      console.error('Error loading safety plan:', err);
    } finally {
      setLoading(false);
    }
  };

  const debouncedSave = useCallback((newData: SafetyPlanData) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    setSaveStatus('saving');
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const { error } = await api.safetyPlan.update({ planData: newData });
        if (error) {
          setSaveStatus('error');
          console.error('Error saving safety plan:', error);
        } else {
          setSaveStatus('saved');
          setTimeout(() => setSaveStatus('idle'), 2000);
        }
      } catch (err) {
        setSaveStatus('error');
        console.error('Error saving safety plan:', err);
      }
    }, 1500);
  }, []);

  const updatePlanData = useCallback((updates: Partial<SafetyPlanData>) => {
    setPlanData(prev => {
      const newData = { ...prev, ...updates };
      debouncedSave(newData);
      return newData;
    });
  }, [debouncedSave]);

  const toggleSection = (section: string) => {
    setOpenSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  const handleArrayAdd = (field: keyof SafetyPlanData) => {
    const current = planData[field] as string[];
    updatePlanData({ [field]: [...current, ''] });
  };

  const handleArrayRemove = (field: keyof SafetyPlanData, index: number) => {
    const current = planData[field] as string[];
    updatePlanData({ [field]: current.filter((_, i) => i !== index) });
  };

  const handleArrayChange = (field: keyof SafetyPlanData, index: number, value: string) => {
    const current = planData[field] as string[];
    const updated = [...current];
    updated[index] = value;
    updatePlanData({ [field]: updated });
  };

  const handleContactAdd = () => {
    updatePlanData({
      trustedContacts: [...planData.trustedContacts, { name: '', phone: '', relationship: '', preferredMethod: 'call' }]
    });
  };

  const handleContactRemove = (index: number) => {
    updatePlanData({
      trustedContacts: planData.trustedContacts.filter((_, i) => i !== index)
    });
  };

  const handleContactChange = (index: number, field: keyof TrustedContact, value: string) => {
    const updated = [...planData.trustedContacts];
    updated[index] = { ...updated[index], [field]: value };
    updatePlanData({ trustedContacts: updated });
  };

  const handleProfessionalAdd = () => {
    updatePlanData({
      professionalSupport: [...planData.professionalSupport, { name: '', phone: '', notes: '' }]
    });
  };

  const handleProfessionalRemove = (index: number) => {
    updatePlanData({
      professionalSupport: planData.professionalSupport.filter((_, i) => i !== index)
    });
  };

  const handleProfessionalChange = (index: number, field: keyof ProfessionalSupport, value: string) => {
    const updated = [...planData.professionalSupport];
    updated[index] = { ...updated[index], [field]: value };
    updatePlanData({ professionalSupport: updated });
  };

  const handleNotesChange = (field: keyof NotesForOthers, value: string) => {
    updatePlanData({
      notesForOthers: { ...planData.notesForOthers, [field]: value }
    });
  };

  if (loading) {
    return (
      <div className="py-6 space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-6 h-6 bg-sage/10 rounded animate-pulse" />
          <div className="h-8 bg-sage/10 rounded w-40 animate-pulse" />
        </div>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="cosmic-card p-4 animate-pulse">
            <div className="h-12 bg-sage/10 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="py-6 space-y-6 pb-32">
      <motion.div
        className="flex items-center justify-between"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="flex items-center space-x-3">
          <Link
            to="/me"
            className="p-2 rounded-lg hover:bg-sage/10 transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-textSecondaryLight" />
          </Link>
          <h1 className="text-2xl font-display font-bold text-deepSage">
            My Safety Plan
          </h1>
        </div>

        <div className="flex items-center space-x-2">
          {saveStatus === 'saving' && (
            <div className="flex items-center space-x-2 text-textSecondaryLight text-sm">
              <Loader className="w-4 h-4 animate-spin" />
              <span>Saving...</span>
            </div>
          )}
          {saveStatus === 'saved' && (
            <div className="flex items-center space-x-2 text-teal text-sm">
              <Check className="w-4 h-4" />
              <span>Saved</span>
            </div>
          )}
          <button
            onClick={() => setShowShareModal(true)}
            className="flex items-center space-x-2 px-3 py-2 bg-teal/10 text-teal rounded-lg hover:bg-teal/20 transition-colors"
          >
            <Share2 className="w-4 h-4" />
            <span className="text-sm font-medium">Share Plan</span>
          </button>
        </div>
      </motion.div>

      <motion.p
        className="text-textSecondaryLight"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        Your personal safety plan helps you recognize when you need support and know who to reach out to. All changes are saved automatically.
      </motion.p>

      <div className="space-y-4">
        <AccordionSection
          title="Warning Signs"
          description="What I notice in my body, thoughts, or behavior"
          icon={<AlertTriangle className="w-5 h-5 text-teal" />}
          isOpen={openSections.has('warningSigns')}
          onToggle={() => toggleSection('warningSigns')}
        >
          <ArrayEditor
            items={planData.warningSigns}
            onAdd={() => handleArrayAdd('warningSigns')}
            onRemove={(i) => handleArrayRemove('warningSigns', i)}
            onChange={(i, v) => handleArrayChange('warningSigns', i, v)}
            placeholder="e.g., racing thoughts, trouble sleeping, feeling numb..."
          />
        </AccordionSection>

        <AccordionSection
          title="Coping Steps"
          description="3-10 actions that help me feel better"
          icon={<Wind className="w-5 h-5 text-teal" />}
          isOpen={openSections.has('copingSteps')}
          onToggle={() => toggleSection('copingSteps')}
        >
          <ArrayEditor
            items={planData.copingSteps}
            onAdd={() => handleArrayAdd('copingSteps')}
            onRemove={(i) => handleArrayRemove('copingSteps', i)}
            onChange={(i, v) => handleArrayChange('copingSteps', i, v)}
            placeholder="e.g., deep breathing, go for a walk, listen to music..."
          />
        </AccordionSection>

        <AccordionSection
          title="Safe Places"
          description="Locations that help me feel calm and secure"
          icon={<MapPin className="w-5 h-5 text-teal" />}
          isOpen={openSections.has('safePlaces')}
          onToggle={() => toggleSection('safePlaces')}
        >
          <ArrayEditor
            items={planData.safePlaces}
            onAdd={() => handleArrayAdd('safePlaces')}
            onRemove={(i) => handleArrayRemove('safePlaces', i)}
            onChange={(i, v) => handleArrayChange('safePlaces', i, v)}
            placeholder="e.g., my room, the park, library..."
          />
        </AccordionSection>

        <AccordionSection
          title="Trusted Contacts"
          description="People I can reach out to for support"
          icon={<Users className="w-5 h-5 text-teal" />}
          isOpen={openSections.has('trustedContacts')}
          onToggle={() => toggleSection('trustedContacts')}
        >
          <div className="space-y-4">
            {planData.trustedContacts.map((contact, index) => (
              <div key={index} className="p-3 bg-surface rounded-lg border border-borderMutedLight/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-deepSage">Contact {index + 1}</span>
                  <button
                    onClick={() => handleContactRemove(index)}
                    className="p-1 text-coral hover:bg-coral/10 rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={contact.name}
                    onChange={(e) => handleContactChange(index, 'name', e.target.value)}
                    placeholder="Name"
                    className="px-3 py-2 bg-cream border border-borderMutedLight rounded-lg text-deepSage placeholder:text-textSecondaryLight/50 focus:outline-none focus:ring-2 focus:ring-teal/30 text-sm"
                  />
                  <input
                    type="tel"
                    value={contact.phone}
                    onChange={(e) => handleContactChange(index, 'phone', e.target.value)}
                    placeholder="Phone"
                    className="px-3 py-2 bg-cream border border-borderMutedLight rounded-lg text-deepSage placeholder:text-textSecondaryLight/50 focus:outline-none focus:ring-2 focus:ring-teal/30 text-sm"
                  />
                </div>
                <input
                  type="text"
                  value={contact.relationship}
                  onChange={(e) => handleContactChange(index, 'relationship', e.target.value)}
                  placeholder="Relationship (e.g., friend, aunt, counselor)"
                  className="w-full px-3 py-2 bg-cream border border-borderMutedLight rounded-lg text-deepSage placeholder:text-textSecondaryLight/50 focus:outline-none focus:ring-2 focus:ring-teal/30 text-sm"
                />
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleContactChange(index, 'preferredMethod', 'call')}
                    className={`flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      contact.preferredMethod === 'call'
                        ? 'bg-teal text-white'
                        : 'bg-sage/10 text-textSecondaryLight hover:bg-sage/20'
                    }`}
                  >
                    <Phone className="w-4 h-4" />
                    <span>Call</span>
                  </button>
                  <button
                    onClick={() => handleContactChange(index, 'preferredMethod', 'text')}
                    className={`flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      contact.preferredMethod === 'text'
                        ? 'bg-teal text-white'
                        : 'bg-sage/10 text-textSecondaryLight hover:bg-sage/20'
                    }`}
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Text</span>
                  </button>
                </div>
              </div>
            ))}
            {planData.trustedContacts.length < 5 && (
              <button
                onClick={handleContactAdd}
                className="flex items-center space-x-2 text-teal hover:text-teal/80 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm">Add trusted contact</span>
              </button>
            )}
          </div>
        </AccordionSection>

        <AccordionSection
          title="Professional Support"
          description="Counselors, therapists, and crisis lines"
          icon={<Phone className="w-5 h-5 text-teal" />}
          isOpen={openSections.has('professionalSupport')}
          onToggle={() => toggleSection('professionalSupport')}
        >
          <div className="space-y-4">
            <button
              onClick={() => setShowCrisisSheet(true)}
              className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-coral/10 text-coral rounded-lg hover:bg-coral/20 transition-colors font-medium"
            >
              <Phone className="w-5 h-5" />
              <span>View Crisis Support Lines</span>
            </button>
            
            <div className="pt-2 border-t border-borderMutedLight/50">
              <p className="text-sm text-textSecondaryLight mb-3">Add your own professional contacts:</p>
              {planData.professionalSupport.map((support, index) => (
                <div key={index} className="p-3 bg-surface rounded-lg border border-borderMutedLight/50 space-y-2 mb-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-deepSage">Support {index + 1}</span>
                    <button
                      onClick={() => handleProfessionalRemove(index)}
                      className="p-1 text-coral hover:bg-coral/10 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={support.name}
                      onChange={(e) => handleProfessionalChange(index, 'name', e.target.value)}
                      placeholder="Name/Organization"
                      className="px-3 py-2 bg-cream border border-borderMutedLight rounded-lg text-deepSage placeholder:text-textSecondaryLight/50 focus:outline-none focus:ring-2 focus:ring-teal/30 text-sm"
                    />
                    <input
                      type="tel"
                      value={support.phone}
                      onChange={(e) => handleProfessionalChange(index, 'phone', e.target.value)}
                      placeholder="Phone"
                      className="px-3 py-2 bg-cream border border-borderMutedLight rounded-lg text-deepSage placeholder:text-textSecondaryLight/50 focus:outline-none focus:ring-2 focus:ring-teal/30 text-sm"
                    />
                  </div>
                  <input
                    type="text"
                    value={support.notes}
                    onChange={(e) => handleProfessionalChange(index, 'notes', e.target.value)}
                    placeholder="Notes (e.g., hours, specialty)"
                    className="w-full px-3 py-2 bg-cream border border-borderMutedLight rounded-lg text-deepSage placeholder:text-textSecondaryLight/50 focus:outline-none focus:ring-2 focus:ring-teal/30 text-sm"
                  />
                </div>
              ))}
              {planData.professionalSupport.length < 5 && (
                <button
                  onClick={handleProfessionalAdd}
                  className="flex items-center space-x-2 text-teal hover:text-teal/80 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-sm">Add professional support</span>
                </button>
              )}
            </div>
          </div>
        </AccordionSection>

        <AccordionSection
          title="Escalation Steps"
          description="What to do if things get worse"
          icon={<Sparkles className="w-5 h-5 text-teal" />}
          isOpen={openSections.has('escalationSteps')}
          onToggle={() => toggleSection('escalationSteps')}
        >
          <ArrayEditor
            items={planData.escalationSteps}
            onAdd={() => handleArrayAdd('escalationSteps')}
            onRemove={(i) => handleArrayRemove('escalationSteps', i)}
            onChange={(i, v) => handleArrayChange('escalationSteps', i, v)}
            placeholder="e.g., call my counselor, go to a safe place, call 911..."
          />
        </AccordionSection>

        <AccordionSection
          title="Notes for Others"
          description="How people can help support me"
          icon={<FileText className="w-5 h-5 text-teal" />}
          isOpen={openSections.has('notesForOthers')}
          onToggle={() => toggleSection('notesForOthers')}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-deepSage mb-1">What helps me</label>
              <textarea
                value={planData.notesForOthers.whatHelps}
                onChange={(e) => handleNotesChange('whatHelps', e.target.value)}
                placeholder="e.g., quiet space, someone to listen, being distracted..."
                rows={3}
                className="w-full px-3 py-2 bg-surface border border-borderMutedLight rounded-lg text-deepSage placeholder:text-textSecondaryLight/50 focus:outline-none focus:ring-2 focus:ring-teal/30 resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-deepSage mb-1">What doesn't help</label>
              <textarea
                value={planData.notesForOthers.whatDoesntHelp}
                onChange={(e) => handleNotesChange('whatDoesntHelp', e.target.value)}
                placeholder="e.g., being asked lots of questions, crowded spaces..."
                rows={3}
                className="w-full px-3 py-2 bg-surface border border-borderMutedLight rounded-lg text-deepSage placeholder:text-textSecondaryLight/50 focus:outline-none focus:ring-2 focus:ring-teal/30 resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-deepSage mb-1">How to support me</label>
              <textarea
                value={planData.notesForOthers.howToSupport}
                onChange={(e) => handleNotesChange('howToSupport', e.target.value)}
                placeholder="e.g., just sit with me, remind me this will pass..."
                rows={3}
                className="w-full px-3 py-2 bg-surface border border-borderMutedLight rounded-lg text-deepSage placeholder:text-textSecondaryLight/50 focus:outline-none focus:ring-2 focus:ring-teal/30 resize-none"
              />
            </div>
          </div>
        </AccordionSection>
      </div>

      <motion.div
        className="fixed bottom-20 left-0 right-0 px-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <button
          onClick={() => setShowCrisisSheet(true)}
          className="w-full bg-coral text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:bg-coral/90 transition-colors flex items-center justify-center space-x-2"
        >
          <Phone className="w-5 h-5" />
          <span>Need Help Now? Crisis Support</span>
        </button>
      </motion.div>

      <CrisisSheet open={showCrisisSheet} onClose={() => setShowCrisisSheet(false)} />
      <SafetyPlanShareModal open={showShareModal} onClose={() => setShowShareModal(false)} />
    </div>
  );
}
