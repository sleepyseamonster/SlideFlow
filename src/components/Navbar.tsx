import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { User, LogOut } from 'lucide-react';

interface NavbarProps {
  transparent?: boolean;
}

export default function Navbar({ transparent = false }: NavbarProps) {
  const { user, logout } = useAuth();

  return (
    <nav
      className={`fixed w-full z-50 transition-all duration-300 ${
        transparent
          ? 'bg-transparent'
          : 'bg-surface/80 backdrop-blur-xl border-b border-charcoal/40 shadow-soft'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <img
                src="/logo.png"
                alt="SlideFlow"
                className="h-8 w-auto"
              />
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            {user ? (
              <div className="flex items-center space-x-4">
                <Link
                  to="/dashboard"
                  className="px-3 py-2 rounded-md text-sm font-medium text-vanilla/80 hover:text-vanilla transition-colors"
                >
                  Dashboard
                </Link>
                <div className="relative group">
                  <button className="flex items-center space-x-2 px-3 py-2 rounded-md text-vanilla/80 hover:text-vanilla hover:bg-surface-muted transition-colors border border-transparent group-hover:border-charcoal/50">
                    <User className="h-5 w-5" />
                    <span className="text-sm">{user.name}</span>
                  </button>
                  <div className="absolute right-0 mt-3 w-52 bg-surface-alt rounded-lg shadow-soft border border-charcoal/50 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                    <Link
                      to="/profile"
                      className="block px-4 py-2 text-sm text-vanilla/80 hover:text-vanilla hover:bg-surface-muted"
                    >
                      Profile
                    </Link>
                    <button
                      onClick={logout}
                      className="block w-full text-left px-4 py-2 text-sm text-vanilla/80 hover:text-vanilla hover:bg-surface-muted"
                    >
                      <LogOut className="inline h-4 w-4 mr-2" />
                      Sign out
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-medium rounded-md text-vanilla/80 hover:text-vanilla transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  className="sf-btn-primary text-sm px-4 py-2"
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
