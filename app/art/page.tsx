'use client';
import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import './styles.css';

interface Position {
  top: string;
  left: string;
}

const positions = [
  { top: '0%', left: '0%' },
  { top: '0%', left: '10%' },
  { top: '0%', left: '60%' },
  { top: '16%', left: '15%' },
  { top: '16%', left: '40%' },
  { top: '16%', left: '90%' },
  { top: '32%', left: '50%' },
  { top: '32%', left: '75%' },
  { top: '48%', left: '0%' },
  { top: '64%', left: '30%' },
  { top: '64%', left: '50%' },
  { top: '64%', left: '90%' },
  { top: '80%', left: '20%' },
  { top: '80%', left: '70%' },
];

export default function Page() {
  useEffect(() => {
    const imgs = document.querySelectorAll('.img');

    gsap.set('.img', {
      top: '45%',
      left: '50%',
      transform: 'translate(-50%, -50%) scale(0)',
    });

    // gsap.from("p", {
    //   y: 40,
    //   ease: "power4.inOut",
    //   duration: 1,
    //   stagger: {
    //     amount: 0.15
    //   },
    //   delay: 0.5
    // });

    gsap.to('.img', {
      scale: 1,
      width: '300px',
      height: '400px',
      stagger: 0.15,
      duration: 0.75,
      ease: 'power2.out',
      delay: 1,
      onComplete: scatterAndShrink,
    });

    // gsap.to("p", {
    //   top: "40px",
    //   ease: "power4.inOut",
    //   duration: 1,
    //   stagger: {
    //     amount: 0.15
    //   },
    //   delay: 3,
    //   onComplete: () => {
    //     document.querySelector(".header")?.remove();
    //   }
    // });

    gsap.from('a', {
      y: 20,
      opacity: 0,
      ease: 'power2.out',
      duration: 1,
      stagger: {
        amount: 0.15,
      },
      delay: 4,
    });

    imgs.forEach((img, i) => {
      img.setAttribute('data-original-position', JSON.stringify(positions[i]));
      img.setAttribute('data-enlarged', 'false');
      img.addEventListener('click', toggleImageSize);
    });

    return () => {
      imgs.forEach((img) => {
        img.removeEventListener('click', toggleImageSize);
      });
    };
  }, []);

  function scatterAndShrink() {
    gsap.to('.img', {
      top: (i) => positions[i].top,
      left: (i) => positions[i].left,
      transform: 'none',
      width: '75px',
      height: '100px',
      stagger: 0.075,
      duration: 0.75,
      ease: 'power2.out',
    });
  }

  function applyBlurEffect() {
    const elementsToBlur = document.querySelectorAll(
      '.nav, .footer, .header, .text, .img:not([data-enlarged="true"])',
    );
    gsap.to(elementsToBlur, {
      filter: 'blur(20px)',
      duration: 0.75,
      ease: 'power2.out',
    });
  }

  function removeBlurEffect() {
    const elementsToBlur = document.querySelectorAll(
      '.nav, .footer, .header, .text, .img:not([data-enlarged="true"])',
    );
    gsap.to(elementsToBlur, {
      filter: 'blur(0px)',
      duration: 1,
      ease: 'power2.out',
    });
  }

  function toggleImageSize(event: Event) {
    event.stopPropagation();
    const img = event.currentTarget as HTMLDivElement;
    const isEnlarged = img.getAttribute('data-enlarged') === 'true';
    const originalPosition = JSON.parse(
      img.getAttribute('data-original-position') || '{}',
    );

    if (!isEnlarged) {
      const enlargedWidth = 500;
      const enlargedHeight = 600;
      const centeredLeft = (window.innerWidth - enlargedWidth) / 2;
      const centeredTop = (window.innerHeight - enlargedHeight) / 2;
      const topCorrection = 75;
      const correctedTop = centeredTop - topCorrection;

      gsap.to(img, {
        zIndex: 1000,
        top: correctedTop + 'px',
        left: centeredLeft + 'px',
        width: enlargedWidth + 'px',
        height: enlargedHeight + 'px',
        ease: 'power4.out',
        duration: 1,
      });
      img.setAttribute('data-enlarged', 'true');
      applyBlurEffect();
    } else {
      setTimeout(() => removeBlurEffect(), 100);

      gsap.to(img, {
        zIndex: 1,
        top: originalPosition.top,
        left: originalPosition.left,
        width: '75px',
        height: '100px',
        ease: 'power4.out',
        duration: 1,
      });
      img.setAttribute('data-enlarged', 'false');
    }
  }

  return (
    <div className="w-[100vw]">
      <div className="container">
        <div className="nav">
          <a href="#">Neural Nuance</a>
          <a href="#">Showreel</a>
        </div>
        {/* <div className="footer">
          <a href="#">Behance</a>
          <a href="#">Catalog</a>
        </div> */}
        <div className="header font-gothic flex justify-center text-[20rem] font-black">
          <div className="text">
            <p>
              <em>GA </em>LL<em>ER</em> Y
            </p>
          </div>
        </div>
        <div className="gallery left-0">
          <div className="img">
            <img src="./gallery/img1.jpg" alt="" />
          </div>
          <div className="img">
            <img src="./gallery/img2.jpg" alt="" />
          </div>
          <div className="img">
            <img src="./gallery/img3.jpg" alt="" />
          </div>
          <div className="img">
            <img src="./gallery/img4.jpg" alt="" />
          </div>
          <div className="img">
            <img src="./gallery/img5.jpg" alt="" />
          </div>
          <div className="img">
            <img src="./gallery/img6.jpg" alt="" />
          </div>
          <div className="img">
            <img src="./gallery/img7.jpg" alt="" />
          </div>
          <div className="img">
            <img src="./gallery/img1.jpg" alt="" />
          </div>
          <div className="img">
            <img src="./gallery/img2.jpg" alt="" />
          </div>
          <div className="img">
            <img src="./gallery/img3.jpg" alt="" />
          </div>
          <div className="img">
            <img src="./gallery/img4.jpg" alt="" />
          </div>
          <div className="img">
            <img src="./gallery/img5.jpg" alt="" />
          </div>
          <div className="img">
            <img src="./gallery/img6.jpg" alt="" />
          </div>
          <div className="img">
            <img src="./gallery/img7.jpg" alt="" />
          </div>
        </div>
      </div>
    </div>
  );
}
