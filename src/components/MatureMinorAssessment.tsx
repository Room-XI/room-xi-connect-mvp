import { useState } from 'react';
import { useMatureMinorAssessment } from '@/hooks/useMatureMinorAssessment';
import { Shield, AlertCircle, CheckCircle, HelpCircle, Phone, Info, X } from 'lucide-react';

interface MatureMinorAssessmentProps {
  onComplete?: (result: { meetsCapacityCriteria: boolean; assessmentScore: number }) => void;
  onClose?: () => void;
}

interface Response {
  answer: 'yes' | 'no' | 'unsure' | null;
  explanation: string;
}

export default function MatureMinorAssessment({ onComplete, onClose }: MatureMinorAssessmentProps) {
  const { questions, submitting, error, submitAssessment } = useMatureMinorAssessment();
  const [currentStep, setCurrentStep] = useState(0);
  const [responses, setResponses] = useState<Record<string, Response>>({});
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState<{ meetsCapacityCriteria: boolean; assessmentScore: number; message: string } | null>(null);

  const currentQuestion = questions[currentStep];
  const currentResponse = currentQuestion ? responses[currentQuestion.id] : null;
  const isAnswered = currentResponse?.answer !== null && currentResponse?.answer !== undefined;
  const isLastQuestion = currentStep === questions.length - 1;

  const handleAnswer = (answer: 'yes' | 'no' | 'unsure') => {
    if (!currentQuestion) return;
    setResponses(prev => ({
      ...prev,
      [currentQuestion.id]: {
        answer,
        explanation: prev[currentQuestion.id]?.explanation || '',
      },
    }));
  };

  const handleExplanation = (explanation: string) => {
    if (!currentQuestion) return;
    setResponses(prev => ({
      ...prev,
      [currentQuestion.id]: {
        ...prev[currentQuestion.id],
        explanation,
      },
    }));
  };

  const handleNext = () => {
    if (isLastQuestion) {
      handleSubmit();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(0, prev - 1));
  };

  const handleSubmit = async () => {
    const formattedResponses = Object.entries(responses).reduce((acc, [key, value]) => ({
      ...acc,
      [key]: {
        answer: value.answer,
        explanation: value.explanation || undefined,
      },
    }), {});

    const submitResult = await submitAssessment(formattedResponses);
    if (submitResult) {
      setResult({
        meetsCapacityCriteria: submitResult.meetsCapacityCriteria || false,
        assessmentScore: submitResult.assessmentScore || 0,
        message: submitResult.message || '',
      });
      setShowResult(true);
      if (onComplete) {
        onComplete({
          meetsCapacityCriteria: submitResult.meetsCapacityCriteria || false,
          assessmentScore: submitResult.assessmentScore || 0,
        });
      }
    }
  };

  if (questions.length === 0) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl p-6 max-w-md w-full">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-8 h-8 border-4 border-teal border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-center text-textSecondaryLight">Loading assessment...</p>
        </div>
      </div>
    );
  }

  if (showResult && result) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl p-6 max-w-md w-full">
          <div className="flex items-center justify-center mb-4">
            {result.meetsCapacityCriteria ? (
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
            ) : (
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
                <HelpCircle className="w-10 h-10 text-amber-600" />
              </div>
            )}
          </div>
          
          <h2 className="text-xl font-bold text-center mb-2">
            {result.meetsCapacityCriteria ? 'Assessment Complete' : 'Thank You'}
          </h2>
          
          <p className="text-center text-textSecondaryLight mb-4">
            {result.message}
          </p>

          <div className="bg-slate-50 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2 text-sm text-textSecondaryLight">
              <Info className="w-4 h-4" />
              <span>Score: {result.assessmentScore}%</span>
            </div>
          </div>

          {!result.meetsCapacityCriteria && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-800">Need Support?</p>
                  <p className="text-sm text-amber-700 mt-1">
                    If you need to talk to someone, call <strong>988</strong> (Suicide & Crisis Lifeline) 
                    or visit the crisis resources in the app.
                  </p>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={onClose}
            className="w-full py-3 bg-teal text-white font-semibold rounded-lg hover:bg-teal/90 transition-colors"
          >
            Continue to App
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-borderMutedLight p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-teal" />
              <h2 className="font-bold text-lg">Understanding Assessment</h2>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="p-1 hover:bg-slate-100 rounded-full transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
          <div className="flex gap-1">
            {questions.map((_, index) => (
              <div
                key={index}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  index <= currentStep ? 'bg-teal' : 'bg-slate-200'
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-textSecondaryLight mt-2">
            Question {currentStep + 1} of {questions.length}
          </p>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">{currentQuestion?.text}</h3>
            <p className="text-textSecondaryLight text-sm">{currentQuestion?.description}</p>
          </div>

          <div className="space-y-3 mb-6">
            {['yes', 'no', 'unsure'].map((option) => (
              <button
                key={option}
                onClick={() => handleAnswer(option as 'yes' | 'no' | 'unsure')}
                className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                  currentResponse?.answer === option
                    ? 'border-teal bg-teal/5'
                    : 'border-borderMutedLight hover:border-teal/50'
                }`}
              >
                <span className="font-medium capitalize">{option}</span>
              </button>
            ))}
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium mb-2 text-textSecondaryLight">
              Would you like to explain your answer? (Optional)
            </label>
            <textarea
              value={currentResponse?.explanation || ''}
              onChange={(e) => handleExplanation(e.target.value)}
              placeholder="Share any thoughts or questions..."
              className="w-full p-3 border border-borderMutedLight rounded-lg resize-none h-24 focus:outline-none focus:ring-2 focus:ring-teal/50 focus:border-teal"
            />
          </div>

          <div className="flex gap-3">
            {currentStep > 0 && (
              <button
                onClick={handleBack}
                className="flex-1 py-3 border border-borderMutedLight rounded-lg font-medium hover:bg-slate-50 transition-colors"
              >
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              disabled={!isAnswered || submitting}
              className={`flex-1 py-3 rounded-lg font-semibold transition-colors ${
                isAnswered && !submitting
                  ? 'bg-teal text-white hover:bg-teal/90'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Submitting...
                </span>
              ) : isLastQuestion ? (
                'Submit Assessment'
              ) : (
                'Next'
              )}
            </button>
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t border-borderMutedLight">
          <div className="flex items-start gap-2 text-sm text-textSecondaryLight">
            <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p>
              This assessment documents your understanding of the app. Your responses 
              are recorded for legal compliance purposes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
