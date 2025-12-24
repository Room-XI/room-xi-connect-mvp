import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useSession } from '@/lib/session';

interface MatureMinorStatus {
  assessmentRequired: boolean;
  reason?: string;
  assessmentCompleted?: boolean;
  completedAt?: string;
  meetsCapacityCriteria?: boolean;
  withdrawnAt?: string;
}

interface AssessmentQuestion {
  id: string;
  text: string;
  description: string;
  type: string;
}

interface AssessmentResponse {
  answer: 'yes' | 'no' | 'unsure';
  explanation?: string;
}

interface SubmitResult {
  success: boolean;
  assessmentId?: string;
  assessmentScore?: number;
  meetsCapacityCriteria?: boolean;
  message?: string;
}

export function useMatureMinorAssessment() {
  const { isAuthenticated, loading: sessionLoading } = useSession();
  const [status, setStatus] = useState<MatureMinorStatus | null>(null);
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkStatus = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const response = await api.consent.matureMinor.getStatus();
      if (response.data) {
        setStatus(response.data);
      }
    } catch (err) {
      console.error('Error checking mature minor status:', err);
      setError('Failed to check assessment status');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const fetchQuestions = useCallback(async () => {
    try {
      const response = await api.consent.matureMinor.getQuestions();
      if (response.data?.questions) {
        setQuestions(response.data.questions);
      }
    } catch (err) {
      console.error('Error fetching questions:', err);
      setError('Failed to load assessment questions');
    }
  }, []);

  const submitAssessment = useCallback(async (
    responses: Record<string, AssessmentResponse>
  ): Promise<SubmitResult | null> => {
    try {
      setSubmitting(true);
      setError(null);
      const response = await api.consent.matureMinor.submit(responses);
      if (response.data) {
        setStatus(prev => prev ? {
          ...prev,
          assessmentRequired: false,
          assessmentCompleted: true,
          meetsCapacityCriteria: response.data.meetsCapacityCriteria,
        } : null);
        return response.data;
      }
      return null;
    } catch (err) {
      console.error('Error submitting assessment:', err);
      setError('Failed to submit assessment');
      return null;
    } finally {
      setSubmitting(false);
    }
  }, []);

  useEffect(() => {
    // Only call checkStatus once session loading is complete
    if (!sessionLoading) {
      checkStatus();
    }
  }, [sessionLoading, checkStatus]);

  useEffect(() => {
    if (status?.assessmentRequired) {
      fetchQuestions();
    }
  }, [status?.assessmentRequired, fetchQuestions]);

  return {
    status,
    questions,
    loading,
    submitting,
    error,
    checkStatus,
    submitAssessment,
    assessmentRequired: status?.assessmentRequired ?? false,
  };
}
