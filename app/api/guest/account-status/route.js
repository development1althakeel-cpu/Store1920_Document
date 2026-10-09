import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Order from '@/models/Order';
import User from '@/models/User';
import GuestUser from '@/models/GuestUser';
import { normalizeEmail } from '@/lib/orderIdentity';
import { getAuth } from '@/lib/firebase-admin';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');

    if (!orderId) {
      return NextResponse.json({ exists: false }, { status: 400 });
    }

    await dbConnect();

    const order = await Order.findById(orderId)
      .select('guestEmail shippingAddress.email')
      .lean();

    if (!order) {
      return NextResponse.json({ exists: false }, { status: 404 });
    }

    const email = normalizeEmail(order.guestEmail || order.shippingAddress?.email);
    if (!email) {
      return NextResponse.json({ exists: false });
    }

    const dbUser = await User.findOne({ email }).select('_id').lean();
    if (dbUser) {
      return NextResponse.json({ exists: true });
    }

    const guestUser = await GuestUser.findOne({ email }).select('accountCreated').lean();
    if (guestUser?.accountCreated) {
      return NextResponse.json({ exists: true });
    }

    try {
      await getAuth().getUserByEmail(email);
      return NextResponse.json({ exists: true });
    } catch (error) {
      if (error?.code !== 'auth/user-not-found') {
        console.error('account-status firebase lookup:', error?.message || error);
      }
    }

    return NextResponse.json({ exists: false });
  } catch (error) {
    console.error('account-status:', error);
    return NextResponse.json({ exists: false });
  }
}
