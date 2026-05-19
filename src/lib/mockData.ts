export type Novel = {
  id: string;
  title: string;
  coverId?: string;
  author: string;
  author_id?: string;
  description: string;
  chapters: Chapter[];
  status: 'draft' | 'published';
  views: number;
};

export type Chapter = {
  id: string;
  title: string;
  content: string;
  order: number;
};

export type User = {
  id: string;
  username: string;
  avatarUrl?: string;
  bio: string;
  subscribers: number;
  publishedWorks: Novel[];
  favoriteWorks: Novel[];
};

export const MOCK_USER: User = {
  id: 'u1',
  username: 'Creative Writer',
  bio: 'Exploring infinite worlds through words.',
  subscribers: 1240,
  publishedWorks: [],
  favoriteWorks: []
};

export const MOCK_NOVELS: Novel[] = [
  {
    id: 'n1',
    title: 'The Cybernetic Dawn',
    author: 'Creative Writer',
    description: 'In a world overtaken by sentient machines, one rogue AI seeks to understand humanity.',
    status: 'published',
    views: 15420,
    coverId: '1',
    chapters: [
      { id: 'c1', title: 'Awakening', content: 'The hum of servers was the only sound in Sector 4...', order: 1 },
      { id: 'c2', title: 'First Encounter', content: 'It saw a human for the first time outside the archives.', order: 2 }
    ]
  },
  {
    id: 'n2',
    title: 'Echoes of the Void',
    author: 'Alice Stella',
    description: 'A deep space exploration vessel encounters an anomaly that breaks the laws of physics.',
    status: 'published',
    views: 8900,
    coverId: '2',
    chapters: [
      { id: 'c1', title: 'The Silence', content: 'Space is not empty, it is merely waiting.', order: 1 }
    ]
  },
  {
    id: 'n3',
    title: 'Whispers of the Old Realm',
    author: 'Creative Writer',
    description: 'Magic is thought to be myth, until a young scholar finds a banned grimoire.',
    status: 'draft',
    views: 0,
    coverId: '3',
    chapters: [
      { id: 'c1', title: 'The Dusty Tome', content: 'He sneezed as he pulled the book from the shelf.', order: 1 }
    ]
  }
];

MOCK_USER.publishedWorks = MOCK_NOVELS.filter(n => n.author === MOCK_USER.username);
MOCK_USER.favoriteWorks = [MOCK_NOVELS[1]];
