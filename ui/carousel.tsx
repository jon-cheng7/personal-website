import React from 'react';
import { ArrowSmLeftIcon, ArrowSmRightIcon } from '@heroicons/react/solid';
import { Circle } from './circleSVG';
import { DoubleCircle } from './doubleCircleSVG';

type CarouselProps = {
  images: string[];
};

const Carousel: React.FC<CarouselProps> = ({ images }) => {
  const [imageIndex, setImageIndex] = React.useState(0);
  const carouselRef = React.useRef<HTMLDivElement>(null);
  const [playSquishLeft, setPlaySquishLeft] = React.useState(false);
  const [playSquishRight, setPlaySquishRight] = React.useState(false);

  React.useEffect(() => {
    let startX: number;

    const onTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
    };

    const onTouchEnd = (e: TouchEvent) => {
      let endX = e.changedTouches[0].clientX;
      let difference = startX - endX;

      if (difference > 30) {
        // Threshold to trigger swipe
        showNextImage(); // Swiped left
      } else if (difference < -30) {
        showPrevImage(); // Swiped right
      }
    };

    const carouselElement = carouselRef.current;
    if (carouselElement) {
      carouselElement.addEventListener('touchstart', onTouchStart);
      carouselElement.addEventListener('touchend', onTouchEnd);
    }

    return () => {
      if (carouselElement) {
        carouselElement.removeEventListener('touchstart', onTouchStart);
        carouselElement.removeEventListener('touchend', onTouchEnd);
      }
    };
  }, []);

  function showNextImage() {
    setImageIndex((index) => {
      if (index === images.length - 1) {
        return 0;
      } else {
        return index + 1;
      }
    });
  }

  function showPrevImage() {
    setImageIndex((index) => {
      if (index === 0) {
        return images.length - 1;
      } else {
        return index - 1;
      }
    });
  }

  const handlePrevClick = () => {
    showPrevImage();
    setPlaySquishLeft(true);
    setTimeout(() => setPlaySquishLeft(false), 200);
  };

  const handleNextClick = () => {
    showNextImage();
    setPlaySquishRight(true);
    setTimeout(() => setPlaySquishRight(false), 200);
  };

  return (
    <div ref={carouselRef} className="relative h-[100%] w-[100%]">
      <div
        style={{
          translate: `${-100 * imageIndex}%`,
          transition: `translate 300ms ease-in-out`,
        }}
        className={`flex h-[100%] w-[100%] flex-shrink-0 flex-grow-0`}
      >
        {images.map((pic) => (
          <img
            key={pic}
            src={pic}
            className="cover block h-[100%] w-[100%] rounded-[5rem]"
          />
        ))}
      </div>
      {/* <img src={images[imageIndex]} className="cover w-[100%] h-[100%] block"/> */}
      <button
        onClick={handlePrevClick}
        className={`absolute bottom-0 left-0 top-0 block h-full w-10 ${
          playSquishLeft ? 'animate-squish' : ''
        }`}
      >
        <ArrowSmLeftIcon />
      </button>
      <button
        onClick={handleNextClick}
        className={`absolute bottom-0 right-0 top-0 block h-full w-10 ${
          playSquishRight ? 'animate-squish' : ''
        }`}
      >
        <ArrowSmRightIcon />
      </button>
      <div className="absolute bottom-[-1.5rem] left-[50%] flex -translate-x-[50%] gap-[0.25rem] hover:scale-[1.2]">
        {images.map((_, idx) => (
          <button onClick={() => setImageIndex(idx)}>
            {idx === imageIndex ? <Circle /> : <DoubleCircle />}
          </button>
        ))}
      </div>
    </div>
  );
};

export default Carousel;
