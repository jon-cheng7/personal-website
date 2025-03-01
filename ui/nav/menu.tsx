'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

import './menu.css';

import Image from 'next/image';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { link } from 'fs';

interface NavMenuLink {
  path: string;
  label: string;
}

interface MenuLinkProps {
  path: string;
  label: string;
}

const navMenuLinks: NavMenuLink[] = [
  { path: '/', label: 'Home' },
  { path: '/me', label: 'About Me' },
  { path: '/experience', label: 'Resume' },
  { path: '/art', label: 'Art' },
  { path: '/code', label: 'Code' },
];

const MenuLink: React.FC<MenuLinkProps> = ({ path, label }) => {
  // Use a wrapper div to target the hover effect
  const wrapperRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (wrapper) {
      const letters = wrapper.querySelectorAll('.menu-letter');

      // GSAP timeline for hover animation
      const tl = gsap
        .timeline({
          paused: true,
          defaults: { ease: 'power2.out' },
        })
        .to(letters, {
          y: '-100%',
          stagger: 0.03,
        });

      // Event handlers for animation
      const handleMouseEnter = () => tl.play();
      const handleMouseLeave = () => tl.reverse();

      wrapper.addEventListener('mouseenter', handleMouseEnter);
      wrapper.addEventListener('mouseleave', handleMouseLeave);

      return () => {
        wrapper.removeEventListener('mouseenter', handleMouseEnter);
        wrapper.removeEventListener('mouseleave', handleMouseLeave);
      };
    }
  }, []);

  // Wrap each letter in a span
  const letters = label.split('').map((char, i) => (
    <span key={i} className="menu-letter" style={{ display: 'inline-block' }}>
      {char === ' ' ? '\u00A0' : char}
    </span>
  ));

  return (
    <div ref={wrapperRef}>
      <div className="flex flex-col overflow-y-clip">
        <Link legacyBehavior href={path} passHref>
          <a className="menu-link">{letters}</a>
        </Link>
        <Link legacyBehavior href={path} passHref>
          <a className="menu-link-clone absolute top-[100%]">{letters}</a>
        </Link>
      </div>
    </div>
  );
};

const NavMenu: React.FC = () => {
  const container = useRef<HTMLDivElement>(null);
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);

  const tl = useRef<GSAPTimeline | null>(null);

  const toggleMenu = (e: React.MouseEvent<HTMLDivElement>): void => {
    e.stopPropagation();
    setIsMenuOpen(!isMenuOpen);
  };

  useGSAP(
    () => {
      gsap.set('.menu-link-item-holder', { y: 75 });
      tl.current = gsap
        .timeline({ paused: true })
        .to('.menu-overlay', {
          duration: 1.25,
          clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)',
          ease: 'power4.inOut',
        })
        .to('.menu-link-item-holder', {
          y: 0,
          duration: 1,
          stagger: 0.1,
          ease: 'power4.out',
          delay: -0.75,
        });
    },
    { scope: container },
  );

  useEffect(() => {
    if (isMenuOpen) {
      tl.current?.play();
    } else {
      tl.current?.reverse();
    }
  }, [isMenuOpen]);

  return (
    <div className="menu-container" ref={container}>
      <div className="menu-bar">
        <div className="menu-logo">
          <Link href="/">
            <Image
              src="/Signature_white.png"
              alt="Home"
              width={40}
              height={40}
            />
          </Link>
        </div>
        <div className="menu-open" onClick={toggleMenu}>
          <p>MENU</p>
        </div>
      </div>

      <div className="menu-overlay">
        <div className="menu-overlay-bar">
          <div className="menu-logo">
            <Link href="/">
              <Image
                src="/Signature_black.png"
                alt="Home"
                width={40}
                height={40}
              />
            </Link>
          </div>
          <div className="menu-close">
            <p onClick={toggleMenu}>CLOSE</p>
          </div>
        </div>

        <div className="menu-close-icon" onClick={toggleMenu}>
          <p>&#x2715;</p>
        </div>
        <div className="menu-copy">
          <div className="menu-links">
            {navMenuLinks.map((link, index) => (
              <div key={index} className="menu-link-item">
                <div className="menu-link-item-holder" onClick={toggleMenu}>
                  <MenuLink path={link.path} label={link.label} />
                </div>
              </div>
            ))}
          </div>
          <div className="menu-info">
            <div className="menu-info-col">
              <a href="www.linkedin.com/in/cheng-jonathan">LinkedIn &#8599;</a>
              <a href="https://github.com/jon-cheng7">Github &#8599;</a>
              <a href="https://www.instagram.com/jon.cheng_?igsh=cDN1ZjVnZHRtNTN3&utm_source=qr">
                Instagram &#8599;
              </a>
              <a href="https://www.behance.net/jonathancheng3">
                Behance &#8599;
              </a>
            </div>
            <div className="menu-info-col">
              <p>jonathan.ch126@gmail.com</p>
              <p>437 688 9896</p>
            </div>
          </div>
        </div>
        <div className="menu-preview"></div>
      </div>
    </div>
  );
};

export default NavMenu;
