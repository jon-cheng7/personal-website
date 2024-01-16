'use client';

import React, { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import './styles.css';
import data from './data';

type DataItem = {
  itemName: string;
  itemCategory: string;
  itemLink: string;
  itemCopy: string;
  itemImg: string;
};

export default function Page() {
  const [selectedItem, setSelectedItem] = useState<DataItem | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);

  useEffect(() => {
    if (overlayRef.current) {
      const timeline = gsap.timeline({ paused: true, overwrite: 'auto' });

      timeline.to(overlayRef.current, {
        duration: 0.5,
        bottom: '0px',
        rotation: 0,
        transformOrigin: 'bottom center',
        ease: 'power2.out',
      });
      timelineRef.current = timeline;
    }
  }, []);

  const handleItemClick = (
    e: React.MouseEvent<HTMLDivElement>,
    index: number,
  ) => {
    e.stopPropagation();
    console.log('handleItemClick called');

    setSelectedItem(data[index]);

    // check if overlay is already open
    if (timelineRef.current?.progress() !== 0) {
      timelineRef.current?.reverse();
      setTimeout(() => {
        updateOverlay(data[index]);
        timelineRef.current?.play();
      }, 700);
    } else {
      updateOverlay(data[index]);
      timelineRef.current?.play();
    }
  };

  const handleCloseClick = (e: React.MouseEvent<HTMLDivElement>) => {
    console.log('handleCloseClick called');
    e.stopPropagation();
    timelineRef.current?.reverse();
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    console.log('handleOverlayClick called');

    if (!overlayRef.current?.contains(e.target as Node)) {
      console.log('Outside overlay clicked');
      timelineRef.current?.reverse();
    }
  };

  const updateOverlay = (dataItem: DataItem) => {
    console.log('updateOverlay called');
    const itemName = document.getElementById('item-name');
    const itemCategory = document.getElementById('item-category');
    const itemLink = document.getElementById('item-link');
    const itemCopy = document.getElementById('item-copy');
    const itemImg = document.getElementById('item-img');

    if (itemName) {
      itemName.innerText = dataItem.itemName;
    }
    if (itemCategory) {
      itemCategory.innerText = dataItem.itemCategory;
    }
    if (itemLink) {
      itemLink.setAttribute('href', dataItem.itemLink);
    }
    if (itemCopy) {
      itemCopy.innerText = dataItem.itemCopy;
    }
    if (itemImg) {
      itemImg.setAttribute('src', dataItem.itemImg);
    }
  };

  return (
    <div
      className="h-screen w-screen overflow-hidden"
      onClick={handleOverlayClick}
    >
      {/* <div className="nav bg-slate-600">
        <p>Nanotech</p>
        <p>Showreel</p>
      </div> */}
      <div className="footer">
        <p>Codegrid 2023 &copy;</p>
      </div>
      <div
        className="overlay absolute bottom-[-1200px] right-0 z-[2] h-[700px] w-[70%] overflow-x-hidden overflow-y-scroll bg-white p-[2em] text-black [transform-origin:bottom_center] [transform:translateZ(0)_rotate(20deg)] [will-change:bottom]"
        ref={overlayRef}
      >
        <div className="overlay-header">
          <div className="col">
            <h1 id="item-name">Item 1</h1>
            <p id="item-category">Item Category</p>
          </div>
          <div className="col">
            <p id="close-btn" onClick={(e) => handleCloseClick(e)}>
              Close
            </p>
          </div>
        </div>
        <div className="item-details">
          <p>
            <a id="item-link" href="#">
              <i className="ph-bold ph-arrow-up-right"></i> View Site
            </a>
          </p>
          <p id="item-copy">
            Lorem ipsum dolor, sit amet consectetur adipisicing elit. Dolores
            qui ea, impedit vero provident dolorem distinctio obcaecati quam.
            Sequi, sed!
          </p>
        </div>
        <div className="img-container">
          <img id="item-img" src="./img-1.jpg" alt="" />
        </div>
      </div>
      <div className="container flex h-screen w-full items-end justify-start p-[2em]">
        <div className="items">
          {data.map((item: DataItem, index: number) => (
            <div
              key={index}
              className="item"
              onClick={(e) => handleItemClick(e, index)}
            >
              <div className="item-index">{index + 1}</div>
              <div className="item-name">{item.itemName}</div>
              <div className="item-year">{item.itemCategory}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
