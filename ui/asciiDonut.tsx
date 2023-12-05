import React, { useState, useEffect } from 'react';

interface AsciiProps {
  scale: number;
  className?: string;
}

const AsciiDonut: React.FC<AsciiProps> = ({ scale, className }) => {
  const [ascii, setAscii] = useState('');

  useEffect(() => {
    let A: number = 1,
      B: number = 1;

    const interval = setInterval(() => {
      setAscii(generateNewFrame(A, B, scale));
      A += 0.15;
      B += 0.07;
    }, 100);

    return () => clearInterval(interval);
  }, [scale]);

  const generateNewFrame = (A: number, B: number, scale: number) => {
    const width = 50;
    const height = 30;
    let b = new Array(width * height);
    let z = new Array(width * height);
    const cA = Math.cos(A),
      sA = Math.sin(A),
      cB = Math.cos(B),
      sB = Math.sin(B);

    for (let k = 0; k < 1760; k++) {
      b[k] = k % width === width - 1 ? '\n' : ' ';
      z[k] = 0;
    }

    for (let j = 0; j < 6.28; j += 0.07) {
      const ct = Math.cos(j),
        st = Math.sin(j);
      for (let i = 0; i < 6.28; i += 0.02) {
        const sp = Math.sin(i),
          cp = Math.cos(i),
          h = ct + 2,
          D = 1 / (sp * h * sA + st * cA + 5),
          t = sp * h * cA - st * sA;

        const x = 0 | (width / 2 + scale * 30 * D * (cp * h * cB - t * sB)),
          y = 0 | (height / 2 + scale * 15 * D * (cp * h * sB + t * cB)),
          o = x + width * y,
          N =
            0 |
            (8 *
              ((st * sA - sp * ct * cA) * cB -
                sp * ct * sA -
                st * cA -
                cp * ct * sB));

        if (y >= 0 && y < height && x >= 0 && x < width && D > z[o]) {
          z[o] = D;
          b[o] = '.,-~:;=!*#$@'[N > 0 ? N : 0];
        }
      }
    }

    return b.join('');
  };

  return (
    <pre
      style={{ fontFamily: 'monospace', fontWeight: 'lighter' }}
      className={className}
    >
      {ascii}
    </pre>
  );
};

export default AsciiDonut;
