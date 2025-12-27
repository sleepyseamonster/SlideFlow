import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Profile() {
  const { user } = useAuth();
  if (!user) return null;
  return <Navigate to="/account-settings" replace />;
}
