'use client';

import { demos } from '#/lib/demos';
import Link from 'next/link';
import InViewObserver from '#/ui/view-observer';
import { useEffect, useState, useRef } from 'react';
import { PillRed } from '#/ui/pill-red';
import { PillBlue } from '#/ui/pill-blue';
import { PillGray } from '#/ui/pill-gray';
import ExpandingCircle from '#/ui/expanding-circle';
import Image from 'next/image';

export default function Page() {
  const [offsetRed, setOffsetRed] = useState(0);
  const [offsetBlue, setOffsetBlue] = useState(0);
  const [offsetGray, setOffsetGray] = useState(0);
  const [offsetGray2, setOffsetGray2] = useState(0);
  const [strokeWidth, setStrokeWidth] = useState(125);
  const [strokeWidth2, setStrokeWidth2] = useState(0);
  const [translation, setTranslation] = useState(20);

  //inView variables
  const [inView1, setInView1] = useState(false);
  const [inView2, setInView2] = useState(false);

  const handleScroll = () => {
    const scrollPosition = window.scrollY;
    //-((scrollPosition - minScroll - offsetAdjustment) / speedFactor)
    setOffsetRed(-((scrollPosition - 0 - 0) / 0.7));
    setOffsetBlue(-((scrollPosition - 0 - 0) / 1.3));
    setOffsetGray(-((scrollPosition - 0 - 0) / 1.3));
    setStrokeWidth(scrollPosition < 400 ? 125 : 125 + (scrollPosition - 400));
    setStrokeWidth2(scrollPosition < 400 ? 125 : 10 + (scrollPosition - 400));
  };

  useEffect(() => {
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });

        ticking = true;
      }
    });
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <div>
      <div className="relative grid">
        <div className="z-10 flex justify-center">
          <Image
            src="/portrait_BG.png"
            width={500}
            height={500}
            alt="Jonathan's Headshot"
          />
        </div>
        <InViewObserver onInViewChange={(isInView) => setInView1(isInView)}>
          <div
            className={`z-1 font-cygre z-[13] mt-[-6rem] text-center text-6xl font-black text-gray-300 ${
              inView1 ? 'animate-fadeIn' : 'opacity-0'
            }`}
          >
            Jonathan
          </div>
        </InViewObserver>
        <div className="z-5 flex justify-center">
          <InViewObserver onInViewChange={(isInView) => setInView2(isInView)}>
            <div
              className={`text-3sm font-mosk z-[13] mt-[-1.5rem] w-[90%] text-center font-extralight ${
                inView2 ? 'animate-[fadeIn_2s_ease-in-out]' : 'opacity-0'
              }`}
            >
              I’m a creative and innovative thinker with a love for coding and
              digital design. I’m currently pursuing a degree in software
              engineering at the University of Waterloo.
            </div>
          </InViewObserver>
        </div>
        <PillRed
          className="absolute z-0 ml-[50%] mt-[-30%]"
          strokeDashoffset={offsetRed}
        />
        <PillBlue
          className="absolute z-[12] ml-[0%] mt-[30%]"
          strokeDashoffset={offsetBlue}
        />
        <PillGray
          className="absolute z-[12] ml-[-108%] mt-[30%]"
          strokeDashoffset={offsetGray}
          strokeWidth={strokeWidth}
        />
      </div>
      <div className="h-[140vh]">
        <div className="relative flex justify-center">
          <ExpandingCircle
            offset={763}
            className={`absolute mt-[190px] -translate-y-[100px]`}
          />
        </div>
      </div>
      {/* BUFFER */}
      <div className="h-[50vh] bg-[#B7B0A4]"></div>
      <div className=" h-screen"></div>
      <></>
    </div>
  );
}
