import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { WebsiteProvider, useWebsiteContext } from './contexts/WebsiteContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { Login, AddWebsite, Register, Website, Landing, Account, NotFound, AuthCallback } from './pages';
import { Toaster } from 'react-hot-toast';
import { SessionReplay } from './pages/SessionReplay';

const RootRoute = () => {
  const { selectedWebsite, websites, loading } = useWebsiteContext();

  if (loading && !selectedWebsite && websites.length === 0) {
    return null;
  }

  if (selectedWebsite) {
    return <Website />;
  }

  if (websites.length > 0) {
    return <Navigate to={`/site/${websites[0].publicId}`} replace />;
  }

  return <Landing />;
};

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  return (
    <Router>
      <Routes>
        <Route path="/sessions/:sessionId/replay" element={<SessionReplay />} />
        <Route path="*" element={<NotFound />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        {user ?
          <>
            <Route path="/" element={<RootRoute />} />
            <Route path="/account/:page?" element={<Account />} />
            <Route path="/landing" element={<Landing />} />
            <Route path="/site/add" element={<AddWebsite />} />
            <Route path="/site/:publicId" element={<Website />} />
          </>
          :
          <Route path="/" element={<Landing />} />
        }
      </Routes>
    </Router>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <WebsiteProvider>
          <Toaster position='bottom-right' />
          <AppContent />
        </WebsiteProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;