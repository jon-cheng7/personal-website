'use client';

import Lenis from '@studio-freight/lenis';
import InViewObserver from '#/ui/view-observer';
import { useEffect, useState, useRef } from 'react';
import { PillRed } from '#/ui/pill-red';
import { PillBlue } from '#/ui/pill-blue';
import { PillGray } from '#/ui/pill-gray';
import { PillRed2 } from '#/ui/pill-red2';
import { PillBlue2 } from '#/ui/pill-blue2';
import { PillGray2 } from '#/ui/pill-gray2';
import { TechList } from '#/ui/tech-stack';
import { Design } from '#/ui/designSVG';
import { DesignStroke } from '#/ui/DesignStroke';
import Button from '#/ui/button';
import ExpandingCircle from '#/ui/expanding-circle';
import LogoSlide from '#/ui/logoSlide';
import CardStack from '#/ui/cardStack';
import Image from 'next/image';

export default function Mobile() {
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
      setOffsetBlue2(-((scrollPosition - 4950 - 0) / 0.9));
    } else {
      setOffsetGray2(-910);
      setOffsetRed2(-910);
      setOffsetBlue2(-910);
    }

    if (scrollPosition > 2900 && scrollPosition < 3450) {
      setTranslateDesign(scrollPosition - 2900);
    }
    if (scrollPosition > 1000 && scrollPosition < 5000) {
      setOffsetDesign((4000 - scrollPosition) / 0.1);
    }

    if (scrollPosition > 3000 && scrollPosition < 6000) {
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
      <div className="relative h-screen w-screen overflow-hidden">
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
