import { GalleryImage } from '../types';

const DB_NAME = 'PoseMasterDB';
const DB_VERSION = 2; // Increased version to force schema update
const STORE_NAME = 'images';

// Open Database
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // If store exists (from v1 or bad state), delete it to ensure fresh schema with correct keyPath
      if (db.objectStoreNames.contains(STORE_NAME)) {
        db.deleteObjectStore(STORE_NAME);
      }

      // Create store with keyPath 'id' to ensure objects have their ID injected
      db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = (event) => reject((event.target as IDBOpenDBRequest).error);
  });
};

// Save Image
export const saveImageToGallery = async (base64Image: string): Promise<number> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    // Do not include 'id', it will be generated and injected by keyPath
    const image = {
      src: base64Image,
      timestamp: Date.now(),
    };

    const request = store.add(image);

    request.onsuccess = () => resolve(request.result as number);
    request.onerror = () => reject(request.error);
  });
};

// Update Image
export const updateImageInGallery = async (id: number, base64Image: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const getRequest = store.get(id);

    getRequest.onsuccess = () => {
      const image = getRequest.result as GalleryImage;
      if (image) {
        image.src = base64Image;
        const updateRequest = store.put(image);
        updateRequest.onsuccess = () => resolve();
        updateRequest.onerror = () => reject(updateRequest.error);
      } else {
        reject(new Error('Image not found'));
      }
    };

    getRequest.onerror = () => reject(getRequest.error);
  });
};

// Get All Images (Newest first)
export const getGalleryImages = async (): Promise<GalleryImage[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      const result = request.result || [];
      // Ensure we treat them as GalleryImage[]
      const images = result as GalleryImage[];
      // Sort by timestamp descending (newest first)
      images.sort((a, b) => b.timestamp - a.timestamp);
      resolve(images);
    };
    request.onerror = () => reject(request.error);
  });
};

// Delete Image
export const deleteImageFromGallery = async (id: number): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

// Get Latest Image for Thumbnail
export const getLatestImage = async (): Promise<GalleryImage | null> => {
  const images = await getGalleryImages();
  return images.length > 0 ? images[0] : null;
};
