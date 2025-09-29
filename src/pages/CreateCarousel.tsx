import React, { useState } from 'react';
import { supabase } from "@/lib/supabase";
import { n8nPost } from "@/lib/n8n";
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { 
  Upload, 
  X, 
  Wand2, 
  Image as ImageIcon,
  ArrowRight
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

export default function CreateCarousel() {
  const [images, setImages] = useState<File[]>([]);
  const [message, setMessage] = useState('');
  const [style, setStyle] = useState<'minimal' | 'bold' | 'elegant'>('minimal');
  const [customColors, setCustomColors] = useState({
    primary: '#5B5F97',
    secondary: '#10B981', 
    accent1: '#F59E0B',
    accent2: '#EF4444'
  });
  const [primaryFont, setPrimaryFont] = useState('Inter');
  const [secondaryFont, setSecondaryFont] = useState('Roboto');
  const [generating, setGenerating] = useState(false);
  
  const { user } = useAuth();
  const navigate = useNavigate();

  const universalFonts = [
    'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 
    'Source Sans Pro', 'Raleway', 'Ubuntu', 'Nunito', 'Poppins'
  ];

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newFiles = files.slice(0, MAX_FILES - images.length);
    setImages(prev => [...prev, ...newFiles]);
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  // Main handler for Generate Carousel button
  const handleGenerateCarousel = async () => {
    if (!user) {
      alert('Please log in to generate carousels.');
      return;
    }

    try {
      setGenerating(true);

      if (images.length === 0) throw new Error("Please select at least 1 image.");
      if (images.length > MAX_FILES) throw new Error(`Max ${MAX_FILES} images.`);

      const userId = user.id;

      // upload all files
      const uploadedInfos = await Promise.all(images.map(f => uploadOne(userId, f)));

      // ingest + derivatives
      const mediaIds: string[] = [];
      for (const info of uploadedInfos) {
        const ing: any = await n8nPost("/ingest", info);
        mediaIds.push(ing.media_id);

        await n8nPost("/derivatives", {
          media_id: ing.media_id,
          types: ["vertical","square","poster"]
        });
      }

      // brand profile
      const brand: any = await n8nPost("/brand_profile", {
        palette: { 
          primary: customColors.primary, 
          secondary: customColors.secondary, 
          accent1: customColors.accent1, 
          accent2: customColors.accent2 
        },
        fonts: { primary: primaryFont, secondary: secondaryFont },
        defaults: { style }
      });

      // carousel
      const carousel: any = await n8nPost("/carousel", {
        title: message || "Untitled Carousel",
        aspect: ASPECT,
        brand_profile_id: brand.brand_profile_id
      });

      // slides
      let pos = 1;
      for (const media_id of mediaIds) {
        await n8nPost("/carousel_slide", {
          carousel_id: carousel.carousel_id,
          media_id,
          position: pos
        });
        pos++;
      }

      alert("Carousel created! Check your dashboard.");
      navigate('/dashboard');
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Something went wrong.");
    } finally {
      setGenerating(false);
    }
  };

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
                Upload Images ({images.length}/{MAX_FILES})
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
                  <p className="text-gray-600 mb-4">Select up to {MAX_FILES} images for your carousel</p>
                  <label className="inline-flex items-center px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg cursor-pointer hover:bg-indigo-200 transition-colors">
                    <Upload className="h-4 w-4 mr-2" />
                    Choose Files
                    <input
                      id="fileInput"
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              )}
            </div>

            {/* Message Input */}
            <div>
              <label className="block text-lg font-semibold text-gray-900 mb-4">
                Describe Your Message
              </label>
              <textarea
                id="messageInput"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe what you want to communicate with this carousel..."
                className="w-full h-32 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                maxLength={500}
              />
            </div>

            {/* Style Selection */}
            <div>
              <label className="block text-lg font-semibold text-gray-900 mb-4">
                Choose Style
              </label>
              <div className="grid md:grid-cols-3 gap-4">
                {[
                  { value: 'minimal', name: 'Minimal', desc: 'Clean, simple design with lots of white space' },
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
                Custom Colors
              </label>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Primary Color</label>
                    <input
                      id="primaryColor"
                      type="color"
                      value={customColors.primary}
                      onChange={(e) => setCustomColors(prev => ({ ...prev, primary: e.target.value }))}
                      className="w-full h-12 rounded-lg border-2 border-gray-300 cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Secondary Color</label>
                    <input
                      id="secondaryColor"
                      type="color"
                      value={customColors.secondary}
                      onChange={(e) => setCustomColors(prev => ({ ...prev, secondary: e.target.value }))}
                      className="w-full h-12 rounded-lg border-2 border-gray-300 cursor-pointer"
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Accent Color 1</label>
                    <input
                      id="accent1"
                      type="color"
                      value={customColors.accent1}
                      onChange={(e) => setCustomColors(prev => ({ ...prev, accent1: e.target.value }))}
                      className="w-full h-12 rounded-lg border-2 border-gray-300 cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Accent Color 2</label>
                    <input
                      id="accent2"
                      type="color"
                      value={customColors.accent2}
                      onChange={(e) => setCustomColors(prev => ({ ...prev, accent2: e.target.value }))}
                      className="w-full h-12 rounded-lg border-2 border-gray-300 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Font Selection */}
            <div>
              <label className="block text-lg font-semibold text-gray-900 mb-4">
                Font Selection
              </label>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Primary Font</label>
                  <select
                    id="primaryFont"
                    value={primaryFont}
                    onChange={(e) => setPrimaryFont(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    {universalFonts.map((font) => (
                      <option key={font} value={font}>{font}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Secondary Font</label>
                  <select
                    id="secondaryFont"
                    value={secondaryFont}
                    onChange={(e) => setSecondaryFont(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    {universalFonts.map((font) => (
                      <option key={font} value={font}>{font}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Generate Button */}
            <div className="flex justify-end">
              <button
                onClick={handleGenerateCarousel}
                disabled={images.length === 0 || generating}
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
        </div>
      </main>
    </div>
  );
}