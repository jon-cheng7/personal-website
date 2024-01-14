export type Item = {
  name: string;
  slug: string;
  description?: string;
};

export const demos: { name: string; items: Item[] }[] = [
  {
    name: 'About',
    items: [
      {
        name: 'Me',
        slug: 'me',
        description: 'replace with a description',
      },
      {
        name: 'Skills',
        slug: 'skills',
        description: 'replace with a description',
      },
      {
        name: 'Projects and Experience',
        slug: 'experience',
        description: 'replace with a description',
      },
    ],
  },
  {
    name: 'Portfolio',
    items: [
      {
        name: 'Art',
        slug: 'art',
        description: 'Visual art, graphic design, and other creative projects',
      },
      {
        name: 'Code',
        slug: 'code',
        description: 'Open source projects and code snippets',
      },
      {
        name: 'Music',
        slug: 'music',
        description: 'Music production and compositions',
      },
    ],
  },
];
