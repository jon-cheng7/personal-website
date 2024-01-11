'use client';

import Lenis from '@studio-freight/lenis';
import React, { useEffect, useState, useRef, Suspense } from 'react';
import { PillRed } from '#/ui/desktop/pill-red';
import { PillBrown } from '#/ui/desktop/pill-brown';
import { PillBlue } from './desktop/pill-blue';
import List from './list/list';
import AsciiDonut from './asciiDonut';
import Gallery from './gallery';
import SquareInfoBox from './squareInfobox';
import FloatingBalls from './floatingBalls';
import Card from './desktop/card';
import MagnetButton from './magnetButton';

export default function Mobile() {
  const [isDiff, setIsDiff] = useState(true);
  const [offsetRed, setOffsetRed] = useState(0);
  const [redWidth, setRedWidth] = useState(0);
  const [offsetBrown, setOffsetBrown] = useState(0);
  const [offsetWhite2, setOffsetWhite2] = useState(0);
  const [offsetBlue, setOffsetBlue] = useState(-800);
  const [donutVisible, setDonutVisible] = useState(false);
  const LazyFloatingBalls = React.lazy(() => import('./floatingBalls'));

  const imageList = [
    '/art/blueperiod1.png',
    '/art/blueperiod2.png',
    '/art/shyboy.png',
    '/art/hands.PNG',
    '/art/shave.jpeg',
  ];

  const logos = [
    '/logos/photoshop.svg',
    '/logos/illustrator.svg',
    '/logos/indesign.svg',
    '/logos/XD.svg',
    '/logos/figma.svg',
    '/logos/blender.svg',
    '/logos/procreate.svg',
    '/logos/framer.svg',
  ];

  const handleScroll = () => {
    const scrollPosition = window.scrollY;
    //-((scrollPosition - minScroll - offsetAdjustment) / speedFactor)
    if (scrollPosition > 0 && scrollPosition < 2000) {
      setOffsetRed(-((scrollPosition - 0 - 0) / 0.3));
      setOffsetBrown(-((scrollPosition - 0 - 0) / 2));
      setOffsetWhite2(-((scrollPosition - 0 - 600) / 0.5));
      setOffsetBlue(-800 + scrollPosition);
      if (scrollPosition > 800) {
        setRedWidth((scrollPosition - 800) * 3.5);
      } else {
        setRedWidth(0);
      }
    }
    if (scrollPosition > 700) {
      setIsDiff(false);
    } else {
      setIsDiff(true);
    }
    if (scrollPosition > 1700) {
      setDonutVisible(true);
    } else {
      setDonutVisible(false);
    }
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

  useEffect(() => {
    const lenis = new Lenis({
      lerp: 0.07,
      wheelMultiplier: 0.5,
    });

    lenis.on('scroll', (e: Event) => {
      console.log(e);
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
    };
  }, []);

  return (
    <div>
      <section className="h-screen w-screen bg-black">
        <div className="absolute h-screen w-[50%]">
          <div className="font-cygre ml-[25%] pt-[30%] text-[10vw] font-black ">
            Jonathan
          </div>
          <div className="font-mosk z-[13] ml-[25%] mt-[-1.5rem] w-[100%] text-left text-[1.3rem] font-extralight ">
            I’m a creative and innovative thinker with a love for coding and
            digital design. I’m currently pursuing a degree in software
            engineering at the University of Waterloo.
          </div>
        </div>
        <div className="absolute left-[50%] isolate z-10 h-screen w-[50%]">
          <img src="/portrait_BG.png" alt="portrait" className="w-[40vw]"></img>
        </div>
        <div className="grid-rows-7 grid h-screen grid-cols-8 gap-0">
          <div className="relative col-span-1 col-start-7 row-span-3 row-start-3">
            <PillBlue
              strokeDashoffset={offsetBlue}
              className="absolute ml-[-15vw] mt-[-25vw] h-[70vw] origin-left"
            />
          </div>
          <div className="relative col-span-2 col-start-1 row-span-1 row-start-2">
            <PillBrown
              strokeDashoffset={offsetBrown}
              className="absolute mt-[-65vw] h-[140vw] w-[140vw] origin-left -translate-x-[10%]"
            />
          </div>
          <div className="relative col-span-1 col-start-5 row-span-2 row-start-1">
            <PillRed
              strokeWidth={redWidth}
              strokeDashoffset={offsetRed}
              className={`${
                isDiff ? 'z-0 mix-blend-difference' : 'z-[4]'
              } absolute -left-[105vw] top-0 mt-[-10vw] h-[200vw] w-[200vw] origin-left`}
            />
          </div>
        </div>
      </section>
      <div className="h-screen bg-black"></div>
      <div className="h-screen bg-black"></div>
      <section className="bg-theme-brown relative z-[5] flex min-h-screen justify-center">
        {/* <div className={`z-[100] absolute border mt-[-50%]`}>
          <Suspense fallback={<div>Loading...</div>}>
            <LazyFloatingBalls />
          </Suspense>
        </div> */}
        <div className="relative -top-[40vw] h-[70vh] w-[80vw]">
          <div className="font-cygre sticky top-[65vh] text-center text-[10vw] font-black text-black">
            i code.
            <AsciiDonut
              scale={1}
              className={`font-cygre absolute left-[50%] top-[-220%] z-[-1] translate-x-[-50%] text-[1.2rem] font-black text-[#9f9b90] ${
                donutVisible ? 'animate-fadeIn' : 'animate-fadeOut opacity-0'
              }`}
            />
          </div>
        </div>
        <div className="absolute left-[50%] translate-x-[-50%]">
          <List />

          {/* <button className="mt-[10%] rounded-full outline outline-[0.1rem] font-mosk px-8 py-2 text-[#333333]">see more</button> */}
          <div className="h-[30px]"></div>
          <MagnetButton
            content="see more"
            inverse={false}
            className="font-mosk rounded-full px-8 py-2 text-[#333333]"
          />
        </div>
      </section>

      <section className="h-100vh relative z-[2] bg-black">
        <div className="relative -top-[28vh] h-[120vh] w-[100vw]">
          <div className="sticky top-[70vh]">
            <div className="font-cygre pointer-events-none absolute left-[5vw] z-[100] w-[90vw] text-[10vw] font-black text-white mix-blend-difference">
              i draw.
            </div>
            <Gallery
              photos={imageList}
              className="absolute top-[-70vh] z-[10] w-screen"
            />
          </div>
        </div>
      </section>

      <section className="relative z-[1] h-[200vh] bg-black">
        <div className="relative h-[170vh] w-[100vw]">
          <div className="sticky top-[70vh]">
            <div className="font-cygre pointer-events-none absolute left-[5vw] z-10 w-[90vw] text-[10vw] font-black text-white">
              i design.
            </div>
          </div>
          <div className="absolute ml-[50vw] mt-[50vh]">
            <SquareInfoBox size={500} className="bg-red-400" />
          </div>
          <div className="absolute ml-[10vw] mt-[110vh]">
            <SquareInfoBox size={500} className="bg-red-400" />
          </div>
          <div className="absolute ml-[60vw] mt-[140vh]">
            <SquareInfoBox size={500} className="bg-red-400" />
          </div>
        </div>
      </section>

      <section className="font-cygre flex  h-screen w-screen flex-col items-center justify-center gap-10 overflow-hidden bg-black">
        <div className="text-center text-[4rem] font-black leading-[2.5rem]">
          let&apos;s connect
        </div>
        <MagnetButton
          inverse={true}
          href="mailto:jonathan.ch126@gmail.com"
          content="message me"
          className="font-cygre rounded-full px-10 py-5 text-[#333333]"
        />
      </section>
    </div>
  );
}
