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
        name: 'Experience',
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
  {
    name: 'Misc',
    items: [
      {
        name: 'Replace1',
        slug: 'replace1',
        description: 'Visual art, graphic design, and other creative projects',
      },
      {
        name: 'Replace2',
        slug: 'replace2',
        description: 'Preview the supported styling solutions',
      },
      {
        name: 'Replace3',
        slug: 'replace3',
        description: 'A collection of useful App Router code snippets',
      },
    ],
  },
];
