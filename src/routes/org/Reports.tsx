import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Download,
  FileSpreadsheet,
  Users,
  Send,
  Calendar,
  CheckCircle,
  Loader2
} from 'lucide-react';

interface ExportOption {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  endpoint: string;
  filename: string;
}

const exportOptions: ExportOption[] = [
  {
    id: 'referrals',
    title: 'Referrals Export',
    description: 'All referrals with status, dates, and outcomes',
    icon: <Send className="w-6 h-6" />,
    endpoint: '/api/org/referrals/export',
    filename: 'referrals'
  },
  {
    id: 'attendance',
    title: 'Attendance Export',
    description: 'Program attendance records with timestamps',
    icon: <Calendar className="w-6 h-6" />,
    endpoint: '/api/org/attendance/export',
    filename: 'attendance'
  },
  {
    id: 'programs',
    title: 'Programs Export',
    description: 'All programs with details and metrics',
    icon: <FileSpreadsheet className="w-6 h-6" />,
    endpoint: '/api/org/programs/export',
    filename: 'programs'
  },
  {
    id: 'participants',
    title: 'Participants Export',
    description: 'Unique participants across all programs',
    icon: <Users className="w-6 h-6" />,
    endpoint: '/api/org/participants/export',
    filename: 'participants'
  }
];

export default function Reports() {
  const [downloading, setDownloading] = useState<string | null>(null);
  const [completed, setCompleted] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async (option: ExportOption) => {
    try {
      setDownloading(option.id);
      setError(null);
      
      const response = await fetch(option.endpoint, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Export failed');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${option.filename}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      setCompleted(prev => [...prev, option.id]);
      setTimeout(() => {
        setCompleted(prev => prev.filter(id => id !== option.id));
      }, 3000);
    } catch (err) {
      console.error('Export error:', err);
      setError(`Failed to export ${option.title.toLowerCase()}`);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link to="/org/dashboard" className="text-gray-500 hover:text-gray-700">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-semibold text-gray-900">Reports & Exports</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {error}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Data Exports</h2>
            <p className="text-sm text-gray-500 mt-1">
              Download your organization's data in CSV format for reporting and analysis.
            </p>
          </div>

          <div className="divide-y divide-gray-200">
            {exportOptions.map((option) => {
              const isDownloading = downloading === option.id;
              const isCompleted = completed.includes(option.id);
              
              return (
                <motion.div
                  key={option.id}
                  className="p-6 flex items-center gap-4 hover:bg-gray-50 transition-colors"
                >
                  <div className={`p-3 rounded-lg ${
                    isCompleted ? 'bg-green-100 text-green-600' : 'bg-teal/10 text-teal'
                  }`}>
                    {isCompleted ? <CheckCircle className="w-6 h-6" /> : option.icon}
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{option.title}</h3>
                    <p className="text-sm text-gray-500">{option.description}</p>
                  </div>
                  
                  <button
                    onClick={() => handleExport(option)}
                    disabled={isDownloading}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                      isCompleted
                        ? 'bg-green-100 text-green-700'
                        : 'bg-teal text-white hover:bg-teal/90'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {isDownloading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Exporting...
                      </>
                    ) : isCompleted ? (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Downloaded
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        Export CSV
                      </>
                    )}
                  </button>
                </motion.div>
              );
            })}
          </div>
        </div>

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="font-medium text-blue-900 mb-2">Need custom reports?</h3>
          <p className="text-sm text-blue-700">
            Contact the Room XI team if you need custom data exports or reporting formats
            for grant applications or funder requirements.
          </p>
        </div>
      </main>
    </div>
  );
}
