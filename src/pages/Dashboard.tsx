import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCarousel } from '../contexts/CarouselContext';
import Navbar from '../components/Navbar';
import { 
  Plus, 
  Copy, 
  Trash2, 
  Download, 
  CalendarCheck2,
  TrendingUp,
  Star,
  Clock,
  Image as ImageIcon
} from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const { carousels, loading, deleteCarousel, duplicateCarousel, setCurrentCarousel, fetchCarousel } = useCarousel();
  const navigate = useNavigate();

  const canGenerate = user && user.carouselsGenerated < user.maxCarousels;

  // Calculate time saved (assuming each carousel saves ~2.5 hours of manual work)
  const timeSavedHours = user ? Math.round(user.carouselsGenerated * 2.5 * 10) / 10 : 0;

  const handleCarouselClick = async (carousel: any) => {
    try {
      // Fetch the full carousel data with slides
      const fullCarousel = await fetchCarousel(carousel.id);
      if (fullCarousel) {
        setCurrentCarousel(fullCarousel);
        navigate('/results');
      } else {
        alert('Could not load carousel details');
      }
    } catch (error) {
      console.error('Error loading carousel:', error);
      alert('Error loading carousel');
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="pt-20 pb-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="pt-20 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome back, {user?.name}!
            </h1>
            <p className="text-gray-600 mt-2">
              Create and manage your Instagram carousel posts
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-indigo-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Carousels Created</p>
                  <p className="text-2xl font-bold text-gray-900">{carousels.length}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center">
                <div className="p-2 bg-teal-100 rounded-lg">
                  <CalendarCheck2 className="h-6 w-6 text-teal-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-600">This Month</p>
                  <p className="text-2xl font-bold text-gray-900">{carousels.length}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Clock className="h-6 w-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Time Saved</p>
                  <p className="text-2xl font-bold text-gray-900">{timeSavedHours}h</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Star className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Plan</p>
                  <p className="text-2xl font-bold text-gray-900 capitalize">{user?.plan}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mb-8">
            {canGenerate ? (
              <div className="flex items-center space-x-4">
                <Link
                  to="/generate"
                  className="inline-flex items-center px-6 py-3 bg-teal-500 hover:bg-teal-600 text-white font-semibold rounded-xl transition-colors"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Create New Carousel
                </Link>
                <Link
                  to="/content-library"
                  className="inline-flex items-center px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white font-semibold rounded-xl transition-colors"
                >
                  <ImageIcon className="h-5 w-5 mr-2" />
                  Content Library
                </Link>
              </div>
            ) : (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                <p className="text-orange-800 font-medium">
                  You've reached your free carousel limit. 
                  <Link to="/profile" className="text-orange-600 hover:text-orange-500 underline ml-1">
                    Upgrade to Premium
                  </Link> for unlimited generations.
                </p>
              </div>
            )}
          </div>

          {/* Carousels Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {carousels.map((carousel) => (
              <div key={carousel.id} className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <div 
                  className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 relative cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => handleCarouselClick(carousel)}
                >
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <div className="text-center">
                      <ImageIcon className="h-12 w-12 mx-auto mb-2" />
                      <p className="text-sm">Click to view</p>
                    </div>
                  </div>
                  <div className="absolute top-4 right-4 bg-black/70 text-white px-2 py-1 rounded-md text-sm">
                    Carousel
                  </div>
                  <div className="absolute inset-0 bg-black/0 hover:bg-black/5 transition-colors flex items-center justify-center">
                    <div className="opacity-0 hover:opacity-100 bg-white/90 text-gray-800 px-3 py-1 rounded-md text-sm font-medium transition-opacity">
                      Click to view & edit
                    </div>
                  </div>
                </div>
                
                <div className="p-6">
                  <h3 className="font-semibold text-gray-900 mb-2">{carousel.title}</h3>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">{carousel.description}</p>
                  
                  <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                    <span className="bg-gray-100 px-2 py-1 rounded capitalize">{carousel.status || carousel.style}</span>
                    <span>{carousel.createdAt}</span>
                  </div>
                  
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => duplicateCarousel(carousel.id)}
                      className="flex-1 flex items-center justify-center px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Copy
                    </button>
                    <button className="flex-1 flex items-center justify-center px-3 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-lg transition-colors">
                      <Download className="h-4 w-4 mr-1" />
                      Export
                    </button>
                    <button 
                      onClick={() => deleteCarousel(carousel.id)}
                      className="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            
            {carousels.length === 0 && (
              <div className="col-span-full text-center py-12">
                <div className="max-w-sm mx-auto">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Plus className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No carousels yet</h3>
                  <p className="text-gray-600 mb-6">Get started by creating your first carousel</p>
                  {canGenerate && (
                    <Link
                      to="/generate"
                      className="inline-flex items-center px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white font-medium rounded-lg transition-colors"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Carousel
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}