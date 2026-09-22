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
    const statement = await PurchaseService.getSupplierStatement(session, id);

    return NextResponse.json(statement);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Supplier statement not found' },
      { status: 404 }
    );
  }
}
