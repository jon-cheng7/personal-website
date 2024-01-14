'use client';
import React, { useEffect, useState, useRef } from 'react';
import gsap from 'gsap';
import {
  ArrowLeft,
  ArrowRight,
  InstagramLogo,
  LinkedinLogo,
  Envelope,
} from 'phosphor-react';
import { set } from 'date-fns';

interface TeamMember {
  name: string;
  role: string;
}

const team: TeamMember[] = [
  { name: 'Ava Sinclair', role: 'Creative Director' },
  { name: 'Liam Archer', role: 'Brand Strategist' },
  { name: 'Zoe Clementine', role: 'Lead Designer' },
  { name: 'Ethan Hawthorne', role: 'Chief Innovation Officer' },
];

interface SlideMessages {
  [key: number]: string;
}

const slideMessages: SlideMessages = {
  1: "I love CS and Math which led me to pursue a career in software engineering here at UW, but I've got plenty of other interests too.",
  2: 'I enjoy the arts, especially music and visual. Fun fact: I can play 6 instruments! Thats violin, viola, piano, sax, clarinet, and guitar.',
  3: 'My cute spoiled shiba x mini aussie: Taro',
  4: "I love the nature and photography. My family often goes on long road trips. Here's a photo from Yellowstone National Park.",
};

export default function Page() {
  const [currentSlide, setCurrentSlide] = useState<number>(1);
  const [showRightArrow, setShowRightArrow] = useState<number>(0);

  const totalSlides: number = team.length;
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const cursor = cursorRef.current;
      if (cursor) {
        gsap.to(cursor, {
          x: e.clientX,
          y: e.clientY,
          duration: 1,
          ease: 'power3.out',
        });
        updateCursorClass(e.clientX);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [currentSlide]);

  const updateCursorClass = (xPosition: number) => {
    const cursor = cursorRef.current;
    if (!cursor) return;

    const sectionWidth = window.innerWidth / 3;

    if (xPosition < sectionWidth) {
      // Cursor is on the left side
      setShowRightArrow(0);
    } else if (xPosition >= sectionWidth && xPosition < 2 * sectionWidth) {
      // Cursor is in the middle
      setShowRightArrow(1);
    } else {
      // Cursor is on the right side
      setShowRightArrow(2);
    }
  };

  const animateSlide = (slideNumber: number, reveal: boolean) => {
    const marquee = document.querySelector(`.t-${slideNumber}.marquee-wrapper`);
    const img = document.getElementById(`t-${slideNumber}`);
    const clipPathValue = reveal
      ? 'polygon(0% 100%, 100% 100%, 100% 0%, 0% 0%)'
      : 'polygon(0 100%, 100% 100%, 100% 100%, 0% 100%)';

    gsap.to(marquee, {
      clipPath: clipPathValue,
      duration: 1,
      ease: 'power4.out',
      delay: 0.3,
    });
    gsap.to(img, { clipPath: clipPathValue, duration: 1, ease: 'power4.out' });
  };

  const handleRightClick = () => {
    if (currentSlide < totalSlides) {
      animateSlide(currentSlide + 1, true);
      setCurrentSlide(currentSlide + 1);
    }
  };

  const handleLeftClick = () => {
    if (currentSlide > 1) {
      animateSlide(currentSlide, false);
      setCurrentSlide(currentSlide - 1);
    }
  };

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const sectionWidth = window.innerWidth / 3;

      if (e.clientX < sectionWidth) {
        // Cursor is on the left third of the screen
        handleLeftClick();
      } else if (e.clientX > 2 * sectionWidth) {
        // Cursor is on the right third of the screen
        handleRightClick();
      }
      // Do nothing if the cursor is in the middle third
    };

    document.addEventListener('click', handleClick);
    return () => {
      document.removeEventListener('click', handleClick);
    };
  }, [currentSlide]);

  return (
    <>
      <div className="h-[100vh] bg-red-400">
        <div className="font-cygre container h-[100vh] w-[100vw] cursor-none overflow-hidden font-black">
          <div className="overlay pointer-events-none absolute left-0 top-0 h-[100%] w-[100%] overflow-hidden text-black">
            <div
              className="t-1 marquee-wrapper absolute left-0 top-0 h-[100%] w-[100%] bg-[#fff]"
              style={{
                clipPath: 'polygon(0% 100%, 100% 100%, 100% 0%, 0% 0%)',
              }}
            >
              <h1
                className="animate-marquee absolute left-[-100%] top-[50%] w-[100%] whitespace-nowrap text-center text-[240px] font-[400]"
                style={{ transform: 'translate(-50%,-50%)' }}
              >
                JON JON JON JONATHAN CHENG JONATHAN
              </h1>
            </div>
            <div
              className="t-2 marquee-wrapper absolute left-0 top-0 h-[100%] w-[100%] bg-[#c4bca9]"
              style={{
                clipPath: 'polygon(0% 100%, 100% 100%, 100% 100%, 0% 100%)',
              }}
            >
              <h1
                className="animate-marquee absolute left-[-100%] top-[50%] w-[100%] whitespace-nowrap text-center text-[240px] font-[400]"
                style={{ transform: 'translate(-50%,-50%)' }}
              >
                ARTS ARTS ARTS ARTS ARTS ARTS ARTS
              </h1>
            </div>
            <div
              className="t-3 marquee-wrapper absolute left-0 top-0 h-[100%] w-[100%] bg-[#fff]"
              style={{
                clipPath: 'polygon(0% 100%, 100% 100%, 100% 100%, 0% 100%)',
              }}
            >
              <h1
                className="animate-marquee absolute left-[-100%] top-[50%] w-[100%] whitespace-nowrap text-center text-[240px] font-[400]"
                style={{ transform: 'translate(-50%,-50%)' }}
              >
                LOL BO GOOD GOOD __ BOY GOOD BOY
              </h1>
            </div>
            <div
              className="t-4 marquee-wrapper absolute left-0 top-0 h-[100%] w-[100%] bg-[#8e908a]"
              style={{
                clipPath: 'polygon(0% 100%, 100% 100%, 100% 100%, 0% 100%)',
              }}
            >
              <h1
                className="animate-marquee absolute left-[-100%] top-[50%] w-[100%] whitespace-nowrap text-center text-[240px] font-[400]"
                style={{ transform: 'translate(-50%,-50%)' }}
              >
                YELLOWSTONE YELLOWSTONE YELLOWSTONE
              </h1>
            </div>
          </div>
          <div
            className="modal absolute left-[50%] top-[50%] h-[700px] w-[500px]"
            style={{ transform: 'translate(-50%, -50%)' }}
          >
            <div className="modal-images h-[600px] w-[100%]">
              <div
                className="img absolute h-[100%] w-[100%] bg-[#fff]"
                style={{
                  clipPath: 'polygon(0% 100%, 100% 100%, 100% 0%, 0% 0%)',
                }}
                id="t-1"
              >
                <img src="./assets/team-1.jpg" alt="" />
              </div>

              <div
                className="img absolute h-[100%] w-[100%] bg-[#c4bca9]"
                style={{
                  clipPath: 'polygon(0% 100%, 100% 100%, 100% 100%, 0% 100%)',
                }}
                id="t-2"
              >
                <img src="./assets/team-2.jpg" alt="" />
              </div>

              <div
                className="img absolute h-[100%] w-[100%] bg-[#fff]"
                style={{
                  clipPath: 'polygon(0% 100%, 100% 100%, 100% 100%, 0% 100%)',
                }}
                id="t-3"
              >
                <img src="./assets/team-3.jpg" alt="" />
              </div>

              <div
                className="img absolute h-[100%] w-[100%] bg-[#8e908a]"
                style={{
                  clipPath: 'polygon(0% 100%, 100% 100%, 100% 100%, 0% 100%)',
                }}
                id="t-4"
              >
                <img src="./assets/team-4.jpg" alt="" />
              </div>
            </div>
          </div>
        </div>

        <div
          className={`cursor absolute left-0 top-0 z-[50] text-[30px] ${
            showRightArrow == 1 ? 'mix-blend-normal' : 'mix-blend-difference'
          }`}
          ref={cursorRef}
        >
          {showRightArrow == 1 ? (
            <div className="font-cygre w-fit max-w-[30vw] rounded-lg bg-[#000000e1] px-8 py-4 text-[1.25rem] mix-blend-normal">
              {slideMessages[currentSlide]}
            </div>
          ) : (
            <></>
          )}
          {showRightArrow == 2 ? <ArrowRight size={30} /> : <></>}
          {showRightArrow == 0 ? <ArrowLeft size={30} /> : <></>}
        </div>
      </div>
    </>
  );
}
