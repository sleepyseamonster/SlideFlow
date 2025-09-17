import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCarousel } from '../contexts/CarouselContext';
import { useContentLibrary } from '../contexts/ContentLibraryContext';
import ImportLibraryModal from '../components/ImportLibraryModal';
import Navbar from '../components/Navbar';
import { 
  Upload, 
  X, 
  Wand2, 
  Image as ImageIcon,
  ArrowRight,
  FolderOpen
} from 'lucide-react';

export default function Generator() {
  const [images, setImages] = useState<File[]>([]);
  const [description, setDescription] = useState('');
  const [style, setStyle] = useState<'minimalist' | 'bold' | 'elegant'>('minimalist');
  const [customColors, setCustomColors] = useState({
    primary: '#3B82F6',
    secondary: '#10B981', 
    accent1: '#F59E0B',
    accent2: '#EF4444'
  });
  const [generating, setGenerating] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  
  const { user, updateUser } = useAuth();
  const { addCarousel, setCurrentCarousel } = useCarousel();
  const { addImages } = useContentLibrary();
  const navigate = useNavigate();

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newFiles = files.slice(0, 10 - images.length);
    setImages(prev => [...prev, ...newFiles]);
    
    // Also add to content library
    if (newFiles.length > 0) {
      addImages(newFiles);
    }
  };

  const handleImportFromLibrary = (importedImages: File[]) => {
    setImages(prev => [...prev, ...importedImages]);
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleGenerate = async () => {
    if (!user) return;
    
    if (user.carouselsGenerated >= user.maxCarousels) {
      alert('You\'ve reached your generation limit. Please upgrade to premium.');
      return;
    }

    setGenerating(true);
    
    // Mock AI generation delay
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Create mock carousel
    const newCarousel = {
      id: Date.now().toString(),
      title: description.slice(0, 50) + (description.length > 50 ? '...' : ''),
      description,
      style,
      createdAt: new Date().toISOString().split('T')[0],
      slides: images.map((_, index) => ({
        id: (index + 1).toString(),
        image: `https://images.pexels.com/photos/318${4320 + index}/pexels-photo-318${4320 + index}.jpeg?auto=compress&cs=tinysrgb&w=1080&h=1080&dpr=2`,
        caption: `Slide ${index + 1}: ${description}`,
        design: style
      }))
    };
    
    addCarousel(newCarousel);
    setCurrentCarousel(newCarousel);
    updateUser({ carouselsGenerated: user.carouselsGenerated + 1 });
    
    setGenerating(false);
    navigate('/results');
  };

  const canGenerate = images.length > 0 && description.trim() && user && user.carouselsGenerated < user.maxCarousels;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="pt-20 pb-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Create Your Carousel</h1>
            <p className="text-gray-600">Upload images and describe your message to generate a professional carousel</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-8 space-y-8">
            {/* Image Upload */}
            <div>
              <label className="block text-lg font-semibold text-gray-900 mb-4">
                Upload Images ({images.length}/10)
              </label>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-4">
                {images.map((image, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={URL.createObjectURL(image)}
                      alt={`Upload ${index + 1}`}
                      className="w-full h-24 object-cover rounded-lg"
                    />
                    <button
                      onClick={() => removeImage(index)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                
              </div>
              
              {images.length === 0 && (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Upload your images</h3>
                  <p className="text-gray-600 mb-4">Select up to 10 images for your carousel</p>
                  <div className="flex items-center justify-center space-x-3">
                    <label className="inline-flex items-center px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg cursor-pointer hover:bg-indigo-200 transition-colors">
                      <Upload className="h-4 w-4 mr-2" />
                      Choose Files
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                    <span className="text-gray-500">or</span>
                    <button
                      onClick={() => setShowImportModal(true)}
                      type="button"
                      className="inline-flex items-center px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
                    >
                      <FolderOpen className="h-4 w-4 mr-2" />
                      Import from Library
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-lg font-semibold text-gray-900 mb-4">
                Describe Your Message
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what you want to communicate with this carousel. For example: '5 marketing tips for small businesses to increase their social media engagement and drive more sales.'"
                className="w-full h-32 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                maxLength={500}
              />
              <p className="text-sm text-gray-500 mt-2">{description.length}/500 characters</p>
            </div>

            {/* Style Selection */}
            <div>
              <label className="block text-lg font-semibold text-gray-900 mb-4">
                Choose Style
              </label>
              <div className="grid md:grid-cols-3 gap-4">
                {[
                  { value: 'minimalist', name: 'Minimalist', desc: 'Clean, simple design with lots of white space' },
                  { value: 'bold', name: 'Bold', desc: 'Strong colors and typography for high impact' },
                  { value: 'elegant', name: 'Elegant', desc: 'Sophisticated design with refined aesthetics' }
                ].map((styleOption) => (
                  <label
                    key={styleOption.value}
                    className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                      style === styleOption.value
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="style"
                      value={styleOption.value}
                      checked={style === styleOption.value}
                      onChange={(e) => setStyle(e.target.value as typeof style)}
                      className="hidden"
                    />
                    <h3 className="font-medium text-gray-900 mb-2">{styleOption.name}</h3>
                    <p className="text-sm text-gray-600">{styleOption.desc}</p>
                  </label>
                ))}
              </div>
            </div>

            {/* Color Customization */}
            <div>
              <label className="block text-lg font-semibold text-gray-900 mb-4">
                Custom Colors (Optional)
              </label>
              <p className="text-gray-600 mb-4">Customize the colors used in your carousel design</p>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Primary Color
                    </label>
                    <div className="flex items-center space-x-3">
                      <input
                        type="color"
                        value={customColors.primary}
                        onChange={(e) => setCustomColors(prev => ({ ...prev, primary: e.target.value }))}
                        className="w-12 h-12 rounded-lg border-2 border-gray-300 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={customColors.primary}
                        onChange={(e) => setCustomColors(prev => ({ ...prev, primary: e.target.value }))}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm"
                        placeholder="#3B82F6"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Secondary Color
                    </label>
                    <div className="flex items-center space-x-3">
                      <input
                        type="color"
                        value={customColors.secondary}
                        onChange={(e) => setCustomColors(prev => ({ ...prev, secondary: e.target.value }))}
                        className="w-12 h-12 rounded-lg border-2 border-gray-300 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={customColors.secondary}
                        onChange={(e) => setCustomColors(prev => ({ ...prev, secondary: e.target.value }))}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm"
                        placeholder="#10B981"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Accent Color 1
                    </label>
                    <div className="flex items-center space-x-3">
                      <input
                        type="color"
                        value={customColors.accent1}
                        onChange={(e) => setCustomColors(prev => ({ ...prev, accent1: e.target.value }))}
                        className="w-12 h-12 rounded-lg border-2 border-gray-300 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={customColors.accent1}
                        onChange={(e) => setCustomColors(prev => ({ ...prev, accent1: e.target.value }))}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm"
                        placeholder="#F59E0B"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Accent Color 2
                    </label>
                    <div className="flex items-center space-x-3">
                      <input
                        type="color"
                        value={customColors.accent2}
                        onChange={(e) => setCustomColors(prev => ({ ...prev, accent2: e.target.value }))}
                        className="w-12 h-12 rounded-lg border-2 border-gray-300 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={customColors.accent2}
                        onChange={(e) => setCustomColors(prev => ({ ...prev, accent2: e.target.value }))}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm"
                        placeholder="#EF4444"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* Usage Info */}
            {user && (
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm text-gray-600">
                  You've used {user.carouselsGenerated} of {user.maxCarousels} free generations.
                  {user.plan === 'free' && user.carouselsGenerated >= user.maxCarousels && (
                    <span className="text-orange-600 font-medium ml-1">
                      Upgrade to Premium for unlimited generations.
                    </span>
                  )}
                </p>
              </div>
            )}

            {/* Generate Button */}
            <div className="flex justify-end">
              <button
                onClick={handleGenerate}
                disabled={!canGenerate || generating}
                className="flex items-center px-8 py-3 bg-teal-500 hover:bg-teal-600 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generating ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="h-5 w-5 mr-2" />
                    Generate Carousel
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Import Library Modal */}
          <ImportLibraryModal
            isOpen={showImportModal}
            onClose={() => setShowImportModal(false)}
            onImport={handleImportFromLibrary}
            maxImages={10}
            currentImageCount={images.length}
          />
        </div>
      </main>
    </div>
  );
}