import React, { useEffect, useState, useRef } from 'react';

type buttonProps = {
  content: string;
  className?: string;
};

function MagnetButton(props: buttonProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [borderPosition, setBorderPosition] = useState({ x: 0, y: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);

  const onMouseMove = (e: MouseEvent) => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const x = e.clientX - (rect.left + rect.width / 2);
      const y = e.clientY - (rect.top + rect.height / 2);
      const distance = Math.sqrt(x * x + y * y);

      const threshold = 80;

      if (distance < threshold) {
        setPosition({ x: x * 0.4, y: y * 0.4 });
        setBorderPosition({ x: x * 0.2, y: y * 0.2 });
      } else {
        setPosition({ x: 0, y: 0 });
        setBorderPosition({ x: 0, y: 0 });
      }
    }
  };

  const [hover, setHover] = useState(false);
  const [rippleStyle, setRippleStyle] = useState({});

  const onMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const rippleSize = Math.max(buttonRect.width, buttonRect.height);
      const rippleX = e.clientX - buttonRect.left - rippleSize / 2;
      const rippleY = e.clientY - buttonRect.top - rippleSize / 2;

      setRippleStyle({
        left: rippleX + 'px',
        top: rippleY + 'px',
        width: rippleSize + 'px',
        height: rippleSize + 'px',
        background: '#ffffff',
        borderRadius: '50%',
        position: 'absolute',
        transform: 'scale(0)',
        animation: 'ripple 0.6s linear',
        opacity: 1,
      });
    }
  };

  const onMouseLeave = () => {
    setHover(false);
  };

  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
    };
  }, []);

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        transform: `translate(${borderPosition.x}px, ${borderPosition.y}px)`,
        transition: 'transform 0.1s',
        width: 'fit-content',
        borderRadius: '9999px',
      }}
      className="border border-dashed border-black"
    >
      <button
        ref={buttonRef}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        style={{
          transform: `translate(${position.x}px, ${position.y}px)`,
          transition: 'transform 0.1s',
          background: 'black',
          color: 'white',
        }}
        className={`${props.className}`}
      >
        {props.content}
        {hover && (
          <span
            className="animate-ripple absolute rounded-full"
            style={{ ...rippleStyle, zIndex: 10 }}
          ></span>
        )}
      </button>
    </div>
  );
}

export default MagnetButton;
