'use client';

import Lenis from '@studio-freight/lenis';
import React, { useEffect, useState, useRef, Suspense } from 'react';
import { PillMain } from '#/ui/desktop/pill-main';
import { PillAccent } from '#/ui/desktop/pill-accent';
import { PillBlue } from './desktop/pill-blue';
import { PillFill } from './desktop/pill-fill';
import List from './list/list';
import Contact from './contact/contact';
import AsciiDonut from './asciiDonut';
import Gallery from './gallery';
import SquareInfoBox from './squareInfobox';
import Card from './desktop/card';
import MagnetButton from './magnetButton';
import { set } from 'date-fns';

export default function Mobile() {
  const [fillWidth, setFillWidth] = useState(0);
  const [mainPillZIndex, setMainPillZIndex] = useState(0);
  const [offsetMain, setOffsetMain] = useState(0);
  const [offsetAccent, setOffsetAccent] = useState(0);
  const [offsetBlue, setOffsetBlue] = useState(-800);
  const [offsetFill, setOffsetFill] = useState(-500);
  const [donutVisible, setDonutVisible] = useState(false);
  const [donutScale, setDonutScale] = useState(1);

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
      setOffsetMain(-((scrollPosition - 0 - 0) / 0.3));
      setOffsetAccent(-((scrollPosition - 0 - 0) / 2));
      setOffsetFill(-((scrollPosition - 0 - 1500) / 0.5));
      setOffsetBlue(-800 + scrollPosition);
      setMainPillZIndex(0);
      if (scrollPosition > 500) {
        setMainPillZIndex(99);
      } else {
        setMainPillZIndex(0);
      }
      if (scrollPosition > 1000) {
        setFillWidth((scrollPosition - 1200) * 3.5);
      } else {
        setFillWidth(0);
      }
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
    // set isPrimaryWidth to true if the screen width is greater than the height dynamically when resize
    const handleResize = () => {
      let scale = Math.min(window.innerWidth / 1024, window.innerHeight / 768);
      scale = scale > 1 ? 1 : scale;
      setDonutScale(scale);
    };
    window.addEventListener('resize', handleResize);
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
          <div className="font-cygre ml-[25%] pt-[30%] text-[10vw] font-black">
            Jonathan
          </div>
          <div className="font-mosk md:text-theme-neon lg:text-theme-red 2xl:text-theme-brown z-[13] ml-[25%]  mt-[-1.5rem] w-[100%] text-left font-extralight sm:text-[1rem] lg:text-[1.1rem] xl:text-[1.2rem] xl:text-[#4b63ff] 2xl:text-[1.3rem]">
            I am a software engineering student at the University of Waterloo,
            with a burning passion for digital design and code. Welcome to my
            portfolio of my work in code, art, and design.
          </div>
        </div>
        <div className="absolute left-[50%] isolate z-10 h-screen w-[50%]">
          <img src="/portrait_BG.png" alt="portrait" className="w-[40vw]"></img>
        </div>
        <div
          className={`grid-rows-7 relative grid h-screen grid-cols-8 gap-0 mix-blend-difference ${
            mainPillZIndex === 0 ? 'z-0' : 'z-50'
          }`}
        >
          <div className="relative col-span-1 col-start-7 row-span-3 row-start-3">
            <PillBlue
              strokeDashoffset={offsetBlue}
              className="absolute h-[70vw] origin-left sm:mt-[-48vw] md:ml-[-35vw] lg:ml-[-28vw] lg:mt-[-40vw] xl:ml-[-20vw] xl:mt-[-35vw] 2xl:ml-[-15vw] 2xl:mt-[-30vw]"
            />
          </div>
          <div className="relative col-span-2 col-start-1 row-span-1 row-start-2">
            <PillAccent
              strokeDashoffset={offsetAccent}
              className="absolute h-[140vw] w-[140vw] origin-left -translate-x-[10%] sm:mt-[-75vw] lg:mt-[-72vw] xl:mt-[-68vw] "
            />
          </div>
          <div className="relative col-span-1 col-start-5 row-span-2 row-start-1">
            <PillMain
              strokeDashoffset={offsetMain}
              className={`absolute -left-[45vw] mt-[-65vw] h-[200vw] w-[200vw] origin-left mix-blend-difference`}
            />
          </div>
        </div>
      </section>
      <div className="absolute h-[100vh] w-[100vw] overflow-x-clip">
        <PillFill
          strokeWidth={fillWidth}
          strokeDashoffset={offsetFill}
          className={`absolute -left-[70vw] mt-[-30vw] h-[200vw] w-[200vw] origin-left sm:mt-[60vw] md:mt-[34vw] lg:mt-[8vw] xl:mt-[-28vw] 2xl:mt-[-40vw]`}
        />
      </div>
      <div className="h-screen bg-black"></div>
      <div className="bg-black md:h-[60vh] xl:h-[85vw] 2xl:h-[80vw]">
        <div className="font-cygre sticky top-[65vh] text-center text-[10vw] font-black text-black">
          i code.
          <AsciiDonut
            scale={donutScale}
            className={`font-cygre absolute left-[50%] z-[-1] translate-x-[-50%] text-[1.2rem] font-black text-[#9f9b90] sm:top-[-45vw] md:top-[-55vw] lg:top-[-45vw] xl:top-[-40vw] 2xl:top-[-30vw] ${
              donutVisible ? 'animate-fadeIn' : 'animate-fadeOut opacity-0'
            }`}
          />
        </div>
      </div>
      <section className="bg-theme-brown relative z-[5] flex min-h-screen justify-center">
        <div className="absolute left-[50%] translate-x-[-50%]">
          <List />
          <div className="h-[30px]"></div>
          <MagnetButton
            content="see more"
            href="/code"
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
            <div className="font-cygre pointer-events-none absolute left-[5vw] z-10 w-[90vw] text-[10vw] font-black text-[#333333]">
              i design.
            </div>
          </div>
          <div className="absolute ml-[50vw] mt-[50vh]">
            <SquareInfoBox
              size={500}
              className="bg-[url(/moti.png)] bg-cover bg-center"
            />
          </div>
          <div className="absolute ml-[10vw] mt-[110vh]">
            <SquareInfoBox
              size={500}
              className="bg-[url(/summer_guide.png)] bg-cover bg-center"
            />
          </div>
          <div className="absolute ml-[60vw] mt-[160vh]">
            <SquareInfoBox
              size={500}
              className="bg-[url(/yearbook.png)] bg-cover bg-center"
            />
          </div>
        </div>
      </section>

      <section className="h-[100vh]"></section>

      <section className="font-cygre flex  h-[100vh] w-screen flex-col items-center justify-center gap-10 overflow-hidden bg-black">
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
