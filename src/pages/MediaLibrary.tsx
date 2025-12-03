import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useContentLibrary, type LibraryImage } from '../contexts/ContentLibraryContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import Navbar from '../components/Navbar';
import { 
  ArrowLeft,
  Upload, 
  Image as ImageIcon,
  Trash2,
  Download,
  Search,
  Grid3X3,
  List
} from 'lucide-react';

export default function MediaLibrary() {
  const { images, addUploadedFiles, removeImage, refreshLibrary } = useContentLibrary();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const uploadOne = async (userId: string, file: File) => {
    const safeName = file.name.replace(/[^\w.-]/g, '_');
    const ts = Date.now();
    // Storage policy expects first folder = user_<auth.uid()>
    const path = `user_${userId}/${new Date().toISOString().slice(0,10)}/${ts}_${crypto.randomUUID()}_${safeName}`;
    const filename = path.split('/').pop() || safeName;

    const { error } = await supabase.storage
      .from('media')
      .upload(path, file, { upsert: false });

    if (error) throw error;

    return {
      bucket: 'media',
      path,
      filename,
      mime_type: file.type || 'application/octet-stream',
      size_bytes: file.size,
      created_at: new Date().toISOString()
    };
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    if (!user) {
      alert('Please log in to upload to your media library.');
      return;
    }
    const session = await supabase.auth.getSession();
    if (!session.data.session) {
      alert('Your session expired. Please log back in to upload.');
      return;
    }
    // ensure supabase client is using the current session for RLS + storage
    try {
      await supabase.auth.setSession({
        access_token: session.data.session.access_token,
        refresh_token: session.data.session.refresh_token ?? "",
      });
    } catch (err) {
      console.error('Failed to set supabase session before upload:', err);
    }

    setUploading(true);
    try {
      const uploadedInfos = await Promise.all(files.map(file => uploadOne(user.id, file)));
      // Persist into media table as library assets
      const rows = uploadedInfos.map((info) => ({
        user_id: user.id,
        bucket: info.bucket,
        path: info.path,
        filename: info.filename || info.path.split('/').pop() || 'file',
        mime_type: info.mime_type || 'application/octet-stream',
        size_bytes: info.size_bytes || 0,
        media_type: 'image',
        visibility: 'private',
        is_library: true,
      }));
      const { error } = await supabase.from('media').insert(rows);
      if (error) throw error;
      await addUploadedFiles(
        uploadedInfos.map((u) => ({ ...u, is_library: true }))
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Upload failed. Please try again.';
      console.error('Failed to upload images:', err);
      alert(message);
    } finally {
      setUploading(false);
    }

    // Reset the input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const filteredImages = images.filter(image =>
    image.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectAllVisible = () => {
    setSelectedImages(new Set(filteredImages.map(img => img.id)));
  };

  const clearSelection = () => setSelectedImages(new Set());

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const toggleImageSelection = (imageId: string) => {
    const newSelected = new Set(selectedImages);
    if (newSelected.has(imageId)) {
      newSelected.delete(imageId);
    } else {
      newSelected.add(imageId);
    }
    setSelectedImages(newSelected);
  };

  const handleBulkDelete = async () => {
    if (selectedImages.size === 0 || deleting) return;

    const confirmMessage = `Delete ${selectedImages.size} selected image${selectedImages.size === 1 ? '' : 's'}?`;
    const confirmed = typeof window !== 'undefined' ? window.confirm(confirmMessage) : true;
    if (!confirmed) return;

    setDeleting(true);
    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session) {
        alert('Please log in again before deleting images.');
        return;
      }
      try {
        await supabase.auth.setSession({
          access_token: session.data.session.access_token,
          refresh_token: session.data.session.refresh_token ?? '',
        });
      } catch (err) {
        console.warn('Failed to refresh Supabase session before delete:', err);
      }

      const ids = Array.from(selectedImages);
      await Promise.all(ids.map((imageId) => removeImage(imageId)));
      setSelectedImages(new Set());
      await refreshLibrary();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Delete failed. Please try again.';
      console.error('Bulk delete failed:', err);
      alert(message);
    } finally {
      setDeleting(false);
    }
  };

  const handleDownloadImage = (image: LibraryImage) => {
    const link = document.createElement('a');
    link.href = image.url;
    link.download = image.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-ink">
      <Navbar />
      
      <main className="pt-20 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <Link 
              to="/dashboard" 
              className="inline-flex items-center text-pacific hover:text-vanilla font-medium mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-vanilla mb-2">Media Library</h1>
                <p className="text-vanilla/70">Manage your uploaded images ({images.length} files)</p>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className={`inline-flex items-center px-4 py-2 font-medium rounded-lg transition-colors ${uploading ? 'bg-pacific/60 cursor-not-allowed text-white' : 'bg-pacific hover:bg-pacific-deep text-white'}`}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploading ? 'Uploading…' : 'Upload Images'}
                </button>
                {images.length > 0 && (
                  <button
                    onClick={() => {
                      if (selectedImages.size === filteredImages.length) {
                        clearSelection();
                      } else {
                        selectAllVisible();
                      }
                    }}
                    className="inline-flex items-center px-4 py-2 bg-surface hover:bg-surface-alt text-vanilla/80 font-medium rounded-lg transition-colors border border-charcoal/50"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {selectedImages.size === filteredImages.length ? 'Deselect All' : 'Select All'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="bg-surface rounded-lg shadow-sm p-4 mb-6 border border-charcoal/50">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-vanilla/55" />
                  <input
                    type="text"
                    placeholder="Search images..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-charcoal/50 rounded-lg bg-surface focus:ring-2 focus:ring-pacific focus:border-pacific w-64"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-3">
                {selectedImages.size > 0 && (
                  <button
                    onClick={handleBulkDelete}
                    type="button"
                    disabled={deleting}
                    className={`inline-flex items-center px-3 py-2 rounded-lg transition-colors border ${
                      deleting
                        ? 'bg-surface text-red-300 border-red-400/30 cursor-not-allowed'
                        : 'bg-surface-alt hover:bg-surface text-red-400 border-red-400/30'
                    }`}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {deleting ? 'Deleting…' : `Delete (${selectedImages.size})`}
                  </button>
                )}
                <div className="flex bg-surface-alt rounded-lg p-1 border border-charcoal/50">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-md transition-colors ${
                      viewMode === 'grid' ? 'bg-surface shadow-sm' : 'hover:bg-surface'
                    }`}
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-md transition-colors ${
                      viewMode === 'list' ? 'bg-surface shadow-sm' : 'hover:bg-surface'
                    }`}
                  >
                    <List className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          {filteredImages.length === 0 ? (
            <div className="text-center py-12">
              <div className="max-w-sm mx-auto">
                <div className="w-16 h-16 bg-surface rounded-full flex items-center justify-center mx-auto mb-4 border border-charcoal/50">
                  <ImageIcon className="h-8 w-8 text-vanilla/55" />
                </div>
                <h3 className="text-lg font-medium text-vanilla mb-2">
                  {images.length === 0 ? 'No images uploaded' : 'No images match your search'}
                </h3>
                <p className="text-vanilla/70 mb-6">
                  {images.length === 0 
                    ? 'Upload images to build your media library'
                    : 'Try adjusting your search terms'
                  }
                </p>
                {images.length === 0 && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className={`inline-flex items-center px-4 py-2 font-medium rounded-lg transition-colors ${uploading ? 'bg-pacific/60 cursor-not-allowed text-white' : 'bg-pacific hover:bg-pacific-deep text-white'}`}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {uploading ? 'Uploading…' : 'Upload Images'}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {filteredImages.map((image) => (
                    <div key={image.id} className="relative group bg-surface rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all">
                      <div className="aspect-square relative">
                        <img
                          src={image.url}
                          alt={image.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors">
                          <div className="absolute top-2 left-2">
                            <input
                              type="checkbox"
                              checked={selectedImages.has(image.id)}
                              onChange={() => toggleImageSelection(image.id)}
                              className="w-4 h-4 text-pacific bg-surface border-charcoal/50 rounded focus:ring-indigo-500"
                            />
                          </div>
                          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="flex space-x-1">
                              <button
                                onClick={() => handleDownloadImage(image)}
                                className="p-1.5 bg-surface/90 hover:bg-surface text-vanilla/80 rounded-md transition-colors"
                              >
                                <Download className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => removeImage(image.id)}
                                className="p-1.5 bg-surface/90 hover:bg-surface text-red-600 rounded-md transition-colors"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="p-3">
                        <p className="text-sm font-medium text-vanilla truncate" title={image.name}>
                          {image.name}
                        </p>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-vanilla/60">{formatFileSize(image.size)}</span>
                          <span className="text-xs text-vanilla/60">{formatDate(image.uploadedAt)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-surface rounded-lg shadow-sm overflow-hidden">
                  <div className="grid grid-cols-12 gap-4 p-4 bg-ink text-sm font-medium text-vanilla/80">
                    <div className="col-span-1">
                      <input
                        type="checkbox"
                        checked={selectedImages.size === filteredImages.length}
                        onChange={() => {
                          if (selectedImages.size === filteredImages.length) {
                            setSelectedImages(new Set());
                          } else {
                            setSelectedImages(new Set(filteredImages.map(img => img.id)));
                          }
                        }}
                        className="w-4 h-4 text-pacific bg-surface border-charcoal/50 rounded focus:ring-pacific"
                      />
                    </div>
                    <div className="col-span-2">Preview</div>
                    <div className="col-span-4">Name</div>
                    <div className="col-span-2">Size</div>
                    <div className="col-span-2">Date</div>
                    <div className="col-span-1">Actions</div>
                  </div>
                  <div className="divide-y divide-charcoal/40">
                    {filteredImages.map((image) => (
                      <div key={image.id} className="grid grid-cols-12 gap-4 p-4 hover:bg-ink transition-colors">
                        <div className="col-span-1">
                          <input
                            type="checkbox"
                            checked={selectedImages.has(image.id)}
                            onChange={() => toggleImageSelection(image.id)}
                            className="w-4 h-4 text-pacific bg-surface border-charcoal/50 rounded focus:ring-pacific"
                          />
                        </div>
                        <div className="col-span-2">
                          <img
                            src={image.url}
                            alt={image.name}
                            className="w-12 h-12 object-cover rounded-lg"
                          />
                        </div>
                        <div className="col-span-4">
                          <p className="font-medium text-vanilla truncate" title={image.name}>
                            {image.name}
                          </p>
                        </div>
                        <div className="col-span-2">
                          <span className="text-sm text-vanilla/70">{formatFileSize(image.size)}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-sm text-vanilla/70">{formatDate(image.uploadedAt)}</span>
                        </div>
                        <div className="col-span-1">
                          <div className="flex space-x-1">
                            <button
                              onClick={() => handleDownloadImage(image)}
                              className="p-1 hover:bg-surface text-vanilla/70 rounded transition-colors"
                            >
                              <Download className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => removeImage(image.id)}
                              className="p-1 hover:bg-surface text-red-500 rounded transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      </main>
    </div>
  );
}
