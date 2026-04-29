/**
 * Canonical pilot parent consent wallet.
 *
 * Shows (a) pending consent requests and (b) signed receipts for the
 * logged-in parent. Data source is the canonical pilot consent engine:
 *   GET /api/pilot/consent/requests
 *   GET /api/pilot/consent/wallet
 *
 * Per SOT LOCKED RULES, parent portal scope is consent wallet only — no
 * youth program names, no schedule, no attendance, no mood, no support,
 * no referral details outside consent scope, no Ximi data.
 */

import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '@/lib/api';

interface ConsentRequest {
  id: string;
  status: string;
  templateName: string;
  templateType: string;
  templateDescription: string | null;
  youthName: string;
  createdAt: string | null;
  expiresAt: string | null;
}

interface ConsentReceipt {
  receiptId: string;
  requestId: string;
  templateName: string;
  templateType: string;
  youthName: string;
  signedAt: string | null;
  withdrawnAt: string | null;
  isActive: boolean;
}

type TabKey = 'pending' | 'signed' | 'all';

export default function PilotParentWallet() {
  const [tab, setTab] = useState<TabKey>('pending');
  const [requests, setRequests] = useState<ConsentRequest[]>([]);
  const [receipts, setReceipts] = useState<ConsentReceipt[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [reqRes, recRes] = await Promise.all([
        api.pilotConsent.getRequests(tab),
        api.pilotConsent.getWallet(),
      ]);
      if (reqRes.error) throw new Error(reqRes.error);
      if (recRes.error) throw new Error(recRes.error);
      setRequests(
        ((reqRes.data as { requests?: ConsentRequest[] } | null)?.requests) || []
      );
      setReceipts(
        ((recRes.data as { wallet?: ConsentReceipt[] } | null)?.wallet) || []
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load wallet.');
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <main className="max-w-2xl mx-auto p-4 sm:p-6">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold">Consent wallet</h1>
        <p className="text-sm text-neutral-600 mt-1">
          Review and respond to consent requests for your child. This portal
          shows consent activity only.
        </p>
      </header>

      <div
        role="tablist"
        aria-label="Consent request filter"
        className="flex gap-1 border-b mb-4"
      >
        {(['pending', 'signed', 'all'] as TabKey[]).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            data-testid={`tab-${t}`}
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-sm border-b-2 -mb-px focus:outline-none focus:ring-2 focus:ring-offset-1 ${
              tab === t
                ? 'border-rose-600 text-rose-700 font-medium'
                : 'border-transparent text-neutral-600 hover:text-neutral-900'
            }`}
          >
            {t === 'pending' ? 'Pending' : t === 'signed' ? 'Signed' : 'All'}
          </button>
        ))}
      </div>

      {error && (
        <div role="alert" className="mb-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-neutral-500">Loading…</p>
      ) : (
        <>
          <section aria-labelledby="requests-heading" className="mb-8">
            <h2 id="requests-heading" className="sr-only">
              Consent requests
            </h2>
            {requests.length === 0 ? (
              <p
                data-testid="text-no-requests"
                className="text-sm text-neutral-500"
              >
                No {tab === 'all' ? '' : tab} consent requests.
              </p>
            ) : (
              <ul className="space-y-2">
                {requests.map((r) => (
                  <li
                    key={r.id}
                    className="border rounded p-3 bg-white hover:bg-neutral-50"
                  >
                    <Link
                      to={`/parent/consent/${r.id}`}
                      data-testid={`link-request-${r.id}`}
                      className="block focus:outline-none focus:ring-2 focus:ring-rose-500 rounded"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{r.templateName}</p>
                          <p className="text-xs text-neutral-600">
                            For {r.youthName} · {r.templateType}
                          </p>
                        </div>
                        <StatusPill status={r.status} />
                      </div>
                      {r.expiresAt && r.status === 'pending' && (
                        <p className="text-xs text-neutral-500 mt-2">
                          Expires {new Date(r.expiresAt).toLocaleDateString()}
                        </p>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="receipts-heading">
            <h2
              id="receipts-heading"
              className="text-sm font-medium text-neutral-700 mb-2"
            >
              Receipts
            </h2>
            {receipts.length === 0 ? (
              <p
                data-testid="text-no-receipts"
                className="text-sm text-neutral-500"
              >
                No signed consent receipts yet.
              </p>
            ) : (
              <ul className="space-y-2">
                {receipts.map((r) => (
                  <li
                    key={r.receiptId}
                    data-testid={`receipt-${r.receiptId}`}
                    className="border rounded p-3 bg-white"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{r.templateName}</p>
                        <p className="text-xs text-neutral-600">
                          For {r.youthName} · Signed{' '}
                          {r.signedAt
                            ? new Date(r.signedAt).toLocaleDateString()
                            : '—'}
                        </p>
                        {r.withdrawnAt && (
                          <p className="text-xs text-amber-700 mt-1">
                            Withdrawn{' '}
                            {new Date(r.withdrawnAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      {r.isActive ? (
                        <Link
                          to={`/parent/consent/${r.requestId}`}
                          data-testid={`link-manage-${r.receiptId}`}
                          className="text-xs underline text-rose-700"
                        >
                          Manage
                        </Link>
                      ) : (
                        <span className="text-xs text-neutral-500">
                          Inactive
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </main>
  );
}

function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-800',
    signed: 'bg-emerald-100 text-emerald-800',
    declined: 'bg-neutral-200 text-neutral-700',
    withdrawn: 'bg-neutral-200 text-neutral-700',
    expired: 'bg-neutral-200 text-neutral-700',
  };
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full ${
        styles[status] || 'bg-neutral-200 text-neutral-700'
      }`}
    >
      {status}
    </span>
  );
}
