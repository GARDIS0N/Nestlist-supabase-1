import React, { useState, useEffect, useRef, DragEvent, ChangeEvent } from "react";
import { uploadListingPhoto, deleteListingPhoto } from "../lib/storage";
import { Loader2, X, AlertCircle, RefreshCw, Check } from "lucide-react";

interface PhotoUploadProps {
  propertyId: string;
  photos: string[];
  onChange: (urls: string[]) => void;
  maxPhotos?: number;
}

interface UploadingFile {
  id: string;
  name: string;
  progress: number;
  error: boolean;
  file: File;
}

const ImageSpecs: React.FC<{ url: string }> = ({ url }) => {
  const [resolution, setResolution] = useState<string>("Loading...");
  const [sizeStr, setSizeStr] = useState<string>("Loading...");
  const [isLowQuality, setIsLowQuality] = useState(false);
  const [isLarge, setIsLarge] = useState(false);

  useEffect(() => {
    let active = true;
    const img = new Image();
    img.onload = () => {
      if (!active) return;
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      setResolution(`${w}×${h}`);
      if (w < 600 || h < 600) {
        setIsLowQuality(true);
      }
      
      fetch(url, { method: "HEAD" })
        .then((res) => {
          const bytes = res.headers.get("content-length");
          if (bytes) {
            const sizeKb = Math.round(parseInt(bytes) / 1024);
            setSizeStr(sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`);
            if (sizeKb > 4096) setIsLarge(true);
            if (sizeKb < 50) setIsLowQuality(true);
          } else {
            throw new Error("No size header");
          }
        })
        .catch(() => {
          const estimatedBytes = w * h * 0.18;
          const sizeKb = Math.round(estimatedBytes / 1024);
          setSizeStr(sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`);
          if (sizeKb > 4096) setIsLarge(true);
          if (sizeKb < 50) setIsLowQuality(true);
        });
    };
    img.src = url;
    return () => {
      active = false;
    };
  }, [url]);

  return (
    <div className="mt-1 bg-stone-50/80 p-1 px-1.5 rounded border border-stone-150 flex flex-col space-y-0.5 text-[10px] text-stone-500">
      <div className="flex justify-between items-center gap-1">
        <span>Size: <strong className={isLarge ? "text-red-600" : "text-emerald-700"}>{sizeStr}</strong></span>
        <span>Res: <strong>{resolution}</strong></span>
      </div>
      {isLowQuality && (
        <span className="text-amber-600 font-bold flex items-center mt-0.5 text-[9px]">
          ⚠️ Low quality image
        </span>
      )}
    </div>
  );
};

export const PhotoUpload: React.FC<PhotoUploadProps> = ({
  propertyId,
  photos = [],
  onChange,
  maxPhotos = 8,
}) => {
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (selectedFiles: FileList) => {
    const spaceLeft = maxPhotos - photos.length - uploadingFiles.filter(f => !f.error).length;
    if (spaceLeft <= 0) {
      alert(`You can only upload up to ${maxPhotos} photos.`);
      return;
    }

    const filesToUpload = Array.from(selectedFiles).slice(0, spaceLeft);

    const newUploads = filesToUpload.map(file => ({
      id: Math.random().toString(36).substring(2),
      name: file.name,
      progress: 0,
      error: false,
      file,
    }));

    setUploadingFiles(prev => [...prev, ...newUploads]);

    for (const upload of newUploads) {
      startUpload(upload);
    }
  };

  const startUpload = async (upload: UploadingFile) => {
    try {
      const url = await uploadListingPhoto(
        upload.file,
        propertyId,
        (progress) => {
          setUploadingFiles(prev =>
            prev.map(f => (f.id === upload.id ? { ...f, progress } : f))
          );
        }
      );

      // Successfully uploaded! Add to existing photos list
      onChange([...photos, url]);

      // Remove from uploading list
      setUploadingFiles(prev => prev.filter(f => f.id !== upload.id));
    } catch (err: any) {
      console.error("Failed to upload file:", upload.name, err);
      setUploadingFiles(prev =>
        prev.map(f => (f.id === upload.id ? { ...f, error: true, progress: 0 } : f))
      );
    }
  };

  const handleRetry = (id: string) => {
    const upload = uploadingFiles.find(f => f.id === id);
    if (!upload) return;

    setUploadingFiles(prev =>
      prev.map(f => (f.id === id ? { ...f, error: false, progress: 0 } : f))
    );

    startUpload({ ...upload, error: false, progress: 0 });
  };

  const handleCancelUploading = (id: string) => {
    setUploadingFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleRemovePhoto = async (e: React.MouseEvent, index: number) => {
    e.stopPropagation(); // Avoid triggering cover change when removing
    const urlToRemove = photos[index];
    const updated = photos.filter((_, i) => i !== index);
    onChange(updated);

    try {
      await deleteListingPhoto(urlToRemove);
    } catch (err) {
      console.error("Error deleting image from storage:", err);
    }
  };

  const handleSetCover = (index: number) => {
    if (index === 0) return; // Already cover
    // Move tapped image to the 0th position
    const updated = [...photos];
    const [tapped] = updated.splice(index, 1);
    updated.unshift(tapped);
    onChange(updated);
  };

  const onDrag = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const totalActiveUploads = photos.length + uploadingFiles.filter(f => !f.error).length;

  return (
    <div className="space-y-6" id="photo-upload-container">
      {/* Upload Zone with custom premium styling */}
      {totalActiveUploads < maxPhotos && (
        <div
          onDragEnter={onDrag}
          onDragOver={onDrag}
          onDragLeave={onDrag}
          onDrop={onDrop}
          onClick={triggerFileSelect}
          style={{
            border: dragActive ? "2.5px dashed #1E6B4A" : "2.5px dashed #A7F3D0",
            borderRadius: "14px",
            background: dragActive ? "#F0FDF4" : "linear-gradient(135deg, #F0FDF4, #FFFFFF)",
          }}
          className="p-8 text-center cursor-pointer transition-all hover:bg-[#F0FDF4] hover:border-[#1E6B4A] active:scale-[0.99]"
          id="photo-upload-zone"
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={onFileChange}
            multiple
            accept="image/jpeg,image/png,image/webp,image/jpg"
            className="hidden"
            id="photo-file-input"
          />
          <div className="text-5xl mb-4 select-none">📸</div>
          <p className="font-bold text-[#0F1A14] text-base">Drop photos here or tap to select</p>
          <p className="text-[#8A9E94] text-[13px] mt-1 font-medium">JPG, PNG or WebP · Max 5MB each</p>
          <p className="text-[#4B5E54] text-xs mt-2 font-semibold">
            {photos.length}/{maxPhotos} photos added
          </p>
          <button
            type="button"
            style={{
              background: "#1E6B4A",
              color: "white",
            }}
            className="mt-4 px-5 py-2.5 rounded-xl font-bold text-sm shadow-md transition hover:opacity-90 active:scale-95"
            id="choose-photos-btn"
          >
            Choose Photos
          </button>
        </div>
      )}

      {/* Prominent Photo Count & Progress Bar */}
      <div className="bg-stone-50 border border-stone-200 p-4 rounded-xl space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-xs font-bold text-[#4B5E54] uppercase tracking-wider">
            Photo Coverage Progress
          </span>
          <span className="text-xs font-black text-[#1E6B4A]">
            {photos.length} of {maxPhotos} Photos
          </span>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-stone-200 h-2.5 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-right from-[#1E6B4A] to-[#34D399] transition-all duration-500 ease-out"
            style={{ 
              width: `${(photos.length / maxPhotos) * 100}%`,
              backgroundImage: "linear-gradient(to right, #1E6B4A, #34D399)"
            }}
          ></div>
        </div>

        {/* Tip text */}
        <div className="text-xs text-[#065F46] font-medium flex items-center gap-1.5 bg-[#F0FDF4] p-2.5 rounded-lg border border-[#A7F3D0]/50">
          <span>💡</span>
          <span>Listings with 5+ photos get 3× more inquiries</span>
        </div>
      </div>

      {/* Uploading File Status Row */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-3 bg-stone-50 p-4 rounded-xl border border-stone-200" id="uploading-status-container">
          <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500">Uploading Status</h4>
          <div className="space-y-2">
            {uploadingFiles.map((file) => (
              <div
                key={file.id}
                className={`flex items-center justify-between p-2.5 rounded-lg border ${
                  file.error ? "bg-red-50/50 border-red-200" : "bg-white border-stone-200"
                }`}
              >
                <div className="flex-1 min-w-0 mr-4">
                  <p className="text-xs font-semibold text-stone-700 truncate">{file.name}</p>
                  {file.error ? (
                    <p className="text-[10px] font-bold text-red-600 flex items-center mt-0.5">
                      <AlertCircle className="h-3 w-3 mr-1" /> Upload failed
                    </p>
                  ) : (
                    <div className="mt-1.5 flex items-center">
                      <div className="flex-1 bg-stone-200 h-1.5 rounded-full overflow-hidden mr-2">
                        <div
                          className="bg-emerald-600 h-full transition-all duration-300"
                          style={{ width: `${file.progress}%` }}
                        ></div>
                      </div>
                      <span className="text-[10px] font-bold text-stone-500">{file.progress}%</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-1.5">
                  {file.error ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleRetry(file.id)}
                        className="p-1.5 text-red-700 hover:bg-red-100 rounded-lg transition"
                        title="Retry upload"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCancelUploading(file.id)}
                        className="p-1.5 text-stone-400 hover:bg-stone-150 rounded-lg transition"
                        title="Dismiss"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </>
                  ) : (
                    <Loader2 className="h-4 w-4 text-emerald-700 animate-spin mr-1.5" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Photo Grid with Mosaic Style */}
      {photos.length > 0 ? (
        <div className="space-y-3" id="photo-grid-container">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
              Uploaded Photos ({photos.length}/{maxPhotos})
            </span>
            <span className="text-[10px] text-stone-400 italic">Tap any photo to make it the cover image.</span>
          </div>

          <div className="grid grid-cols-3 gap-3" id="uploaded-photos-grid">
            {photos.map((url, index) => {
              const isCover = index === 0;
              return (
                <div
                  key={url}
                  onClick={() => handleSetCover(index)}
                  className={`relative cursor-pointer group bg-white border rounded-xl p-1 overflow-hidden transition-all duration-200 hover:border-emerald-600 hover:shadow-md ${
                    isCover ? "col-span-2 row-span-2 border-[#1E6B4A] ring-2 ring-[#1E6B4A]/20" : "border-stone-200"
                  }`}
                >
                  <div className="relative rounded-[10px] overflow-hidden aspect-square bg-stone-50">
                    <img
                      src={url}
                      alt={`Property photo ${index + 1}`}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />

                    {/* Cover Badge */}
                    {isCover ? (
                      <span className="absolute bottom-2 left-2 bg-[#1E6B4A] text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1">
                        <Check className="h-3 w-3 stroke-[3]" /> COVER
                      </span>
                    ) : (
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-white text-[10px] font-bold bg-black/60 px-2.5 py-1 rounded-full uppercase tracking-wider">
                          Set Cover
                        </span>
                      </div>
                    )}

                    {/* Remove Button Overlayed on Hover */}
                    <button
                      type="button"
                      onClick={(e) => handleRemovePhoto(e, index)}
                      className="absolute top-1.5 right-1.5 bg-white/90 hover:bg-red-50 text-stone-800 hover:text-red-600 p-1.5 rounded-full shadow-md transition active:scale-95 z-10"
                      title="Remove Photo"
                    >
                      <X className="h-3.5 w-3.5 stroke-[2.5]" />
                    </button>
                  </div>
                  <ImageSpecs url={url} />
                </div>
              );
            })}
          </div>

          <div className="text-center pt-2">
            <span className="text-xs text-stone-400 font-medium bg-stone-100/50 py-1 px-3 rounded-full">
              Tap first photo to change cover image
            </span>
          </div>
        </div>
      ) : (
        /* Examples Placeholder Row with 30% Opacity */
        <div className="space-y-3 bg-stone-50/50 p-4 rounded-xl border border-stone-200/60 select-none">
          <p className="text-xs font-bold text-stone-400 uppercase tracking-wider text-center">
            Example: Living room · Bedroom · Kitchen
          </p>
          <div className="grid grid-cols-3 gap-3 opacity-30 pointer-events-none">
            <div className="border border-stone-200 rounded-xl overflow-hidden aspect-square bg-stone-200">
              <img 
                src="https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=300&q=80" 
                alt="Living Room example" 
                className="w-full h-full object-cover" 
              />
            </div>
            <div className="border border-stone-200 rounded-xl overflow-hidden aspect-square bg-stone-200">
              <img 
                src="https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=300&q=80" 
                alt="Bedroom example" 
                className="w-full h-full object-cover" 
              />
            </div>
            <div className="border border-stone-200 rounded-xl overflow-hidden aspect-square bg-stone-200">
              <img 
                src="https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=300&q=80" 
                alt="Kitchen example" 
                className="w-full h-full object-cover" 
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
