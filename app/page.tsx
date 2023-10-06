'use client';

import { demos } from '#/lib/demos';
import Link from 'next/link';
import Lenis from '@studio-freight/lenis';
import { Parallax, ParallaxLayer } from '@react-spring/parallax';

import InViewObserver from '#/ui/view-observer';
import { useEffect, useState, useRef } from 'react';
import { PillRed } from '#/ui/pill-red';
import { PillBlue } from '#/ui/pill-blue';
import { PillGray } from '#/ui/pill-gray';
import { PillRed2 } from '#/ui/pill-red2';
import { PillBlue2 } from '#/ui/pill-blue2';
import { PillGray2 } from '#/ui/pill-gray2';
import { TechList } from '#/ui/tech-stack';
import Carousel from '#/ui/carousel';
import { Design } from '#/ui/designSVG';
import { DesignStroke } from '#/ui/DesignStroke';
import Button from '#/ui/button';
import ExpandingCircle from '#/ui/expanding-circle';
import LogoSlide from '#/ui/logoSlide';
import Image from 'next/image';

export default function Page() {
  const [offsetRed, setOffsetRed] = useState(0);
  const [offsetBlue, setOffsetBlue] = useState(0);
  const [offsetGray, setOffsetGray] = useState(0);

  const [offsetRed2, setOffsetRed2] = useState(-909);
  const [offsetBlue2, setOffsetBlue2] = useState(-909);
  const [offsetGray2, setOffsetGray2] = useState(-900);

  const [offsetDesign, setOffsetDesign] = useState(22000);
  const [translateDesign, setTranslateDesign] = useState(0);
  const [strokeWidth, setStrokeWidth] = useState(125);
  const [isBlack, setIsBlack] = useState(true);

  //inView variables
  const [inView1, setInView1] = useState(false);
  const [inView2, setInView2] = useState(false);
  const [inView3, setInView3] = useState(false);
  const [inView4, setInView4] = useState(false);

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
    if (scrollPosition < 600) {
      setOffsetRed(-((scrollPosition - 0 - 0) / 0.7));
      setOffsetBlue(-((scrollPosition - 0 - 0) / 1.3));
    }
    if (scrollPosition < 800) {
      setOffsetGray(-((scrollPosition - 0 - 0) / 1.3));
      setStrokeWidth(scrollPosition < 400 ? 125 : 125 + (scrollPosition - 400));
    }

    if (scrollPosition > 4000) {
      setOffsetGray2(-((scrollPosition - 4850 - 0) / 1.1));
      setOffsetRed2(-((scrollPosition - 4600 - 0) / 0.7));
      setOffsetBlue2(-((scrollPosition - 4900 - 0) / 0.9));
    }

    if (scrollPosition > 2900 && scrollPosition < 3450) {
      setTranslateDesign(scrollPosition - 2900);
    }
    if (scrollPosition > 1000 && scrollPosition < 5000) {
      setOffsetDesign((4000 - scrollPosition) / 0.1);
    }

    if (scrollPosition > 2800 && scrollPosition < 6000) {
      setInView3(true);
    } else {
      setInView3(false);
    }

    if (scrollPosition > 3300 && scrollPosition < 6000) {
      setInView4(true);
    } else {
      setInView4(false);
    }

    if (scrollPosition > 1000) {
      setIsBlack(false);
    } else {
      setIsBlack(true);
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
      wheelMultiplier: 0.8,
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
            className={`font-cygre z-[13] mt-[-6rem] text-center text-6xl font-black text-gray-300 ${
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
      <div
        className={`relative flex h-[280vh] flex-col items-center space-x-0 ${
          isBlack ? '' : 'bg-[#B7B0A4]'
        }`}
      >
        <div className="justify-items relative flex">
          <ExpandingCircle
            offset={763}
            className={`absolute mt-[190px] flex-grow -translate-y-[100px]`}
          />
        </div>
        <div className="font-cygre z-[13] mt-[50%] w-screen flex-none text-clip whitespace-nowrap pl-[1.5rem] text-left text-[3.5rem] font-black text-black">
          i code.
        </div>
        <TechList
          start={900}
          end={2150}
          className={`sticky top-[10%] z-[50] mt-[20%] flex flex-col`}
        ></TechList>
      </div>
      {/* BUFFER */}
      <div className="flex h-[20vh] items-center justify-center bg-[#B7B0A4]">
        <Button route="/code">see my projects</Button>
      </div>
      <div className="relative h-[220vh] overflow-hidden bg-[url(/collage.png)] bg-cover">
        <div
          className={`absolute z-0 mx-auto mt-[240%] aspect-[1/1] w-screen max-w-[1200px] ${
            inView3 ? 'animate-fadeIn' : 'opacity-0'
          }`}
        >
          <Carousel images={imageList} />
        </div>

        <div
          className="z-[50] mt-[35%] "
          style={{ transform: `translateY(calc(30% + ${translateDesign}px))` }}
        >
          <DesignStroke
            className={`absolute`}
            strokeDashoffset={offsetDesign}
          />
          <Design
            className={`absolute ${
              inView4 ? 'animate-fadeIn' : 'animate-fadeOut opacity-0'
            }`}
          />
        </div>
        <div className="absolute mt-[315%] flex w-screen justify-center">
          <div className=" font-mosk w-[90%] text-center text-[0.8rem]">
            I’ve always had a creative side that complemented my more analytical
            and technical half. I have a deep passion for intelligent design
            that not only captures attention but inspires thought.
          </div>
        </div>
        <div className="absolute mt-[340%]">
          <LogoSlide logos={logos} className="" />
        </div>
        <Button
          route="/art"
          bgColor="bg-white"
          textColor="text-black"
          hoverColor="bg-[#4C4F6C]"
          className="absolute left-[50%] mt-[360%] -translate-x-[50%]"
        >
          see more
        </Button>
      </div>

      <div className={`relative h-[130vh] w-screen bg-black`}>
        <PillGray2
          className="pointer-events-none absolute ml-[-30%] mt-[-110%]"
          strokeDashoffset={offsetGray2}
        />
        <PillRed2
          className="pointer-events-none absolute ml-[-30%] mt-[-90%]"
          strokeDashoffset={offsetRed2}
        />
        <PillBlue2
          className="pointer-events-none absolute ml-[-30%] mt-[-70%]"
          strokeDashoffset={offsetBlue2}
        />
        <div className="flex h-[125vh] flex-col items-center justify-center gap-10">
          <div className="h-[10rem]"></div>
          <div className="font-cygre text-center text-[4rem] font-black leading-[2.5rem]">
            let&apos;s connect
          </div>
          <a
            href="mailto:jonathan.ch126@gmail.com"
            className="rounded-full outline outline-[0.1rem]"
          >
            <button className="font-mosk p-5">message me</button>
          </a>
        </div>

        <div className="absolute left-1/2 mb-[10%] flex w-[90%] -translate-x-1/2 justify-between">
          <a
            href="https://linkedin.com/in/cheng-jonathan"
            className="flex-shrink-0"
          >
            <div className="font-mosk text-sm font-black">IN</div>
          </a>
          <a href="https://github.com/jon-cheng7" className="flex-shrink-0">
            <div className="font-mosk text-sm font-black">GH</div>
          </a>
          <a
            href="https://instagram.com/artwithjon?igshid=OGQ5ZDc2ODk2ZA=="
            className="flex-shrink-0"
          >
            <div className="font-mosk text-sm font-black">IG</div>
          </a>
        </div>
      </div>
    </div>
  );
}
