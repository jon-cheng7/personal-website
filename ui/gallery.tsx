import React, { useState } from 'react';

type GalleryProps = {
  photos: string[];
  className?: string;
};

const Gallery: React.FC<GalleryProps> = ({ photos, className }) => {
  const [expanded, setExpanded] = useState<number>(0);

  const calculateWidth = (index: number) => {
    const totalPhotos = photos.length;
    if (expanded === index) {
      // Assign more width to the expanded photo
      return '60%';
    } else if (expanded !== null) {
      // Distribute remaining width among collapsed photos
      return `${40 / (totalPhotos - 1)}%`;
    }
    // Default width when no photo is expanded
    return `${100 / totalPhotos}%`;
  };

  const setBrightness = (index: number) => {
    if (expanded === index) {
      return '100%';
    } else {
      return '20%';
    }
  };

  return (
    <div
      style={{ display: 'flex', width: '100%', overflow: 'hidden' }}
      className={className}
    >
      {photos.map((photos, index) => (
        <div
          key={index}
          style={{
            backgroundImage: `url(${photos})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            width: calculateWidth(index),
            height: '975px', // Fixed height
            filter: `brightness(${setBrightness(index)})`,
            cursor: 'pointer',
            transition: 'width 0.7s ease',
          }}
          onClick={() => setExpanded(index)}
        />
      ))}
    </div>
  );
};

export default Gallery;
