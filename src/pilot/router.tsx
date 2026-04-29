/**
 * Canonical Pilot Router.
 *
 * Single source of truth for the youth + parent app route tree under
 * `PILOT_MODE`. The legacy `src/router.tsx` toggle has been removed (T037);
 * `src/main.tsx` mounts this router unconditionally.
 *
 * Pilot scope today:
 * - Youth: home, explore, programs, schedule, attendance pass, mood/safety,
 *   referrals, intake, settings, optional support inbox (flag-gated).
 * - Parent: magic-link auth + canonical consent wallet + minimal portal
 *   (children + documents + settings). Everything outside the consent
 *   wallet is server-gated by `pilotDataGate`.
 * - Public: home/explore/program detail, about, terms, privacy, safety
 *   resources, guardian + safety-plan token landings.
 *
 * Out of scope: legacy admin / org / youth-worker portals, the demo hub,
 * gamification (XiP, Achievements), Transparency dashboard, and Privacy
 * Center — all retired by T033.
 */

import { createBrowserRouter, Navigate, type RouteObject } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import App from '../shell/App';
import ErrorBoundary from '../ui/ErrorBoundary';
import RequireAuth from '../components/RequireAuth';
import RequireParentSession from '../components/RequireParentSession';
import { ENABLE_SUPPORT_INBOX } from '../lib/pilotFlags';

const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-cream" role="status" aria-live="polite" aria-label="Loading content">
    <div className="w-12 h-12 border-4 border-teal border-t-transparent rounded-full animate-spin" aria-hidden="true" />
    <span className="sr-only">Loading</span>
  </div>
);

const Home = lazy(() => import('../routes/Home'));
const Explore = lazy(() => import('../routes/Explore'));
const Events = lazy(() => import('../routes/Events'));
const QRScan = lazy(() => import('../routes/QRScan'));
const Me = lazy(() => import('../routes/Me'));
const ProgramDetail = lazy(() => import('../routes/ProgramDetail'));
const Settings = lazy(() => import('../routes/Settings'));
const NotFound = lazy(() => import('../routes/NotFound'));
const Login = lazy(() => import('../routes/auth/Login'));
const UpdatePassword = lazy(() => import('../routes/auth/UpdatePassword'));
const VerifyEmail = lazy(() => import('../routes/auth/VerifyEmail'));
const SafetyProfile = lazy(() => import('../routes/SafetyProfile'));
const SafetyResources = lazy(() => import('../routes/SafetyResources'));
const SafetyPlan = lazy(() => import('../routes/SafetyPlan'));
const SafetyPlanShare = lazy(() => import('../routes/SafetyPlanShare'));
const Safety = lazy(() => import('../routes/Safety'));
const About = lazy(() => import('../routes/About'));
const TermsOfService = lazy(() => import('../routes/TermsOfService'));
const PrivacyPolicy = lazy(() => import('../routes/PrivacyPolicy'));
const CheckInHistory = lazy(() => import('../routes/CheckInHistory'));
const SavedPrograms = lazy(() => import('../routes/SavedPrograms'));
const VerifyConsent = lazy(() => import('../routes/VerifyConsent'));
const GuardianVerify = lazy(() => import('../routes/GuardianVerify'));
const Intake = lazy(() => import('../routes/Intake'));
const SupportRequest = lazy(() => import('../routes/SupportRequest'));

const ReferralInbox = lazy(() => import('../routes/ReferralInbox'));

const ParentLayout = lazy(() => import('../routes/parent/ParentLayout'));
const ParentPortal = lazy(() => import('../routes/ParentPortal'));
const ParentMyChildren = lazy(() => import('../routes/parent/MyChildren'));
const ParentDocuments = lazy(() => import('../routes/parent/Documents'));
const ParentLogin = lazy(() => import('../routes/ParentLogin'));
const ParentAcceptInvite = lazy(() => import('../routes/ParentAcceptInvite'));
const ParentSettings = lazy(() => import('../routes/parent/ParentSettings'));
const PilotParentWallet = lazy(() => import('./routes/parent/Wallet'));
const PilotParentRequestDetail = lazy(() => import('./routes/parent/RequestDetail'));

const PrivacySummary = lazy(() => import('../routes/PrivacySummary'));
const CrisisPolicy = lazy(() => import('../routes/CrisisPolicy'));
const Schedule = lazy(() => import('../routes/Schedule'));
const AttendancePassPage = lazy(() => import('../routes/AttendancePass'));
const More = lazy(() => import('../routes/More'));
const RootRedirect = lazy(() => import('../components/RootRedirect'));

const withSuspense = (Component: React.LazyExoticComponent<any>) => (
  <Suspense fallback={<LoadingFallback />}>
    <Component />
  </Suspense>
);

const withProtectedSuspense = (Component: React.LazyExoticComponent<any>) => (
  <Suspense fallback={<LoadingFallback />}>
    <RequireAuth>
      <Component />
    </RequireAuth>
  </Suspense>
);

const withParentSuspense = (Component: React.LazyExoticComponent<any>) => (
  <Suspense fallback={<LoadingFallback />}>
    <RequireParentSession>
      <Component />
    </RequireParentSession>
  </Suspense>
);

export function buildPilotRouteChildren(): RouteObject[] {
  return [
    { index: true, element: withSuspense(RootRedirect) },
    { path: 'home', element: withProtectedSuspense(Home) },
    { path: 'explore', element: withSuspense(Explore) },
    { path: 'explore/:view', element: withSuspense(Explore) },
    { path: 'events', element: withSuspense(Events) },
    { path: 'program/:id', element: withSuspense(ProgramDetail) },
    { path: 'qr', element: withProtectedSuspense(QRScan) },
    { path: 'me', element: withProtectedSuspense(Me) },
    { path: 'safety-profile', element: withProtectedSuspense(SafetyProfile) },
    { path: 'safety-resources', element: withSuspense(SafetyResources) },
    { path: 'safety-plan', element: withProtectedSuspense(SafetyPlan) },
    { path: 'safety-plan/share/:token', element: withSuspense(SafetyPlanShare) },
    { path: 'safety', element: withSuspense(Safety) },
    { path: 'settings', element: withProtectedSuspense(Settings) },
    { path: 'intake', element: withProtectedSuspense(Intake) },
    ...(ENABLE_SUPPORT_INBOX
      ? [{ path: 'support/request', element: withProtectedSuspense(SupportRequest) }]
      : []),

    { path: 'about', element: withSuspense(About) },
    { path: 'terms-of-service', element: withSuspense(TermsOfService) },
    { path: 'privacy-policy', element: withSuspense(PrivacyPolicy) },
    { path: 'privacy-summary', element: withSuspense(PrivacySummary) },
    { path: 'crisis-policy', element: withSuspense(CrisisPolicy) },
    { path: 'check-in-history', element: withProtectedSuspense(CheckInHistory) },
    { path: 'saved', element: withProtectedSuspense(SavedPrograms) },
    { path: 'saved-programs', element: <Navigate to="/saved" replace /> },
    { path: 'verify-consent/:token', element: withSuspense(VerifyConsent) },
    { path: 'guardian/verify/:token', element: withSuspense(GuardianVerify) },
    { path: 'referrals', element: withProtectedSuspense(ReferralInbox) },
    { path: 'referrals/:id', element: withProtectedSuspense(ReferralInbox) },
    { path: 'referral-inbox', element: <Navigate to="/referrals" replace /> },

    { path: 'parent/login', element: withSuspense(ParentLogin) },
    { path: 'parent/verify', element: withSuspense(ParentLogin) },
    { path: 'parent/accept/:token', element: withSuspense(ParentAcceptInvite) },
    {
      path: 'parent',
      element: withParentSuspense(ParentLayout),
      children: [
        { index: true, element: withSuspense(ParentPortal) },
        { path: 'dashboard', element: <Navigate to="/parent" replace /> },
        { path: 'children', element: withSuspense(ParentMyChildren) },
        { path: 'child/:id', element: withSuspense(ParentMyChildren) },
        { path: 'documents', element: withSuspense(ParentDocuments) },
        { path: 'wallet', element: withSuspense(PilotParentWallet) },
        { path: 'consent/:id', element: withSuspense(PilotParentRequestDetail) },
        { path: 'consent-center', element: <Navigate to="/parent/wallet" replace /> },
        { path: 'consent', element: <Navigate to="/parent/wallet" replace /> },
        { path: 'consent/requests', element: <Navigate to="/parent/wallet" replace /> },
        { path: 'settings', element: withSuspense(ParentSettings) },
      ],
    },

    { path: 'schedule', element: withProtectedSuspense(Schedule) },
    { path: 'attendance-pass', element: withProtectedSuspense(AttendancePassPage) },
    { path: 'more', element: withProtectedSuspense(More) },
    { path: 'auth/login', element: withSuspense(Login) },
    { path: 'auth/verify-email/:token', element: withSuspense(VerifyEmail) },
    { path: 'auth/update-password', element: withSuspense(UpdatePassword) },
    { path: '*', element: withSuspense(NotFound) },
  ];
}

const routerFutureFlags = {
  v7_relativeSplatPath: true,
  v7_fetcherPersist: true,
  v7_normalizeFormMethod: true,
  v7_partialHydration: true,
  v7_skipActionErrorRevalidation: true,
};

export const pilotRouter = createBrowserRouter(
  [
    {
      path: '/',
      element: <App />,
      errorElement: <ErrorBoundary />,
      children: buildPilotRouteChildren(),
    },
  ],
  { future: routerFutureFlags }
);
