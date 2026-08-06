import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Extracts a safe initial from a display name for avatar fallback rendering.
 * Filters out non-alphanumeric characters (e.g., <script>alert('XSS')</script> -> 'S', #John -> 'J').
 * Returns null if no valid alphanumeric characters exist, prompting a generic silhouette icon fallback.
 */
export function getAvatarInitial(name?: string): string | null {
  if (!name) return null;
  const cleanName = name.replace(/[^a-zA-Z0-9]/g, '').trim();
  if (!cleanName) return null;
  return cleanName.charAt(0).toUpperCase();
}

/**
 * Resizes and compresses an image file to a lightweight JPEG Data URL.
 * Prevents payload overflow and internal server errors on base64 profile picture uploads.
 */
export function compressImage(
  file: File,
  maxWidth = 300,
  maxHeight = 300,
  quality = 0.85
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image file.'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable.'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Validates display name to ensure special characters (e.g. !@#$%^&*) are rejected.
 * Allows letters, numbers, spaces, hyphens, dots, and apostrophes, but requires at least one letter.
 */
export function validateName(name: string): string | null {
  const clean = name.trim();
  if (!clean) return 'Please enter your name.';
  if (clean.length < 2) {
    return 'Name must be at least 2 characters long.';
  }
  if (!/^[a-zA-Z0-9\s.\-']+$/.test(clean)) {
    return 'Name cannot contain special characters (e.g., !@#$%^&*).';
  }
  if (!/[a-zA-Z]/.test(clean)) {
    return 'Name must contain at least one letter.';
  }
  return null;
}

/**
 * Validates email format ensuring standard user@domain.tld format with a valid top-level domain.
 */
export function validateEmail(email: string): string | null {
  const clean = email.trim();
  if (!clean) return 'Please enter an email address.';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!emailRegex.test(clean)) {
    return 'Please enter correct email format';
  }
  return null;
}
