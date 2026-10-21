// Photo gallery manifest.
// Fits: future gallery.

/** src under /public/photos; alt required. */
export interface Photo {
  id: string;
  src: string;
  alt: string;
  caption?: string;
  category?: string;
}

export const photos: Photo[] = [
];
