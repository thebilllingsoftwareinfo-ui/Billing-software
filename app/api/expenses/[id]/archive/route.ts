import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';
import { ExpenseService } from '@/lib/services/expense.service';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { is_archived } = await req.json();

    const result = await ExpenseService.archiveExpense(
      session,
      id,
      is_archived !== undefined ? !!is_archived : true
    );

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update expense archive state' },
      { status: 400 }
    );
  }
}
