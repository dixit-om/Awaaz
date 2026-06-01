/**
 * AWAAZ complaint categories — seeded in Step 2.
 * Slugs are stable API identifiers; do not rename without a migration plan.
 */
export const COMPLAINT_CATEGORIES = [
  {
    name: 'Garbage Issues',
    slug: 'garbage',
    icon: 'trash-2',
    sortOrder: 1,
  },
  {
    name: 'Road Issues',
    slug: 'road',
    icon: 'road',
    sortOrder: 2,
  },
  {
    name: 'Water Problems',
    slug: 'water',
    icon: 'droplets',
    sortOrder: 3,
  },
  {
    name: 'Electricity Problems',
    slug: 'electricity',
    icon: 'zap',
    sortOrder: 4,
  },
  {
    name: 'Drainage Problems',
    slug: 'drainage',
    icon: 'waves',
    sortOrder: 5,
  },
  {
    name: 'Public Infrastructure',
    slug: 'infrastructure',
    icon: 'building-2',
    sortOrder: 6,
  },
] as const;
