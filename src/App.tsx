import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Generator from './pages/Generator';
import LandingPage from './pages/LandingPage';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { Pricing } from './pages/Pricing';
import { Success } from './pages/Success';
import ContentLibrary from './pages/ContentLibrary';
import Results from './pages/Results';

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
        <Route path="/signup" element={user ? <Navigate to="/dashboard" /> : <Signup />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/dashboard" element={user ? <Generator /> : <Navigate to="/login" />} />
        <Route path="/library" element={user ? <ContentLibrary /> : <Navigate to="/login" />} />
        <Route path="/results" element={user ? <Results /> : <Navigate to="/login" />} />
        <Route path="/success" element={user ? <Success /> : <Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;