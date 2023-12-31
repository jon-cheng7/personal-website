import React, { useRef, useState, useEffect } from 'react';
import { useSpring, a } from '@react-spring/web';
import useMeasure from 'react-use-measure';
import { Container, Title, Frame, Content, toggle } from './styles';
import * as Icons from './icons';

function usePrevious<T>(value: T) {
  const ref = useRef<T>();
  useEffect(() => void (ref.current = value), [value]);
  return ref.current;
}

const Tree = React.memo<
  React.HTMLAttributes<HTMLDivElement> & {
    defaultOpen?: boolean;
    name: string | JSX.Element;
  }
>(({ children, name, style, defaultOpen = false }) => {
  const [isOpen, setOpen] = useState(defaultOpen);
  const previous = usePrevious(isOpen);
  const [ref, { height: viewHeight }] = useMeasure();
  const { height, opacity, y } = useSpring({
    from: { height: 0, opacity: 0, y: 0 },
    to: {
      height: isOpen ? viewHeight : 0,
      opacity: isOpen ? 1 : 0,
      y: isOpen ? 0 : 20,
    },
  });
  interface IconProps {
    style?: React.CSSProperties;
    onClick: () => void;
  }
  // @ts-ignore
  const Icon: React.FC<IconProps> =
    Icons[`${children ? (isOpen ? 'Minus' : 'Plus') : 'Close'}SquareO`];
  return (
    <Frame>
      <div className="flex items-center">
        <Icon
          style={{ ...toggle, opacity: children ? 1 : 0.3 }}
          onClick={() => setOpen(!isOpen)}
        />
        <Title style={style}>{name}</Title>
      </div>
      <Content
        style={{
          opacity,
          height: isOpen && previous === isOpen ? 'auto' : height,
        }}
      >
        <a.div ref={ref} style={{ y }} children={children} />
      </Content>
    </Frame>
  );
});

export default function List() {
  return (
    <Container>
      <Tree name="tech stack" defaultOpen>
        <Tree name="webdev">
          <Tree name="frontend">
            <Tree name="javascript" />
            <Tree name="typescript" />
            <Tree name="html" />
            <Tree name="css">
              <Tree name="tailwind" />
              <Tree name="bootstrap" />
            </Tree>
            <Tree name="react" />
            <Tree name="next.js" />
            <Tree name="three.js" />
          </Tree>
          <Tree name="backend">
            <Tree name="node" />
            <Tree name="express" />
            <Tree name="graphql" />
          </Tree>
        </Tree>
        <Tree name="programming languages">
          <Tree name="python" />
          <Tree name="java" />
          <Tree name="c++" />
          <Tree name="c" />
          <Tree name="swift" />
        </Tree>
        <Tree name="database">
          <Tree name="sql" />
          <Tree name="mongodb" />
        </Tree>
        <Tree name="git" />
      </Tree>
    </Container>
  );
}
