import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCarousel } from '../contexts/CarouselContext';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import { 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  Copy, 
  Share2,
  Instagram,
  Sparkles,
  RefreshCw
} from 'lucide-react';

export default function Results() {
  const { currentCarousel } = useCarousel();
  const { user } = useAuth();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [instagramCaption, setInstagramCaption] = useState('');

  if (!currentCarousel) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="pt-20 flex items-center justify-center h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">No carousel found</h2>
            <Link 
              to="/generate" 
              className="text-indigo-600 hover:text-indigo-500"
            >
              Create a new carousel
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % currentCarousel.slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + currentCarousel.slides.length) % currentCarousel.slides.length);
  };

  const generateInstagramCaption = () => {
    // Mock Instagram caption generation (premium feature)
    if (user?.plan !== 'premium') {
      alert('Instagram caption generation is a premium feature. Please upgrade your plan.');
      return;
    }

    const mockCaption = `✨ ${currentCarousel.title}

${currentCarousel.description}

🎯 Save this post for later!
👆 Follow for more tips
💬 What's your biggest challenge?

#instagram #marketing #socialmedia #entrepreneur #business #tips #strategy #growth`;

    setInstagramCaption(mockCaption);
  };

  const regenerateSlide = async (slideIndex: number) => {
    if (!currentCarousel) return;
    
    // Mock AI regeneration process
    const confirmed = confirm(`Regenerate slide ${slideIndex + 1} with AI? This will create a new version of this slide.`);
    if (!confirmed) return;

    // Show loading state (you could add a loading state to the component)
    alert('Regenerating slide with AI... (This is a demo)');
    
    // In a real implementation, this would call your AI regeneration API
    // The API would generate a new image while keeping the same caption/text content
    console.log(`Regenerating slide ${slideIndex + 1} for carousel ${currentCarousel.id}`);
  };
  const handleExport = () => {
    // Mock export functionality
    alert('Export functionality would download all slides as high-quality 1080x1080px images in a ZIP file.');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="pt-20 pb-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <Link 
              to="/dashboard" 
              className="text-indigo-600 hover:text-indigo-500 font-medium mb-4 inline-block"
            >
              ← Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{currentCarousel.title}</h1>
            <p className="text-gray-600">{currentCarousel.description}</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Carousel Preview */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Preview</h2>
                <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">
                  {currentSlide + 1} / {currentCarousel.slides.length}
                </span>
              </div>
              
              <div className="relative">
                <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden mb-4">
                  <img
                    src={currentCarousel.slides[currentSlide]?.image}
                    alt={`Slide ${currentSlide + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                {currentCarousel.slides.length > 1 && (
                  <>
                    <button
                      onClick={prevSlide}
                      className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 p-2 rounded-full shadow-lg transition-all"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      onClick={nextSlide}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 p-2 rounded-full shadow-lg transition-all"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </>
                )}
              </div>
              
              {/* Regenerate Current Slide Button */}
              <div className="mb-4">
                <button
                  onClick={() => regenerateSlide(currentSlide)}
                  className="w-full flex items-center justify-center px-4 py-3 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-medium rounded-xl transition-all hover:shadow-md"
                >
                  <RefreshCw className="h-5 w-5 mr-2" />
                  Regenerate this slide only
                </button>
              </div>
              
              <div className="text-center mb-4">
                <p className="text-gray-700 font-medium">
                  {currentCarousel.slides[currentSlide]?.caption}
                </p>
              </div>
              
              {/* Slide Thumbnails */}
              <div className="flex space-x-2 overflow-x-auto pb-2">
                {currentCarousel.slides.map((slide, index) => (
                  <button
                    key={slide.id}
                    onClick={() => setCurrentSlide(index)}
                    className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                      index === currentSlide ? 'border-indigo-500' : 'border-transparent'
                    }`}
                  >
                    <img
                      src={slide.image}
                      alt={`Slide ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Actions & Caption */}
            <div className="space-y-6">
              {/* Export Options */}
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Export Carousel</h3>
                <div className="space-y-3">
                  <button
                    onClick={handleExport}
                    className="w-full flex items-center justify-center px-4 py-3 bg-teal-500 hover:bg-teal-600 text-white font-semibold rounded-xl transition-colors"
                  >
                    <Download className="h-5 w-5 mr-2" />
                    Download as ZIP
                  </button>
                  <button className="w-full flex items-center justify-center px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors">
                    <Copy className="h-5 w-5 mr-2" />
                    Copy to Clipboard
                  </button>
                  <button className="w-full flex items-center justify-center px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors">
                    <Share2 className="h-5 w-5 mr-2" />
                    Share Link
                  </button>
                </div>
              </div>

              {/* Instagram Caption Generator */}
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Instagram Caption</h3>
                  {user?.plan !== 'premium' && (
                    <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full">
                      Premium
                    </span>
                  )}
                </div>
                
                {!instagramCaption ? (
                  <button
                    onClick={generateInstagramCaption}
                    className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold rounded-xl transition-all"
                  >
                    <Sparkles className="h-5 w-5 mr-2" />
                    Generate Caption
                    <Instagram className="h-5 w-5 ml-2" />
                  </button>
                ) : (
                  <div className="space-y-3">
                    <textarea
                      value={instagramCaption}
                      onChange={(e) => setInstagramCaption(e.target.value)}
                      className="w-full h-40 px-3 py-2 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <button
                      onClick={() => navigator.clipboard.writeText(instagramCaption)}
                      className="w-full flex items-center justify-center px-4 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-medium rounded-lg transition-colors"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Caption
                    </button>
                  </div>
                )}
              </div>

              {/* Carousel Info */}
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Carousel Details</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Style:</span>
                    <span className="font-medium capitalize">{currentCarousel.style}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Slides:</span>
                    <span className="font-medium">{currentCarousel.slides.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Created:</span>
                    <span className="font-medium">{currentCarousel.createdAt}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Resolution:</span>
                    <span className="font-medium">1080x1080px</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}