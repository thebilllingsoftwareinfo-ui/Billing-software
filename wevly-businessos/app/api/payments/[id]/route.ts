import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';
import { PaymentService } from '@/lib/services/payment.service';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const payment = await PaymentService.getPaymentDetails(session, id);

    return NextResponse.json(payment);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Payment not found' },
      { status: 404 }
    );
  }
}
