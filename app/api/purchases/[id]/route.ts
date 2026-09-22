import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';
import { PurchaseService } from '@/lib/services/purchase.service';

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
    const bill = await PurchaseService.getPurchaseBillDetails(session, id);

    return NextResponse.json(bill);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Purchase bill not found' },
      { status: 404 }
    );
  }
}
