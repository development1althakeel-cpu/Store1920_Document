import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import authSeller from '@/middlewares/authSeller';
import { getAuth } from '@/lib/firebase-admin';
import Product from '@/models/Product';
import { fetchPickerProductsByIds } from '@/lib/storeProductPicker';

export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let userId = null;
    try {
      const decodedToken = await getAuth().verifyIdToken(authHeader.slice(7));
      userId = decodedToken.uid;
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const storeId = await authSeller(userId);
    if (!storeId) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const ids = Array.isArray(body?.ids) ? body.ids : [];

    await connectDB();
    const products = await fetchPickerProductsByIds(Product, storeId, ids);

    return NextResponse.json(
      { products },
      { headers: { 'Cache-Control': 'private, no-cache, no-store, must-revalidate' } }
    );
  } catch (error) {
    console.error('[store product by-ids]', error);
    return NextResponse.json({ error: error.message || 'Failed to load products' }, { status: 500 });
  }
}
