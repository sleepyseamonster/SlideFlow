import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCarousel } from '../contexts/CarouselContext';
import { useContentLibrary } from '../contexts/ContentLibraryContext';
import { supabase } from '../lib/supabase';
import { n8nPost } from '../lib/n8n';
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

const BUCKET_NAME = "media";
const ASPECT = "1080x1350";
const MAX_FILES = 10;

// Upload one file to Supabase
async function uploadOne(userId: string, file: File) {
  const ext = file.name.split(".").pop() || "bin";
  const ts = Date.now();
  const path = `user_${userId}/${new Date().toISOString().slice(0,10)}/${ts}_${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(path, file, { upsert: false });

  if (error) throw error;

  return {
    bucket: BUCKET_NAME,
    path,
    filename: file.name,
    mime_type: file.type || "application/octet-stream",
    size_bytes: file.size,
  };
}

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
  const [skipCustomColors, setSkipCustomColors] = useState(false);
  const [primaryFont, setPrimaryFont] = useState('Inter, sans-serif');
  const [secondaryFont, setSecondaryFont] = useState('Roboto, sans-serif');
  const [generating, setGenerating] = useState(false);
  const [skipCustomFonts, setSkipCustomFonts] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  
  // Brand presets state
  const [presets, setPresets] = useState<Array<{
    id: string;
    name: string;
    colors: typeof customColors;
    primaryFont: string;
    secondaryFont: string;
  }>>([]);
  const [presetName, setPresetName] = useState('');
  const [selectedPreset, setSelectedPreset] = useState('');
  
  const { user, updateUser } = useAuth();
  const { addCarousel, setCurrentCarousel, fetchCarousel } = useCarousel();
  const { addImages } = useContentLibrary();
  const navigate = useNavigate();

  // Load presets from localStorage on component mount
  React.useEffect(() => {
    const savedPresets = localStorage.getItem('slideflow_brand_presets');
    if (savedPresets) {
      setPresets(JSON.parse(savedPresets));
    }
  }, []);

  // Save presets to localStorage whenever presets change
  React.useEffect(() => {
    localStorage.setItem('slideflow_brand_presets', JSON.stringify(presets));
  }, [presets]);

  // Universal font list for web-safe fonts
  const universalFonts = [
    { name: 'Inter', value: 'Inter, sans-serif' },
    { name: 'Roboto', value: 'Roboto, sans-serif' },
    { name: 'Open Sans', value: 'Open Sans, sans-serif' },
    { name: 'Lato', value: 'Lato, sans-serif' },
    { name: 'Montserrat', value: 'Montserrat, sans-serif' },
    { name: 'Source Sans Pro', value: 'Source Sans Pro, sans-serif' },
    { name: 'Raleway', value: 'Raleway, sans-serif' },
    { name: 'Ubuntu', value: 'Ubuntu, sans-serif' },
    { name: 'Nunito', value: 'Nunito, sans-serif' },
    { name: 'Poppins', value: 'Poppins, sans-serif' },
    { name: 'Playfair Display', value: 'Playfair Display, serif' },
    { name: 'Merriweather', value: 'Merriweather, serif' },
    { name: 'Georgia', value: 'Georgia, serif' },
    { name: 'Times New Roman', value: 'Times New Roman, serif' },
    { name: 'Arial', value: 'Arial, sans-serif' },
    { name: 'Helvetica', value: 'Helvetica, sans-serif' },
    { name: 'Verdana', value: 'Verdana, sans-serif' },
    { name: 'Trebuchet MS', value: 'Trebuchet MS, sans-serif' },
    { name: 'Tahoma', value: 'Tahoma, sans-serif' },
    { name: 'Courier New', value: 'Courier New, monospace' },
    { name: 'Monaco', value: 'Monaco, monospace' },
    { name: 'Consolas', value: 'Consolas, monospace' },
  ];

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newFiles = files.slice(0, 10 - images.length);
    setImages(prev => [...prev, ...newFiles]);
    
    // Also add to content library
    if (newFiles.length > 0) {
      addImages(newFiles);
    }
  };

  const savePreset = async () => {
    if (!presetName.trim()) {
      alert('Please enter a preset name');
      return;
    }

    if (!user) {
      alert('You must be logged in to save presets');
      return;
    }

    setGenerating(true);

    try {
      const userId = user.id;

      // Prepare data to send to webhook
      const allData = {
        user_id: userId,
        uploaded_files: [],
        description: '',
        style: style,
        brand_profile: {
          palette: {
            primary: customColors.primary,
            secondary: customColors.secondary,
            accent1: customColors.accent1,
            accent2: customColors.accent2
          },
          fonts: {
            primary: primaryFont,
            secondary: secondaryFont
          },
          defaults: { style }
        },
        carousel: {
          title: presetName.trim(),
          aspect: ASPECT
        },
        captions: {
          text: '',
          language: 'en',
          source: 'user'
        },
        ai_caption: {
          language: 'en',
          style: style
        },
        derivatives: {
          types: []
        },
        search_params: {
          orientation: 'vertical',
          limit: 0
        },
        post_platform: {
          platform: 'instagram',
          required_derivative_types: []
        },
        save_preset_only: true
      };

      // Send to webhook
      await n8nPost('/all-data', allData);

      // Also save locally for immediate UI update
      const newPreset = {
        id: Date.now().toString(),
        name: presetName.trim(),
        colors: { ...customColors },
        primaryFont,
        secondaryFont
      };

      setPresets(prev => [...prev, newPreset]);
      setPresetName('');
      alert(`Preset "${newPreset.name}" saved successfully!`);
    } catch (err: any) {
      console.error('Error saving preset:', err);
      alert(err.message || 'Failed to save preset. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const applyPreset = (presetId: string) => {
    const preset = presets.find(p => p.id === presetId);
    if (preset) {
      setCustomColors(preset.colors);
      setPrimaryFont(preset.primaryFont);
      setSecondaryFont(preset.secondaryFont);
      setSkipCustomColors(false); // Enable custom colors when applying preset
    }
  };

  const deletePreset = (presetId: string) => {
    if (confirm('Delete this preset?')) {
      setPresets(prev => prev.filter(p => p.id !== presetId));
      if (selectedPreset === presetId) {
        setSelectedPreset('');
      }
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

    if (images.length === 0) {
      alert('Please select at least 1 image.');
      return;
    }

    if (images.length > MAX_FILES) {
      alert(`Maximum ${MAX_FILES} images allowed.`);
      return;
    }

    setGenerating(true);

    try {
      const userId = user.id;

      // Upload all files to Supabase
      const uploadedInfos = await Promise.all(images.map(f => uploadOne(userId, f)));

      // Prepare all data to send to single webhook
      const allData = {
        user_id: userId,
        uploaded_files: uploadedInfos,
        description: description,
        style: style,
        brand_profile: {
          palette: skipCustomColors ? {} : {
            primary: customColors.primary,
            secondary: customColors.secondary,
            accent1: customColors.accent1,
            accent2: customColors.accent2
          },
          fonts: skipCustomFonts ? {} : {
            primary: primaryFont,
            secondary: secondaryFont
          },
          defaults: { style }
        },
        carousel: {
          title: description.slice(0, 100) || "Untitled Carousel",
          aspect: ASPECT
        },
        captions: {
          text: description,
          language: "en",
          source: "user"
        },
        ai_caption: {
          language: "en",
          style: style
        },
        derivatives: {
          types: ["vertical", "square", "poster"]
        },
        search_params: {
          orientation: "vertical",
          limit: 24
        },
        post_platform: {
          platform: "instagram",
          required_derivative_types: ["vertical", "square"]
        }
      };

      // Send all data to single webhook
      const response: any = await n8nPost("/all-data", allData);

      console.log('N8N all-data response:', response);

      const carouselId = response.carousel_id || response.id;

      if (!carouselId) {
        throw new Error('No carousel ID returned from N8N');
      }

      // Fetch the generated carousel from the database and navigate to results
      try {
        const generatedCarousel = await fetchCarousel(carouselId);
        if (generatedCarousel) {
          setCurrentCarousel(generatedCarousel);
          navigate('/results');
        } else {
          alert("Carousel created successfully! Redirecting to dashboard.");
          navigate('/dashboard');
        }
      } catch (fetchError) {
        console.error('Error fetching generated carousel:', fetchError);
        alert("Carousel created successfully! Redirecting to dashboard.");
        navigate('/dashboard');
      }
    } catch (err: any) {
      console.error('Carousel generation error:', err);
      alert(err.message || "Something went wrong. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const canGenerate = images.length > 0 && description.trim() && user;

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
              <div className="flex items-center justify-between mb-4">
                <label className="block text-lg font-semibold text-gray-900">
                  Custom Colors (Optional)
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={skipCustomColors}
                    onChange={(e) => setSkipCustomColors(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 bg-gray-100 border-gray-300 rounded focus:ring-indigo-500 focus:ring-2 mr-2"
                  />
                  <span className="text-sm text-gray-600">Skip custom colors</span>
                </label>
              </div>
              <p className="text-gray-600 mb-4">
                {skipCustomColors 
                  ? 'Using default colors based on selected style' 
                  : 'Customize the colors used in your carousel design'
                }
              </p>
              <div className={`grid md:grid-cols-2 gap-6 transition-opacity ${skipCustomColors ? 'opacity-50' : ''}`}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Primary Color
                    </label>
                    <div className="flex items-center space-x-3">
                      <input
                        type="color"
                        value={customColors.primary}
                        disabled={skipCustomColors}
                        onChange={(e) => setCustomColors(prev => ({ ...prev, primary: e.target.value }))}
                        className="w-12 h-12 rounded-lg border-2 border-gray-300 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={customColors.primary}
                        disabled={skipCustomColors}
                        onChange={(e) => setCustomColors(prev => ({ ...prev, primary: e.target.value }))}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
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
                        disabled={skipCustomColors}
                        onChange={(e) => setCustomColors(prev => ({ ...prev, secondary: e.target.value }))}
                        className="w-12 h-12 rounded-lg border-2 border-gray-300 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={customColors.secondary}
                        disabled={skipCustomColors}
                        onChange={(e) => setCustomColors(prev => ({ ...prev, secondary: e.target.value }))}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
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
                        disabled={skipCustomColors}
                        onChange={(e) => setCustomColors(prev => ({ ...prev, accent1: e.target.value }))}
                        className="w-12 h-12 rounded-lg border-2 border-gray-300 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={customColors.accent1}
                        disabled={skipCustomColors}
                        onChange={(e) => setCustomColors(prev => ({ ...prev, accent1: e.target.value }))}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
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
                        disabled={skipCustomColors}
                        onChange={(e) => setCustomColors(prev => ({ ...prev, accent2: e.target.value }))}
                        className="w-12 h-12 rounded-lg border-2 border-gray-300 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={customColors.accent2}
                        disabled={skipCustomColors}
                        onChange={(e) => setCustomColors(prev => ({ ...prev, accent2: e.target.value }))}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                        placeholder="#EF4444"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Font Selection */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="block text-lg font-semibold text-gray-900">
                  Font Selection (Optional)
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={skipCustomFonts}
                    onChange={(e) => setSkipCustomFonts(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 bg-gray-100 border-gray-300 rounded focus:ring-indigo-500 focus:ring-2 mr-2"
                  />
                  <span className="text-sm text-gray-600">Skip custom fonts</span>
                </label>
              </div>
              <p className="text-gray-600 mb-6">
                {skipCustomFonts 
                  ? 'Using default fonts based on selected style' 
                  : 'Choose custom fonts for your carousel design'
                }
              </p>
              
              <div className={`grid md:grid-cols-2 gap-6 transition-opacity ${skipCustomFonts ? 'opacity-50' : ''}`}>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Primary Font
                  </label>
                  <div className="relative">
                    <select
                      value={primaryFont}
                      disabled={skipCustomFonts}
                      onChange={(e) => setPrimaryFont(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white max-h-40 overflow-y-auto disabled:bg-gray-100 disabled:cursor-not-allowed"
                      style={{ fontFamily: primaryFont }}
                    >
                      {universalFonts.map((font) => (
                        <option key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                          {font.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="text-base text-gray-700 mt-2 font-medium" style={{ fontFamily: primaryFont }}>
                    Preview: The quick brown fox jumps
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Secondary Font
                  </label>
                  <div className="relative">
                    <select
                      value={secondaryFont}
                      disabled={skipCustomFonts}
                      onChange={(e) => setSecondaryFont(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white max-h-40 overflow-y-auto disabled:bg-gray-100 disabled:cursor-not-allowed"
                      style={{ fontFamily: secondaryFont }}
                    >
                      {universalFonts.map((font) => (
                        <option key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                          {font.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="text-base text-gray-700 mt-2 font-medium" style={{ fontFamily: secondaryFont }}>
                    Preview: The quick brown fox jumps
                  </p>
                </div>
              </div>
            </div>

            {/* Brand Presets */}
            <div>
              <label className="block text-lg font-semibold text-gray-900 mb-4">
                Brand Presets (Optional)
              </label>
              <p className="text-gray-600 mb-6">Save and reuse your brand colors and fonts</p>
              
              <div className="grid md:grid-cols-2 gap-6">
                {/* Apply Preset */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Apply Saved Preset
                  </label>
                  {presets.length > 0 ? (
                    <div className="space-y-2">
                      <select
                        value={selectedPreset}
                        onChange={(e) => {
                          setSelectedPreset(e.target.value);
                          if (e.target.value) {
                            applyPreset(e.target.value);
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="">Select a preset...</option>
                        {presets.map((preset) => (
                          <option key={preset.id} value={preset.id}>
                            {preset.name}
                          </option>
                        ))}
                      </select>
                      {selectedPreset && (
                        <button
                          onClick={() => deletePreset(selectedPreset)}
                          className="text-sm text-red-600 hover:text-red-500"
                        >
                          Delete selected preset
                        </button>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 py-3 px-4 bg-gray-50 rounded-lg">
                      No presets saved yet
                    </p>
                  )}
                </div>
                
                {/* Save Current Settings */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Save Current Settings
                  </label>
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={presetName}
                      onChange={(e) => setPresetName(e.target.value)}
                      placeholder="Enter preset name..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <button
                      onClick={savePreset}
                      disabled={!presetName.trim()}
                      className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Save as Preset
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Saves current colors and font selections
                  </p>
                </div>
              </div>
              
              {presets.length > 0 && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Saved Presets:</h4>
                  <div className="flex flex-wrap gap-2">
                    {presets.map((preset) => (
                      <span
                        key={preset.id}
                        className="inline-flex items-center px-3 py-1 bg-white border border-gray-200 rounded-full text-sm"
                      >
                        {preset.name}
                        <button
                          onClick={() => deletePreset(preset.id)}
                          className="ml-2 text-red-500 hover:text-red-700"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
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