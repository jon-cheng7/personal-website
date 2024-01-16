'use client';

import React, { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import './styles.css';

export function GlobalNav() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);

  useEffect(() => {
    if (menuRef.current) {
      const timeline = gsap.timeline({ paused: true });
      timeline.to(menuRef.current.querySelectorAll('.block'), {
        duration: 1,
        clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)',
        stagger: 0.075,
        ease: 'power3.inOut',
      });
      timeline.to(
        menuRef.current.querySelectorAll('.menu-title, .menu-item'),
        {
          duration: 0.3,
          opacity: 1,
          stagger: 0.05,
        },
        '-=0.5',
      );
      timelineRef.current = timeline;
    }

    // Return a cleanup function
    return () => {
      if (timelineRef.current) {
        timelineRef.current.kill();
      }
    };
  }, []);

  const toggleMenu = () => {
    console.log('toggleMenu called. isOpen:', isOpen); // Debug: Function called
    if (timelineRef.current) {
      console.log('Timeline before toggle:', timelineRef.current); // Debug: Timeline before toggle
      isOpen ? timelineRef.current.reverse() : timelineRef.current.play();
      setIsOpen(!isOpen);
      console.log('Timeline after toggle:', timelineRef.current); // Debug: Timeline after toggle
    }
  };

  return (
    <div className="bg-red-400">
      <nav>
        <div className="logo">
          <img src="./assets/logo.png" alt="" />
        </div>
        <div className="logo-main">
          <img src="./assets/logo-main.png" alt="" />
        </div>
        <div className="toggle-btn">
          <button className="burger" onClick={() => toggleMenu()}></button>
        </div>
      </nav>
      <div className="overlay" ref={menuRef}>
        <div className="block"></div>
        <div className="block"></div>
        <div className="block"></div>
        <div className="block"></div>
        <div className="block"></div>
        <div className="block"></div>
        <div className="block"></div>
        <div className="block"></div>
      </div>
      <div className="overlay-menu">
        <div className="menu-title">
          <p>[menu]</p>
        </div>
        <div className="menu-item">
          <div className="menu-item-year">
            <p>2023</p>
          </div>
          <div className="menu-item-name">
            <p>Digital Art Collecting</p>
          </div>
          <div className="menu-item-link">
            <a href="#">[explore]</a>
          </div>
        </div>
        <div className="menu-item">
          <div className="menu-item-year">
            <p>2022</p>
          </div>
          <div className="menu-item-name">
            <p>Art NFT Collecting</p>
          </div>
          <div className="menu-item-link">
            <a href="#">[explore]</a>
          </div>
        </div>
        <div className="menu-item">
          <div className="menu-item-year">
            <p>2021</p>
          </div>
          <div className="menu-item-name">
            <p>Collectors Edition</p>
          </div>
          <div className="menu-item-link">
            <a href="#">[explore]</a>
          </div>
        </div>
        <div className="menu-item">
          <div className="menu-item-year">
            <p>Learn More</p>
          </div>
          <div className="menu-item-name">
            <p>About</p>
          </div>
          <div className="menu-item-link">
            <a href="#">[explore]</a>
          </div>
        </div>
      </div>
    </div>
  );
}
