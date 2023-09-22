import React, { useState, useEffect } from 'react';

const techStacks = [
  'C++',
  'TYPESCRIPT',
  'PYTHON',
  'JS',
  'REACT',
  'JAVA',
  'NEXTJS',
  'HTML',
  'CSS',
  'SQL',
  'NODE',
  'MONGODB',
  'GIT',
  'EXPRESS',
  'GRAPHQL',
  'THREEJS',
  'BOOTSTRAP',
  'SWIFT',
];

type TechItemProps = {
  children: React.ReactNode;
  isHighlighted: boolean;
};

type TechListProps = {
  className: string;
  start: number;
  end: number;
};

const TechItem: React.FC<TechItemProps> = ({ children, isHighlighted }) => (
  <div
    className={`font-cygre duration-40 h-[2.1rem] w-screen pl-5 text-left font-black tracking-tighter transition-all ease-in-out ${
      isHighlighted
        ? 'z-[51] -translate-y-[10px] text-6xl text-red-400'
        : 'z-[50] text-5xl text-black'
    }`}
  >
    {children}
  </div>
);

export const TechList: React.FC<TechListProps> = ({
  className,
  start,
  end,
}) => {
  const [currentHighlightedIndex, setCurrentHighlightedIndex] = useState<
    number | null
  >(null);

  useEffect(() => {
    const step = (end - start) / techStacks.length;

    const handleScroll = () => {
      const scrollY = window.scrollY;
      if (scrollY >= start && scrollY <= end) {
        const relativeScrollY = scrollY - start;
        const index = Math.floor(relativeScrollY / step);
        setCurrentHighlightedIndex(index);
      } else {
        setCurrentHighlightedIndex(null);
      }
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [start, end]);

  return (
    <div className={`${className}`}>
      {techStacks.map((tech, index) => (
        <TechItem key={tech} isHighlighted={index === currentHighlightedIndex}>
          {tech}
        </TechItem>
      ))}
    </div>
  );
};
