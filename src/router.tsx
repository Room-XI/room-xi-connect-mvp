import { createBrowserRouter, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import App from './shell/App';
import ErrorBoundary from './ui/ErrorBoundary';
import RequireAuth from './components/RequireAuth';
import RequireAdminSession from './components/RequireAdminSession';
import RequireOrgAccess from './components/RequireOrgAccess';
import RequireParentSession from './components/RequireParentSession';
import RequireYouthWorkerSession from './components/RequireYouthWorkerSession';

// Loading fallback component
const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-cream">
    <div className="w-12 h-12 border-4 border-teal border-t-transparent rounded-full animate-spin" />
  </div>
);

// Lazy load routes to reduce initial bundle size
const Home = lazy(() => import('./routes/Home'));
const Explore = lazy(() => import('./routes/Explore'));
const Events = lazy(() => import('./routes/Events'));
const QRScan = lazy(() => import('./routes/QRScan'));
const Me = lazy(() => import('./routes/Me'));
const ProgramDetail = lazy(() => import('./routes/ProgramDetail'));
const Settings = lazy(() => import('./routes/Settings'));
const AdminLayout = lazy(() => import('./routes/admin/AdminLayout'));
const AdminOverview = lazy(() => import('./routes/admin/Overview'));
const AdminOrganizations = lazy(() => import('./routes/admin/Organizations'));
const AdminUsers = lazy(() => import('./routes/admin/Users'));
const AdminAuditLogs = lazy(() => import('./routes/admin/AuditLogs'));
const AdminCompliance = lazy(() => import('./routes/admin/Compliance'));
const AdminAIInterventions = lazy(() => import('./routes/admin/AIInterventions'));
const NotFound = lazy(() => import('./routes/NotFound'));
const Login = lazy(() => import('./routes/auth/Login'));
const Register = lazy(() => import('./routes/auth/Register'));
const Signup = lazy(() => import('./routes/auth/Signup'));
const Reset = lazy(() => import('./routes/auth/Reset'));
const UpdatePassword = lazy(() => import('./routes/auth/UpdatePassword'));
const VerifyEmail = lazy(() => import('./routes/auth/VerifyEmail'));
const SafetyProfile = lazy(() => import('./routes/SafetyProfile'));
const SafetyResources = lazy(() => import('./routes/SafetyResources'));
const SafetyPlan = lazy(() => import('./routes/SafetyPlan'));
const SafetyPlanShare = lazy(() => import('./routes/SafetyPlanShare'));
const About = lazy(() => import('./routes/About'));
const TermsOfService = lazy(() => import('./routes/TermsOfService'));
const PrivacyPolicy = lazy(() => import('./routes/PrivacyPolicy'));
const CheckInHistory = lazy(() => import('./routes/CheckInHistory'));
const SavedPrograms = lazy(() => import('./routes/SavedPrograms'));
const VerifyConsent = lazy(() => import('./routes/VerifyConsent'));
const GuardianVerify = lazy(() => import('./routes/GuardianVerify'));
const OrgDashboard = lazy(() => import('./routes/org/Dashboard'));
const ProgramManagement = lazy(() => import('./routes/org/ProgramManagement'));
const StaffManagement = lazy(() => import('./routes/org/StaffManagement'));
const TransparencyDashboard = lazy(() => import('./components/TransparencyDashboard').then(m => ({ default: m.TransparencyDashboard })));
const PrivacyCenter = lazy(() => import('./components/PrivacyCenter').then(m => ({ default: m.PrivacyCenter })));
const Achievements = lazy(() => import('./components/Achievements').then(m => ({ default: m.Achievements })));
const KPIDashboard = lazy(() => import('./components/KPIDashboard').then(m => ({ default: m.KPIDashboard })));
const OrbTimelapse = lazy(() => import('./components/OrbTimelapse'));
const ParentPortal = lazy(() => import('./routes/ParentPortal'));
const ParentLogin = lazy(() => import('./routes/ParentLogin'));
const ParentSetPassword = lazy(() => import('./routes/ParentSetPassword'));
const ParentResetPassword = lazy(() => import('./routes/ParentResetPassword'));
const ParentAcceptInvite = lazy(() => import('./routes/ParentAcceptInvite'));
const AdminPortal = lazy(() => import('./routes/AdminPortal'));
const DemoYouth = lazy(() => import('./routes/demos/Youth'));
const DemoOrganization = lazy(() => import('./routes/demos/Organization'));
const RootRedirect = lazy(() => import('./components/RootRedirect'));
const ReferralsList = lazy(() => import('./routes/org/ReferralsList'));
const ReferralsNew = lazy(() => import('./routes/org/ReferralsNew'));
const Reports = lazy(() => import('./routes/org/Reports'));
const YouthWorkerLogin = lazy(() => import('./routes/youth-worker/Login'));
const YouthWorkerDashboard = lazy(() => import('./routes/youth-worker/Dashboard'));
const YouthProfileView = lazy(() => import('./routes/youth-worker/YouthProfile'));

// Wrapper to add Suspense to lazy-loaded components
const withSuspense = (Component: React.LazyExoticComponent<any>) => {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Component />
    </Suspense>
  );
};

// Wrapper for protected routes that require youth authentication
const withProtectedSuspense = (Component: React.LazyExoticComponent<any>) => {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <RequireAuth>
        <Component />
      </RequireAuth>
    </Suspense>
  );
};

// Wrapper for admin portal routes
const withAdminSuspense = (Component: React.LazyExoticComponent<any>) => {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <RequireAdminSession>
        <Component />
      </RequireAdminSession>
    </Suspense>
  );
};

// Wrapper for organization portal routes
const withOrgSuspense = (Component: React.LazyExoticComponent<any>) => {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <RequireOrgAccess>
        <Component />
      </RequireOrgAccess>
    </Suspense>
  );
};

// Wrapper for parent portal routes
const withParentSuspense = (Component: React.LazyExoticComponent<any>) => {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <RequireParentSession>
        <Component />
      </RequireParentSession>
    </Suspense>
  );
};

// Wrapper for youth worker portal routes
const withYouthWorkerSuspense = (Component: React.LazyExoticComponent<any>) => {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <RequireYouthWorkerSession>
        <Component />
      </RequireYouthWorkerSession>
    </Suspense>
  );
};

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    errorElement: <ErrorBoundary />,
    children: [
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
      { path: 'settings', element: withProtectedSuspense(Settings) },
      { path: 'control/entrance', element: withSuspense(AdminPortal) },
      {
        path: 'admin',
        element: withAdminSuspense(AdminLayout),
        children: [
          { index: true, element: withSuspense(AdminOverview) },
          { path: 'organizations', element: withSuspense(AdminOrganizations) },
          { path: 'users', element: withSuspense(AdminUsers) },
          { path: 'audit-logs', element: withSuspense(AdminAuditLogs) },
          { path: 'compliance', element: withSuspense(AdminCompliance) },
          { path: 'ai-interventions', element: withSuspense(AdminAIInterventions) },
        ]
      },
      { path: 'about', element: withSuspense(About) },
      { path: 'terms-of-service', element: withSuspense(TermsOfService) },
      { path: 'privacy-policy', element: withSuspense(PrivacyPolicy) },
      { path: 'check-in-history', element: withProtectedSuspense(CheckInHistory) },
      { path: 'saved-programs', element: withProtectedSuspense(SavedPrograms) },
      { path: 'verify-consent/:token', element: withSuspense(VerifyConsent) },
      { path: 'guardian/verify/:token', element: withSuspense(GuardianVerify) },
      { path: 'parent', element: withParentSuspense(ParentPortal) },
      { path: 'parent/login', element: withSuspense(ParentLogin) },
      { path: 'parent/set-password/:token', element: withSuspense(ParentSetPassword) },
      { path: 'parent/reset-password/:token', element: withSuspense(ParentResetPassword) },
      { path: 'parent/accept/:token', element: withSuspense(ParentAcceptInvite) },
      { path: 'org', element: <Navigate to="/org/dashboard" replace /> },
      { path: 'org/dashboard', element: withOrgSuspense(OrgDashboard) },
      { path: 'org/programs', element: withOrgSuspense(ProgramManagement) },
      { path: 'org/staff', element: withOrgSuspense(StaffManagement) },
      { path: 'org/referrals', element: withOrgSuspense(ReferralsList) },
      { path: 'org/referrals/new', element: withOrgSuspense(ReferralsNew) },
      { path: 'org/reports', element: withOrgSuspense(Reports) },
      { path: 'youth-worker', element: <Navigate to="/youth-worker/dashboard" replace /> },
      { path: 'youth-worker/login', element: withSuspense(YouthWorkerLogin) },
      { path: 'youth-worker/dashboard', element: withYouthWorkerSuspense(YouthWorkerDashboard) },
      { path: 'youth-worker/youth/:youthId', element: withYouthWorkerSuspense(YouthProfileView) },
      { path: 'kpi-dashboard', element: withProtectedSuspense(KPIDashboard) },
      { path: 'transparency', element: withProtectedSuspense(TransparencyDashboard) },
      { path: 'privacy-center', element: withProtectedSuspense(PrivacyCenter) },
      { path: 'achievements', element: withProtectedSuspense(Achievements) },
      { path: 'orb-timelapse', element: withProtectedSuspense(OrbTimelapse) },
      { path: 'auth/login', element: withSuspense(Login) },
      { path: 'auth/register', element: withSuspense(Register) },
      { path: 'auth/signup', element: withSuspense(Signup) },
      { path: 'auth/reset', element: withSuspense(Reset) },
      { path: 'auth/verify-email/:token', element: withSuspense(VerifyEmail) },
      { path: 'auth/update-password', element: withSuspense(UpdatePassword) },
      { path: 'demos/youth', element: withSuspense(DemoYouth) },
      { path: 'demos/organization', element: withSuspense(DemoOrganization) },
      { path: '*', element: withSuspense(NotFound) }
    ]
  }
], {
  future: {
    v7_relativeSplatPath: true,
    v7_fetcherPersist: true,
    v7_normalizeFormMethod: true,
    v7_partialHydration: true,
    v7_skipActionErrorRevalidation: true
  }
});
