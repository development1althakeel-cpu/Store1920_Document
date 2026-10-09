import { NextResponse } from 'next/server';
import { buildMetaProductFeedCsv } from '@/lib/metaProductFeed';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const csv = await buildMetaProductFeedCsv();
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('[feeds/meta-products.csv]', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to build Meta product feed' },
      { status: 500 },
    );
  }
}
