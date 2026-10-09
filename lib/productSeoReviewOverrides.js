const MANSORY_SM10_REVIEWS = [
  {
    customerName: 'Jas***L',
    datePublished: '2026-07-11',
    rating: 5,
    review:
      "If you're looking for a stylish electric scooter with reliable performance, this is a great choice. Comfortable, stable, and built with excellent quality.",
  },
  {
    customerName: 'Noo***E',
    datePublished: '2026-07-09',
    rating: 5,
    review:
      'The attention to detail is amazing. From the frame to the controls, everything feels high-end. Definitely exceeded my expectations.',
  },
  {
    customerName: 'ro***',
    datePublished: '2026-07-06',
    rating: 5,
    review:
      'I easily get through my daily commute on a single charge. The braking system feels safe, and the overall ride quality is impressive.',
  },
  {
    customerName: 'Ali***s',
    datePublished: '2026-07-02',
    rating: 5,
    review:
      "This was my first electric scooter, and I got comfortable with it very quickly. It's smooth, quiet, and easy to handle.",
  },
  {
    customerName: 'Pri***N',
    datePublished: '2026-06-29',
    rating: 5,
    review:
      'People keep asking me where I bought it. The design is unique, and the scooter performs just as well as it looks.',
  },
  {
    customerName: 'Fat***a',
    datePublished: '2026-06-26',
    rating: 5,
    review:
      "The three-wheel design gives me much more confidence while riding. It's comfortable, stylish, and feels very premium.",
  },
  {
    customerName: 'Oma***A',
    datePublished: '2026-06-24',
    rating: 5,
    review:
      'I bought it because of the Mansory styling, but I was equally impressed with the build quality and smooth ride. Highly recommended.',
  },
  {
    customerName: 'Sar***M',
    datePublished: '2026-06-17',
    rating: 5,
    review:
      "Perfect for city rides I've been using it for my daily commute, and it's been fantastic. The battery lasts long enough for my trips, and it's very easy to control.",
  },
  {
    customerName: 'Ahm***K',
    datePublished: '2026-06-10',
    rating: 5,
    review:
      'The design is stunning and definitely stands out. The ride is smooth, stable, and very comfortable. Worth every dirham.',
  },
  {
    customerName: 'Vic***s',
    datePublished: '2026-05-13',
    rating: 5,
    review:
      "I wanted something stylish but practical, and this scooter exceeded my expectations.It's comfortable to ride, easy to charge, and the three-wheel setup makes balancing effortless. It's become my favorite way to get around for short trips, and I would happily recommend it to anyone looking for a premium electric scooter.",
  },
  {
    customerName: 'Tyl***n',
    datePublished: '2026-04-20',
    rating: 4,
    review:
      'The scooter feels solid and well-built. I especially like the three riding modes, which are useful depending on traffic. The brakes are responsive, and I feel very confident riding it around the city. Definitely one of the best purchases I\'ve made this year.',
  },
  {
    customerName: 'Bra***s',
    datePublished: '2026-04-10',
    rating: 4,
    review:
      "I've been riding this scooter to work for about two weeks, and it's been fantastic. The three-wheel design makes it feel very stable, especially when turning. The build quality is excellent, and the battery easily lasts for my daily commute. I've received so many compliments on how premium it looks.",
  },
];

const REVIEWS_BY_SLUG = {
  'mansory-special-edition-scooter-sm10': MANSORY_SM10_REVIEWS,
};

function normalizeSlug(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^\/+/, '')
    .replace(/^(product|products)\//, '');
}

export function getProductSeoReviewOverrides(slug = '') {
  const reviews = REVIEWS_BY_SLUG[normalizeSlug(slug)] || [];
  return reviews.map((review, index) => ({
    _id: `seo-review-${normalizeSlug(slug)}-${index + 1}`,
    rating: Number(review.rating) || 5,
    review: String(review.review || '').trim(),
    customerName: String(review.customerName || 'Customer').trim(),
    createdAt: review.datePublished,
    datePublished: review.datePublished,
    approved: true,
    user: {
      name: String(review.customerName || 'Customer').trim(),
      image: '/placeholder-avatar.png',
    },
  }));
}

export function mergeProductSeoReviews(reviews = [], slug = '') {
  const seeded = getProductSeoReviewOverrides(slug);
  if (!seeded.length) return Array.isArray(reviews) ? reviews : [];

  const existing = Array.isArray(reviews) ? reviews : [];
  const seen = new Set(
    existing.map((review) => {
      const name = String(review?.customerName || review?.user?.name || '').trim().toLowerCase();
      const body = String(review?.review || review?.reviewBody || '').trim().toLowerCase();
      return `${name}::${body}`;
    }),
  );

  const extras = seeded.filter((review) => {
    const key = `${String(review.customerName || '').trim().toLowerCase()}::${String(review.review || '').trim().toLowerCase()}`;
    return !seen.has(key);
  });

  return [...existing, ...extras].sort((a, b) => {
    const aDate = new Date(a.createdAt || a.datePublished || 0).getTime();
    const bDate = new Date(b.createdAt || b.datePublished || 0).getTime();
    return bDate - aDate;
  });
}
