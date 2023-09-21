import React, {
  useState,
  useEffect,
  useRef,
  ReactElement,
  ReactNode,
} from 'react';

interface InViewObserverProps {
  children: ReactNode;
  threshold?: number;
  onInViewChange?: (inView: boolean) => void;
}

const InViewObserver: React.FC<InViewObserverProps> = ({
  children,
  threshold = 0.1,
  onInViewChange,
}) => {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);

        // If an onInViewChange callback is provided, call it.
        if (onInViewChange) {
          onInViewChange(entry.isIntersecting);
        }
      },
      {
        threshold: threshold,
      },
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [threshold, onInViewChange]);

  if (React.isValidElement(children)) {
    return React.cloneElement(children as ReactElement, { ref: ref });
  }

  return <>{children}</>; // If not a valid element, return as-is
};

export default InViewObserver;
