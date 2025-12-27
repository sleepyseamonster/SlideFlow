import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import Dashboard from './pages/Dashboard';
import SlideBoard from './pages/SlideBoard';
import GenerateCaption from './pages/GenerateCaption';
import Publish from './pages/Publish';
import CalendarPage from './pages/Calendar';
import Profile from './pages/Profile';
import AccountSettings from './pages/AccountSettings';
import Billing from './pages/Billing';
import Plans from './pages/Plans';
import MediaLibrary from './pages/MediaLibrary';
import BrandProfile from './pages/BrandProfile';
import SlideFlowStudio from './pages/SlideFlowStudio';
import { CarouselProvider } from './contexts/CarouselContext';
import { MediaLibraryProvider } from './contexts/MediaLibraryContext';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-ink flex items-center justify-center text-vanilla">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pacific"></div>
      </div>
    );
  }
  
  return user ? <>{children}</> : <Navigate to="/login" />;
}

function LegacyResultsRedirect() {
  const { carouselId } = useParams<{ carouselId?: string }>();
  return (
    <Navigate
      to={carouselId ? `/generate-caption/${carouselId}` : '/dashboard'}
      replace
    />
  );
}

function App() {
  return (
    <AuthProvider>
      <MediaLibraryProvider>
        <CarouselProvider>
          <Router>
            <div className="min-h-screen bg-ink text-vanilla">
              <Routes>
              <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } />
                <Route path="/slideboard" element={
                  <ProtectedRoute>
                    <SlideBoard />
                  </ProtectedRoute>
                } />
                <Route path="/generate" element={<Navigate to="/slideboard" replace />} />
                <Route path="/generate-caption/:carouselId" element={
                  <ProtectedRoute>
                    <GenerateCaption />
                  </ProtectedRoute>
                } />
                <Route path="/publish/:carouselId" element={
                  <ProtectedRoute>
                    <Publish />
                  </ProtectedRoute>
                } />
                <Route path="/calendar" element={
                  <ProtectedRoute>
                    <CalendarPage />
                  </ProtectedRoute>
                } />
                <Route path="/studio" element={
                  <ProtectedRoute>
                    <SlideFlowStudio />
                  </ProtectedRoute>
                } />
                <Route path="/results/:carouselId" element={<LegacyResultsRedirect />} />
                <Route path="/results" element={<Navigate to="/dashboard" replace />} />
                <Route path="/profile" element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                } />
                <Route path="/account-settings" element={
                  <ProtectedRoute>
                    <AccountSettings />
                  </ProtectedRoute>
                } />
                <Route path="/brand-profile" element={
                  <ProtectedRoute>
                    <BrandProfile />
                  </ProtectedRoute>
                } />
                <Route path="/billing" element={
                  <ProtectedRoute>
                    <Billing />
                  </ProtectedRoute>
                } />
                <Route path="/plans" element={
                  <ProtectedRoute>
                    <Plans />
                  </ProtectedRoute>
                } />
                <Route path="/media-library" element={
                  <ProtectedRoute>
                    <MediaLibrary />
                  </ProtectedRoute>
                } />
              </Routes>
            </div>
          </Router>
        </CarouselProvider>
      </MediaLibraryProvider>
    </AuthProvider>
  );
}

export default App;
