import React, { useState } from 'react';
import { useSprings, animated, to as interpolate } from '@react-spring/web';
import { useDrag } from 'react-use-gesture';

const cards = [
  '/art/blueperiod1.png',
  '/art/blueperiod2.png',
  '/art/shyboy.png',
  '/art/hands.PNG',
  '/art/shave.jpeg',
].reverse();

type SpringProps = {
  x: number;
  y: number;
  scale: number;
  rot: number;
  delay: number;
  down: boolean;
};

const to = (i: number) => ({
  x: 0,
  y: i * -4,
  scale: 1,
  rot: -10 + Math.random() * 20,
  delay: i * 100,
});
// const from = (_i: number) => ({ x: 0, rot: 0, scale: 1.5, y: -1000 })
const from = to;

const trans = (r: number, s: number) =>
  `perspective(1500px) rotateX(30deg) rotateY(${
    r / 10
  }deg) rotateZ(${r}deg) scale(${s})`;

const transNoTilt = (r: number, s: number) =>
  `perspective(1500px) rotateX(0deg) rotateY(${
    r / 10
  }deg) rotateZ(${r}deg) scale(${s})`;

function Deck() {
  const [gone] = useState(() => new Set()); // The set flags all the cards that are flicked out
  const [props, api] = useSprings<SpringProps>(cards.length, (i) => ({
    ...to(i),
    from: from(i),
    down: false,
  })); // Create a bunch of springs using the helpers above
  // Create a gesture, we're interested in down-state, delta (current-pos - click-pos), direction and velocity
  const bind = useDrag(
    ({ args: [index], down, movement: [mx], direction: [xDir], velocity }) => {
      const trigger = velocity > 0.2;
      const dir = xDir < 0 ? -1 : 1;
      if (!down && trigger) gone.add(index);
      api.start((i) => {
        if (index !== i) return;
        const isGone = gone.has(index);
        const x = isGone ? (200 + window.innerWidth) * dir : down ? mx : 0;
        const rot = mx / 100 + (isGone ? dir * 10 * velocity : 0);
        const scale = down ? 1.1 : 1;
        return {
          x,
          rot,
          scale,
          delay: undefined,
          config: { friction: 50, tension: down ? 800 : isGone ? 200 : 500 },
          down: i === index ? down : props[i].down, // Modified line
        };
      });
      if (!down && gone.size === cards.length)
        setTimeout(() => {
          gone.clear();
          api.start((i) => to(i));
        }, 600);
    },
  );

  // Now we're just mapping the animated values to our view, that's it. Btw, this component only renders once. :-)
  return (
    <>
      {props.map(({ x, y, rot, scale, down }, i) => (
        <animated.div
          className="absolute flex h-[22rem] w-[22rem] transform-gpu items-center justify-center"
          key={i}
          style={{ x, y }}
        >
          <animated.div
            {...bind(i)}
            style={{
              transform: down
                ? interpolate([rot, scale], (r, s) => transNoTilt(r, s))
                : interpolate([rot, scale], (r, s) => trans(r, s)),
              backgroundImage: `url(${cards[i]})`,
            }}
            className="h-[22rem] w-[22rem] transform-gpu rounded-lg bg-white bg-cover bg-center bg-no-repeat shadow-xl"
          />
        </animated.div>
      ))}
    </>
  );
}

export default function CardStack() {
  return (
    <div className="bg-light-blue-200 cursor-custom flex h-full items-center justify-center">
      <Deck />
    </div>
  );
}
