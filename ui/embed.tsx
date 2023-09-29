import dynamic from 'next/dynamic';
import { useEffect } from 'react';

const SplineViewer = dynamic(
  () => {
    return import('./SplineViewerComponent');
  },
  { ssr: false }, // This will load the component only on the client side.
);

const SplineEmbed: React.FC = () => {
  useEffect(() => {
    const script = document.createElement('script');
    script.src =
      'https://unpkg.com/@splinetool/viewer@0.9.455/build/spline-viewer.js';
    script.type = 'module';
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return <SplineViewer />;
};

export default SplineEmbed;
