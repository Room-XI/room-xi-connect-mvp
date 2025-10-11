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
import Reset from './routes/auth/Reset';
import UpdatePassword from './routes/auth/UpdatePassword';
import ErrorBoundary from './ui/ErrorBoundary';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    errorElement: <ErrorBoundary />,
    children: [
      { index: true, element: <Home /> },
      { path: 'home', element: <Home /> },
      { path: 'explore', element: <Explore /> },
      { path: 'explore/:view', element: <Explore /> }, // For map, saved
      { path: 'program/:id', element: <ProgramDetail /> },
      { path: 'qr', element: <QRScan /> },
      { path: 'me', element: <Me /> },
      { path: 'settings', element: <Settings /> },
      { path: 'admin', element: <Admin /> },
      { path: 'auth/login', element: <Login /> },
      { path: 'auth/register', element: <Register /> },
      { path: 'auth/reset', element: <Reset /> },
      { path: 'auth/update-password', element: <UpdatePassword /> },
      { path: '*', element: <NotFound /> }
    ]
  }
]);
