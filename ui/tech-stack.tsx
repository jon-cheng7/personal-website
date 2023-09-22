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
  '',
];

type TechItemProps = {
  children: React.ReactNode;
};

type TechListProps = {
  className: string;
};

const TechItem: React.FC<TechItemProps> = ({ children }) => (
  <div
    className={`font-cygre z-[50] h-[2.1rem] w-screen pl-5 text-left text-5xl font-black tracking-tighter text-black`}
  >
    {children}
  </div>
);

export const TechList: React.FC<TechListProps> = (className) => (
  <div className={`${className.className}`}>
    {techStacks.map((tech) => (
      <TechItem key={tech}>{tech}</TechItem>
    ))}
  </div>
);
