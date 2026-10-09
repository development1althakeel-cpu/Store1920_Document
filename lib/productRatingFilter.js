import mongoose from 'mongoose';

export function approvedRatingMatch() {
  return {
    $or: [
      { approved: true },
      { isApproved: true },
    ],
  };
}

export function castProductIdsForMatch(ids = []) {
  const out = [];
  const seen = new Set();

  for (const raw of ids) {
    if (raw == null || raw === '') continue;

    if (raw instanceof mongoose.Types.ObjectId) {
      const key = String(raw);
      if (!seen.has(key)) {
        seen.add(key);
        out.push(raw);
      }
      continue;
    }

    const str = String(raw).trim();
    if (!str || seen.has(str) || !mongoose.Types.ObjectId.isValid(str)) continue;

    const objectId = new mongoose.Types.ObjectId(str);
    if (String(objectId) !== str) continue;

    seen.add(str);
    out.push(objectId);
  }

  return out;
}

export async function findProductObjectIdsWithMinRating(Rating, Product, minRating) {
  const threshold = Number(minRating);
  if (!(threshold > 0)) return null;

  const grouped = await Rating.aggregate([
    { $match: approvedRatingMatch() },
    { $group: { _id: '$productId', averageRating: { $avg: '$rating' } } },
    { $match: { averageRating: { $gte: threshold } } },
  ]);

  let storedIds = [];
  try {
    storedIds = await Product.find({ averageRating: { $gte: threshold } })
      .select('_id')
      .lean();
  } catch {
    storedIds = [];
  }

  return castProductIdsForMatch([
    ...grouped.map((row) => row._id),
    ...storedIds.map((product) => product._id),
  ]);
}

export async function getRatingStatsByProductIds(Rating, productIds = []) {
  const ids = Array.from(new Set((productIds || []).map((id) => String(id || '').trim()).filter(Boolean)));
  if (!ids.length) return new Map();

  const stats = await Rating.aggregate([
    {
      $match: {
        ...approvedRatingMatch(),
        productId: { $in: ids },
      },
    },
    {
      $group: {
        _id: '$productId',
        averageRating: { $avg: '$rating' },
        ratingCount: { $sum: 1 },
      },
    },
  ]);

  return new Map(
    stats.map((row) => [
      String(row._id),
      {
        averageRating: Number(row.averageRating) || 0,
        ratingCount: Number(row.ratingCount) || 0,
      },
    ]),
  );
}
