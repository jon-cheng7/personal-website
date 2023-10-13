'use client';

import Lenis from '@studio-freight/lenis';
import InViewObserver from '#/ui/view-observer';
import { useEffect, useState, useRef } from 'react';
import { PillRed } from '#/ui/desktop/pill-red';
import { PillBrown } from '#/ui/desktop/pill-brown';
import { PillBlue } from './desktop/pill-blue';

import Trail from '#/ui/trail';
import Image from 'next/image';

export default function Mobile() {
  const [isDiff, setIsDiff] = useState(true);
  const [offsetRed, setOffsetRed] = useState(0);
  const [redWidth, setRedWidth] = useState(0);
  const [offsetBrown, setOffsetBrown] = useState(0);
  const [offsetWhite2, setOffsetWhite2] = useState(0);
  const [offsetBlue, setOffsetBlue] = useState(-800);
  const [open, setOpen] = useState(true);

  //i code
  const codeRef = useRef(null);

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
    if (scrollPosition > 500) {
      setIsDiff(false);
    } else {
      setIsDiff(true);
    }

    //auto-scrolling
    if (scrollPosition > 600) {
      window.scrollTo({
        top: 2600, // Target scroll position
        behavior: 'smooth',
      });
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
          <div className="font-cygre pl-[25%] pt-[30%] text-[10vw] font-black">
            Jonathan
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
                isDiff ? 'z-0 mix-blend-difference' : 'z-[11]'
              } oßrigin-left absolute -left-[105vw] top-0 mt-[-10vw] h-[200vw] w-[200vw]`}
            />
          </div>
        </div>
      </section>
      <section className="h-[200vh] bg-black"></section>
      <section className="relative z-[20] h-screen bg-[#B7B0A4]">
        <div className="relative -top-[20vw] left-[5vw] h-[120vh] w-[80vw] outline">
          <div className="font-cygre sticky top-[70vh] z-[12] text-[10vw] font-black text-black">
            i code.
          </div>
        </div>
      </section>
      <section className="h-screen bg-green-400"></section>
      <section className="flex h-screen w-screen flex-col items-center justify-center gap-10 overflow-hidden bg-red-400">
        <div className="font-cygre text-center text-[4rem] font-black leading-[2.5rem]">
          let&apos;s connect
        </div>
        <a
          href="mailto:jonathan.ch126@gmail.com"
          className="rounded-full outline outline-[0.1rem]"
        >
          <button className="font-mosk p-5">message me</button>
        </a>
      </section>
    </div>
  );
}
