import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import Dashboard from './pages/Dashboard';
import Generator from './pages/Generator';
import Results from './pages/Results';
import Profile from './pages/Profile';
import Billing from './pages/Billing';
import ContentLibrary from './pages/ContentLibrary';
import { CarouselProvider } from './contexts/CarouselContext';
import { ContentLibraryProvider } from './contexts/ContentLibraryContext';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }
  
  return user ? <>{children}</> : <Navigate to="/login" />;
}

function App() {
  return (
    <AuthProvider>
      <ContentLibraryProvider>
        <CarouselProvider>
          <Router>
            <div className="min-h-screen bg-gray-50">
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } />
                <Route path="/generate" element={
                  <ProtectedRoute>
                    <Generator />
                  </ProtectedRoute>
                } />
                <Route path="/results" element={
                  <ProtectedRoute>
                    <Results />
                  </ProtectedRoute>
                } />
                <Route path="/profile" element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                } />
                <Route path="/billing" element={
                  <ProtectedRoute>
                    <Billing />
                  </ProtectedRoute>
                } />
                <Route path="/content-library" element={
                  <ProtectedRoute>
                    <ContentLibrary />
                  </ProtectedRoute>
                } />
              </Routes>
            </div>
          </Router>
        </CarouselProvider>
      </ContentLibraryProvider>
    </AuthProvider>
  );
}

export default App;