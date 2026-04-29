/**
 * Canonical pilot parent consent — request detail with sign/decline/withdraw.
 *
 * Backed by /api/pilot/consent/requests/:id/{sign,decline,withdraw}.
 * No youth program details, schedule, attendance, mood, or Ximi data
 * are exposed here — only the consent template body and decision flow.
 */

import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '@/lib/api';

interface ConsentRequestDetail {
  id: string;
  status: string;
  templateName: string;
  templateType: string;
  templateDescription: string | null;
  templateBody: string | null;
  templateVersion: number | null;
  youthName: string;
  createdAt: string | null;
  expiresAt: string | null;
}

export default function PilotParentRequestDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [request, setRequest] = useState<ConsentRequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      // Fetch via the 'all' list, then find by id. Keeps the parent portal
      // strictly on the canonical list surface; the consent engine does not
      // expose a single-request GET today.
      const { data, error: apiError } = await api.pilotConsent.getRequests('all');
      if (apiError) throw new Error(apiError);
      const match =
        ((data as { requests?: ConsentRequestDetail[] } | null)?.requests || []).find(
          (r) => r.id === id
        ) || null;
      if (!match) throw new Error('Consent request not found.');
      setRequest(match);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load request.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function act(kind: 'sign' | 'decline' | 'withdraw') {
    if (!id) return;
    setSubmitting(true);
    setError(null);
    setInfo(null);
    try {
      const call =
        kind === 'sign'
          ? api.pilotConsent.signRequest(id)
          : kind === 'decline'
          ? api.pilotConsent.declineRequest(id, reason || undefined)
          : api.pilotConsent.withdrawRequest(id, reason || undefined);
      const { data, error: apiError } = await call;
      if (apiError) throw new Error(apiError);
      setInfo(
        (data as { message?: string } | null)?.message || 'Done.'
      );
      // Refresh to reflect new status
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Action failed.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="max-w-2xl mx-auto p-6">
        <p className="text-sm text-neutral-500">Loading…</p>
      </main>
    );
  }

  if (!request) {
    return (
      <main className="max-w-2xl mx-auto p-6">
        <Link to="/parent/wallet" className="text-sm underline">
          ← Back to wallet
        </Link>
        <p role="alert" className="mt-3 text-sm text-red-700">
          {error || 'Consent request not found.'}
        </p>
      </main>
    );
  }

  const isPending = request.status === 'pending';
  const isSigned = request.status === 'signed';

  return (
    <main className="max-w-2xl mx-auto p-4 sm:p-6">
      <Link
        to="/parent/wallet"
        data-testid="link-back"
        className="text-sm underline text-neutral-700"
      >
        ← Back to wallet
      </Link>

      <header className="mt-3 mb-4">
        <h1 className="text-2xl font-semibold">{request.templateName}</h1>
        <p className="text-sm text-neutral-600">
          For {request.youthName} · {request.templateType} · v
          {request.templateVersion ?? 1}
        </p>
        <p className="text-xs text-neutral-500 mt-1">
          Status: <span data-testid="text-status">{request.status}</span>
          {request.expiresAt && isPending && (
            <>
              {' · Expires '}
              {new Date(request.expiresAt).toLocaleDateString()}
            </>
          )}
        </p>
      </header>

      {request.templateDescription && (
        <p className="text-sm text-neutral-700 mb-3">
          {request.templateDescription}
        </p>
      )}

      {request.templateBody && (
        <section
          aria-label="Consent text"
          data-testid="text-template-body"
          className="text-sm whitespace-pre-wrap border rounded p-3 bg-neutral-50 mb-4 max-h-80 overflow-y-auto"
        >
          {request.templateBody}
        </section>
      )}

      {error && (
        <p role="alert" data-testid="text-error" className="text-sm text-red-700 mb-2">
          {error}
        </p>
      )}
      {info && (
        <p role="status" data-testid="text-info" className="text-sm text-emerald-700 mb-2">
          {info}
        </p>
      )}

      {isPending && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => act('sign')}
            disabled={submitting}
            data-testid="button-sign"
            className="w-full rounded bg-emerald-600 text-white py-2 disabled:opacity-50"
          >
            {submitting ? 'Working…' : 'Sign consent'}
          </button>

          <label className="block">
            <span className="text-xs text-neutral-600">
              Optional reason (if declining)
            </span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              maxLength={500}
              data-testid="input-reason"
              className="w-full border rounded px-2 py-1 text-sm mt-1"
            />
          </label>

          <button
            type="button"
            onClick={() => act('decline')}
            disabled={submitting}
            data-testid="button-decline"
            className="w-full rounded border border-neutral-400 text-neutral-800 py-2 disabled:opacity-50"
          >
            Decline
          </button>
        </div>
      )}

      {isSigned && (
        <div className="space-y-3">
          <p className="text-sm text-neutral-700">
            This consent is currently active. You may withdraw it at any time;
            this will cancel any pending or confirmed RSVPs tied to it.
          </p>
          <label className="block">
            <span className="text-xs text-neutral-600">
              Optional reason for withdrawal
            </span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              maxLength={500}
              data-testid="input-reason"
              className="w-full border rounded px-2 py-1 text-sm mt-1"
            />
          </label>
          <button
            type="button"
            onClick={() => act('withdraw')}
            disabled={submitting}
            data-testid="button-withdraw"
            className="w-full rounded bg-amber-700 text-white py-2 disabled:opacity-50"
          >
            {submitting ? 'Working…' : 'Withdraw consent'}
          </button>
        </div>
      )}

      {!isPending && !isSigned && (
        <p className="text-sm text-neutral-600">
          This request is {request.status}. No further actions available.
        </p>
      )}

      <button
        type="button"
        onClick={() => navigate('/parent/wallet')}
        className="mt-6 text-xs underline text-neutral-600"
      >
        Return to wallet
      </button>
    </main>
  );
}
