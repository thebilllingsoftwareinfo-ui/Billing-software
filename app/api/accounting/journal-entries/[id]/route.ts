import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';
import { AccountingService } from '@/lib/services/accounting.service';

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
    const entry = await AccountingService.getJournalEntryById(session, id);

    return NextResponse.json(entry);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Journal entry not found' },
      { status: error.message?.includes('FORBIDDEN') ? 403 : 404 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const reason = body.reason || 'Reversal requested by user';

    const reversal = await AccountingService.reverseJournalEntry(session, id, reason);

    return NextResponse.json(reversal, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to reverse journal entry' },
      { status: error.message?.includes('FORBIDDEN') ? 403 : 400 }
    );
  }
}
