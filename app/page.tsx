'use client';

import { demos } from '#/lib/demos';
import Link from 'next/link';
import InViewObserver from '#/ui/view-observer';
import { useEffect, useState, useRef } from 'react';
import { PillRed } from '#/ui/pill-red';
import { PillBlue } from '#/ui/pill-blue';
import { PillGray } from '#/ui/pill-gray';
import { TechList } from '#/ui/tech-stack';
import Carousel from '#/ui/carousel';
import { Design } from '#/ui/designSVG';
import { DesignStroke } from '#/ui/DesignStroke';
import Button from '#/ui/button';
import ExpandingCircle from '#/ui/expanding-circle';
import Image from 'next/image';
import { useSpring, animated } from '@react-spring/web';

export default function Page() {
  const [offsetRed, setOffsetRed] = useState(0);
  const [offsetBlue, setOffsetBlue] = useState(0);
  const [offsetGray, setOffsetGray] = useState(0);
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
    '/blueperiod1.png',
    '/shyboy.png',
    '/hands.PNG',
    '/shave.jpeg',
    '/devil.jpg',
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

  const [props, api] = useSpring(
    () => ({
      from: { opacity: 0 },
      to: { opacity: 1 },
    }),
    [],
  );

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
      <div className="relative h-[250vh] overflow-hidden bg-[url(/collage.png)] bg-cover">
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
      </div>

      <div className={`left-0 top-0 h-screen w-screen bg-green-400`}>
        {/* <div className='font-mosk z-[100] float-right mr-3 w-[90%] text-right text-[1rem]'> 
            I’ve always had a creative side that complemented my more analytical
            and technical half. I have a deep passion for intelligent design
            that not only captures attention but inspired thought.
          </div> */}
      </div>
      <animated.div className="h-screen bg-red-400"></animated.div>
    </div>
  );
}
