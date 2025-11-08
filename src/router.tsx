import { createBrowserRouter } from 'react-router-dom';
import App from './shell/App';
import Home from './routes/Home';
import Explore from './routes/Explore';
import QRScan from './routes/QRScan';
import Me from './routes/Me';
import ProgramDetail from './routes/ProgramDetail';
import Settings from './routes/Settings';
import Admin from './routes/Admin';
import NotFound from './routes/NotFound';
import Login from './routes/auth/Login';
import Register from './routes/auth/Register';
import Signup from './routes/auth/Signup';
import Reset from './routes/auth/Reset';
import UpdatePassword from './routes/auth/UpdatePassword';
import SafetyProfile from './routes/SafetyProfile';
import SafetyResources from './routes/SafetyResources';
import About from './routes/About';
import TermsOfService from './routes/TermsOfService';
import PrivacyPolicy from './routes/PrivacyPolicy';
import CheckInHistory from './routes/CheckInHistory';
import ErrorBoundary from './ui/ErrorBoundary';
import Journal from './routes/Journal';
import VerifyConsent from './routes/VerifyConsent';
import GuardianVerify from './routes/GuardianVerify';
import OrgDashboard from './routes/org/Dashboard';
import { TransparencyDashboard } from './components/TransparencyDashboard';
import { PrivacyCenter } from './components/PrivacyCenter';
import { LivingJournal } from './components/LivingJournal';
import { Achievements } from './components/Achievements';
import { KPIDashboard } from './components/KPIDashboard';
import OrbTimelapse from './components/OrbTimelapse';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    errorElement: <ErrorBoundary />,
    children: [
      { index: true, element: <Explore /> },
      { path: 'home', element: <Home /> },
      { path: 'explore', element: <Explore /> },
      { path: 'explore/:view', element: <Explore /> }, // For map, saved
      { path: 'program/:id', element: <ProgramDetail /> },
      { path: 'qr', element: <QRScan /> },
      { path: 'me', element: <Me /> },
      { path: 'safety-profile', element: <SafetyProfile /> },
      { path: 'safety-resources', element: <SafetyResources /> },
      { path: 'settings', element: <Settings /> },
      { path: 'admin', element: <Admin /> },
      { path: 'about', element: <About /> },
      { path: 'terms-of-service', element: <TermsOfService /> },
      { path: 'privacy-policy', element: <PrivacyPolicy /> },
      { path: 'check-in-history', element: <CheckInHistory /> },
      { path: 'journal', element: <Journal /> },
      { path: 'living-journal', element: <LivingJournal /> },
      { path: 'verify-consent/:token', element: <VerifyConsent /> },
      { path: 'guardian/verify/:token', element: <GuardianVerify /> },
      { path: 'org/dashboard', element: <OrgDashboard /> },
      { path: 'kpi-dashboard', element: <KPIDashboard /> },
      { path: 'transparency', element: <TransparencyDashboard /> },
      { path: 'privacy-center', element: <PrivacyCenter /> },
      { path: 'achievements', element: <Achievements /> },
      { path: 'orb-timelapse', element: <OrbTimelapse /> },
      { path: 'auth/login', element: <Login /> },
      { path: 'auth/register', element: <Register /> },
      { path: 'auth/signup', element: <Signup /> },
      { path: 'auth/reset', element: <Reset /> },
      { path: 'auth/update-password', element: <UpdatePassword /> },
      { path: '*', element: <NotFound /> }
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
