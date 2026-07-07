import { supabase } from './supabase';

const BUCKET = 'property-images';

// Compress image before upload
async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const img = new Image();
    img.onload = () => {
      let [w, h] = [img.width, img.height];
      if (w > 1200) { h = Math.round(h * 1200 / w); w = 1200; }
      if (h > 900)  { w = Math.round(w * 900 / h);  h = 900;  }
      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => resolve(blob!),
        'image/jpeg',
        0.78
      );
    };
    img.src = URL.createObjectURL(file);
  });
}

// Upload a listing photo
export async function uploadListingPhoto(
  file: File,
  propertyId: string,
  onProgress?: (pct: number) => void
): Promise<string> {
  // Validate file
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('File too large. Maximum size is 5MB.');
  }
  if (!file.type.startsWith('image/')) {
    throw new Error('Only image files are allowed.');
  }

  // Compress
  if (onProgress) onProgress(10);
  const compressed = await compressImage(file);
  if (onProgress) onProgress(30);

  // Get active session for landlord_id
  const { data: { session } } = await supabase.auth.getSession();
  const landlordId = session?.user?.id || 'unknown';
  const timestamp = Date.now();
  const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
  const filename = `${landlordId}/${propertyId}/${timestamp}-${cleanFileName}`;

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(filename, compressed, {
      contentType: 'image/jpeg',
      upsert: false,
    });

  if (error) {
    throw new Error('Upload failed: ' + error.message);
  }

  if (onProgress) onProgress(90);

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(data.path);

  if (onProgress) onProgress(100);

  return urlData.publicUrl;
}

// Upload profile avatar
export async function uploadAvatar(
  file: File,
  userId: string
): Promise<string> {
  if (file.size > 2 * 1024 * 1024) {
    throw new Error('Avatar too large. Maximum size is 2MB.');
  }

  const compressed = await compressImage(file);
  const filename = `profiles/${userId}/avatar.jpg`;

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(filename, compressed, {
      contentType: 'image/jpeg',
      upsert: true,
    });

  if (error) throw new Error('Avatar upload failed: ' + error.message);

  const { data: urlData } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(data.path);

  return urlData.publicUrl;
}

// Delete a listing photo by URL
export async function deleteListingPhoto(
  photoUrl: string
): Promise<void> {
  // Extract path from URL - handle both potential bucket names
  const bucketName = photoUrl.includes('/property-images/') ? 'property-images' : 'nestlist-images';
  const urlParts = photoUrl.split(`/${bucketName}/`);
  if (urlParts.length < 2) return;
  const path = urlParts[1];

  const { error } = await supabase.storage
    .from(bucketName)
    .remove([path]);

  if (error) {
    console.error('Failed to delete photo:', error.message);
  }
}

// Delete all photos for a listing
export async function deleteAllListingPhotos(
  propertyId: string
): Promise<void> {
  // Attempt on primary bucket
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .list(`listings/${propertyId}`);

  if (!error && data?.length) {
    const paths = data.map(f => `listings/${propertyId}/${f.name}`);
    await supabase.storage.from(BUCKET).remove(paths);
  }
}

// Get public URL for a stored path
export function getPublicUrl(path: string): string {
  const { data } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(path);
  return data.publicUrl;
}
