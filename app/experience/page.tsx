'use client';
import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { set } from 'date-fns';
// import './styles.css';

export default function Page() {
  const [activeSlide, setActiveSlide] = useState(0);
  const sliderRef = useRef<HTMLDivElement>(null);
  const sliderWrapperRef = useRef<HTMLDivElement>(null);
  const markerWrapperRef = useRef<HTMLDivElement>(null);
  const activeSlideRef = useRef<HTMLDivElement>(null);
  const n = 4;

  useEffect(() => {
    let target = 0;
    let current = 0;
    const ease = 0.075;

    const slider = sliderRef.current;
    const sliderWrapper = sliderWrapperRef.current;
    const markerWrapper = markerWrapperRef.current;
    const activeSlide = activeSlideRef.current;

    let maxScroll = sliderWrapper!.offsetWidth - window.innerWidth;

    const lerp = (start: number, end: number, factor: number) => {
      return start + (end - start) * factor;
    };

    const updateActiveSlideNumber = (
      markerMove: number,
      markerMaxMove: number,
    ) => {
      const partWidth = markerMaxMove / n;
      let currentPart = Math.min(
        Math.round((markerMove - 200) / partWidth) + 1,
        n,
      );
      setActiveSlide(currentPart);
      currentPart = Math.min(n, currentPart);
      if (activeSlide) {
        activeSlide.textContent = `${currentPart}/${n}`;
      }
    };

    const update = () => {
      current = lerp(current, target, ease);

      if (sliderWrapper) {
        gsap.set(sliderWrapper, {
          x: -current,
        });
      }

      if (markerWrapper) {
        const moveRatio = current / maxScroll;
        const markerMaxMove =
          window.innerWidth - markerWrapper.offsetWidth - 170;
        const markerMove = 70 + moveRatio * markerMaxMove;

        gsap.set(markerWrapper, {
          x: markerMove,
        });

        updateActiveSlideNumber(markerMove, markerMaxMove);
      }

      requestAnimationFrame(update);
    };

    window.addEventListener('resize', () => {
      if (sliderWrapper) {
        maxScroll = sliderWrapper.offsetWidth - window.innerWidth;
      }
    });

    window.addEventListener('wheel', (e) => {
      target += e.deltaY;
      target = Math.max(0, target);
      target = Math.min(maxScroll, target);
    });

    update();

    return () => {
      window.removeEventListener('resize', () => {});
      window.removeEventListener('wheel', () => {});
    };
  }, []);

  return (
    <div className="h-screen">
      <nav className="fixed mt-[5vh] flex w-[100%] justify-between p-[20px] text-[15px] text-white opacity-[0.4]">
        <div className="flex gap-[50px]">
          <div>TIMELINE</div>
          <div>SCROLL </div>
        </div>
      </nav>

      <div
        className="marker-wrapper absolute left-0 top-0 h-[100vh] w-max"
        ref={markerWrapperRef}
      >
        <div className="marker relative h-[100%] w-[2px] bg-white after:absolute after:left-[-20px] after:top-[15vh] after:block after:h-[40px] after:w-[40px] after:rounded-[100%] after:border-2 after:border-white after:bg-black">
          <div className="grab"></div>
        </div>
        <div
          className="active-slide absolute left-[40px] top-[16vh] text-[15px]"
          ref={activeSlideRef}
        >
          1/10
        </div>
      </div>

      <div className="slider h-[100%] w-[100%] overflow-hidden" ref={sliderRef}>
        <div
          className="slider-wrapper flex h-[100%] w-max items-center gap-[100px] px-[150px] py-0"
          ref={sliderWrapperRef}
        >
          <div
            className={`slide !h-[500px] w-[500px] bg-[#000000] ${
              activeSlide == 1 ? '' : 'opacity-20'
            }`}
          >
            <img
              src="/moti.png"
              alt=""
              className={`h-[100%] w-[100%] object-cover`}
            />
          </div>
          <div
            className={`slide !h-[500px] w-[500px] bg-[#000000] ${
              activeSlide == 2 ? '' : 'opacity-20'
            }`}
          >
            <img
              src="./SE project.png"
              alt=""
              className="h-[100%] w-[100%] object-cover"
            />
          </div>
          <div
            className={`slide !h-[500px] w-[500px] bg-[#000000] ${
              activeSlide == 3 ? '' : 'opacity-20'
            }`}
          >
            <img
              src="./images/02.jpg"
              alt=""
              className="h-[100%] w-[100%] object-cover"
            />
          </div>
          <div
            className={`slide !h-[500px] w-[500px] bg-[#000000] ${
              activeSlide == 4 ? '' : 'opacity-20'
            }`}
          >
            <img
              src="./images/03.jpg"
              alt=""
              className="h-[100%] w-[100%] object-cover"
            />
          </div>
          {/* <div className={`slide w-[500px] !h-[500px] bg-[#000000] ${activeSlide==5?"":"opacity-20"}`}>
          <img src="./images/05.jpg" alt="" className='w-[100%] h-[100%] object-cover'/>
        </div>
        <div className={`slide w-[500px] !h-[500px] bg-[#000000] ${activeSlide==6?"":"opacity-20"}`}>
          <img src="./images/06.jpg" alt="" className='w-[100%] h-[100%] object-cover'/>
        </div>
        <div className={`slide w-[500px] !h-[500px] bg-[#000000] ${activeSlide==7?"":"opacity-20"}`}>
          <img src="./images/07.jpg" alt="" className='w-[100%] h-[100%] object-cover'/>
        </div>
        <div className={`slide w-[500px] !h-[500px] bg-[#000000] ${activeSlide==8?"":"opacity-20"}`}>
          <img src="./images/08.jpg" alt="" className='w-[100%] h-[100%] object-cover'/>
        </div>
        <div className={`slide w-[500px] !h-[500px] bg-[#000000] ${activeSlide==9?"":"opacity-20"}`}>
          <img src="./images/09.jpg" alt="" className='w-[100%] h-[100%] object-cover'/>
        </div>
        <div className={`slide w-[500px] !h-[500px] bg-[#000000] ${activeSlide==10?"":"opacity-20"}`}>
          <img src="./images/10.jpg" alt="" className='w-[100%] h-[100%] object-cover'/>
        </div> */}
        </div>
      </div>

      <footer className="fixed bottom-0 flex w-[100%] justify-between p-[20px] text-[15px] opacity-[0.4]">
        <div>PROJECTS</div>
        <div>EXPERIENCE</div>
      </footer>
    </div>
  );
}
