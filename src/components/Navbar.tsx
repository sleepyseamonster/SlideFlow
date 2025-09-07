import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Layers, User, LogOut } from 'lucide-react';

interface NavbarProps {
  transparent?: boolean;
}

export default function Navbar({ transparent = false }: NavbarProps) {
  const { user, logout } = useAuth();

  return (
    <nav className={`fixed w-full z-50 transition-all duration-300 ${
      transparent ? 'bg-transparent' : 'bg-white/95 backdrop-blur-sm shadow-sm'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <Layers className="h-8 w-8 text-indigo-600" />
              <span className={`text-xl font-bold ${
                transparent ? 'text-white' : 'text-gray-900'
              }`}>
                SlideFlow
              </span>
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            {user ? (
              <div className="flex items-center space-x-4">
                <Link 
                  to="/dashboard"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    transparent 
                      ? 'text-white hover:text-gray-200' 
                      : 'text-gray-700 hover:text-gray-900'
                  }`}
                >
                  Dashboard
                </Link>
                <div className="relative group">
                  <button className={`flex items-center space-x-1 p-2 rounded-md ${
                    transparent ? 'text-white hover:bg-white/10' : 'text-gray-700 hover:bg-gray-100'
                  }`}>
                    <User className="h-5 w-5" />
                    <span className="text-sm">{user.name}</span>
                  </button>
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                    <Link 
                      to="/profile" 
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Profile
                    </Link>
                    <button 
                      onClick={logout}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <LogOut className="inline h-4 w-4 mr-2" />
                      Sign out
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link 
                  to="/login"
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    transparent 
                      ? 'text-white hover:text-gray-200' 
                      : 'text-gray-700 hover:text-gray-900'
                  }`}
                >
                  Sign In
                </Link>
                <Link 
                  to="/signup"
                  className="bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}