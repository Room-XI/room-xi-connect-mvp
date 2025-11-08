import { createBrowserRouter } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import App from './shell/App';
import ErrorBoundary from './ui/ErrorBoundary';

// Loading fallback component
const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-cream">
    <div className="w-12 h-12 border-4 border-teal border-t-transparent rounded-full animate-spin" />
  </div>
);

// Lazy load routes to reduce initial bundle size
const Home = lazy(() => import('./routes/Home'));
const Explore = lazy(() => import('./routes/Explore'));
const QRScan = lazy(() => import('./routes/QRScan'));
const Me = lazy(() => import('./routes/Me'));
const ProgramDetail = lazy(() => import('./routes/ProgramDetail'));
const Settings = lazy(() => import('./routes/Settings'));
const Admin = lazy(() => import('./routes/Admin'));
const NotFound = lazy(() => import('./routes/NotFound'));
const Login = lazy(() => import('./routes/auth/Login'));
const Register = lazy(() => import('./routes/auth/Register'));
const Signup = lazy(() => import('./routes/auth/Signup'));
const Reset = lazy(() => import('./routes/auth/Reset'));
const UpdatePassword = lazy(() => import('./routes/auth/UpdatePassword'));
const SafetyProfile = lazy(() => import('./routes/SafetyProfile'));
const SafetyResources = lazy(() => import('./routes/SafetyResources'));
const About = lazy(() => import('./routes/About'));
const TermsOfService = lazy(() => import('./routes/TermsOfService'));
const PrivacyPolicy = lazy(() => import('./routes/PrivacyPolicy'));
const CheckInHistory = lazy(() => import('./routes/CheckInHistory'));
const SavedPrograms = lazy(() => import('./routes/SavedPrograms'));
const Journal = lazy(() => import('./routes/Journal'));
const VerifyConsent = lazy(() => import('./routes/VerifyConsent'));
const GuardianVerify = lazy(() => import('./routes/GuardianVerify'));
const OrgDashboard = lazy(() => import('./routes/org/Dashboard'));
const ProgramManagement = lazy(() => import('./routes/org/ProgramManagement'));
const TransparencyDashboard = lazy(() => import('./components/TransparencyDashboard').then(m => ({ default: m.TransparencyDashboard })));
const PrivacyCenter = lazy(() => import('./components/PrivacyCenter').then(m => ({ default: m.PrivacyCenter })));
const LivingJournal = lazy(() => import('./components/LivingJournal').then(m => ({ default: m.LivingJournal })));
const Achievements = lazy(() => import('./components/Achievements').then(m => ({ default: m.Achievements })));
const KPIDashboard = lazy(() => import('./components/KPIDashboard').then(m => ({ default: m.KPIDashboard })));
const OrbTimelapse = lazy(() => import('./components/OrbTimelapse'));

// Wrapper to add Suspense to lazy-loaded components
const withSuspense = (Component: React.LazyExoticComponent<any>) => {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Component />
    </Suspense>
  );
};

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    errorElement: <ErrorBoundary />,
    children: [
      { index: true, element: withSuspense(Explore) },
      { path: 'home', element: withSuspense(Home) },
      { path: 'explore', element: withSuspense(Explore) },
      { path: 'explore/:view', element: withSuspense(Explore) },
      { path: 'program/:id', element: withSuspense(ProgramDetail) },
      { path: 'qr', element: withSuspense(QRScan) },
      { path: 'me', element: withSuspense(Me) },
      { path: 'safety-profile', element: withSuspense(SafetyProfile) },
      { path: 'safety-resources', element: withSuspense(SafetyResources) },
      { path: 'settings', element: withSuspense(Settings) },
      { path: 'admin', element: withSuspense(Admin) },
      { path: 'about', element: withSuspense(About) },
      { path: 'terms-of-service', element: withSuspense(TermsOfService) },
      { path: 'privacy-policy', element: withSuspense(PrivacyPolicy) },
      { path: 'check-in-history', element: withSuspense(CheckInHistory) },
      { path: 'saved-programs', element: withSuspense(SavedPrograms) },
      { path: 'journal', element: withSuspense(Journal) },
      { path: 'living-journal', element: withSuspense(LivingJournal) },
      { path: 'verify-consent/:token', element: withSuspense(VerifyConsent) },
      { path: 'guardian/verify/:token', element: withSuspense(GuardianVerify) },
      { path: 'org/dashboard', element: withSuspense(OrgDashboard) },
      { path: 'org/programs', element: withSuspense(ProgramManagement) },
      { path: 'kpi-dashboard', element: withSuspense(KPIDashboard) },
      { path: 'transparency', element: withSuspense(TransparencyDashboard) },
      { path: 'privacy-center', element: withSuspense(PrivacyCenter) },
      { path: 'achievements', element: withSuspense(Achievements) },
      { path: 'orb-timelapse', element: withSuspense(OrbTimelapse) },
      { path: 'auth/login', element: withSuspense(Login) },
      { path: 'auth/register', element: withSuspense(Register) },
      { path: 'auth/signup', element: withSuspense(Signup) },
      { path: 'auth/reset', element: withSuspense(Reset) },
      { path: 'auth/update-password', element: withSuspense(UpdatePassword) },
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
