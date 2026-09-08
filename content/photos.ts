export interface Photo {
  id: string;
  /** Path under /public/photos, referenced from the site root, e.g. "/photos/example.jpg" */
  src: string;
  alt: string;
  caption?: string;
  category?: string;
}

// Add a photo: drop the file in public/photos/, then add one entry here.
export const photos: Photo[] = [
  // { id: "example", src: "/photos/example.jpg", alt: "Describe the photo", category: "art" },
];
