import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';

// In-memory fallback store for demo/development
interface LocalPaymentOut {
  id: string;
  receipt_no: string;
  party_name: string;
  party_id?: string | null;
  payment_type: string;
  reference_no?: string | null;
  payment_date: string;
  amount_paise: number;
  description?: string | null;
  receipt_url?: string | null;
  created_at: string;
}

const localPaymentsOut: LocalPaymentOut[] = [
  {
    id: 'pout-1',
    receipt_no: '1',
    party_name: 'rahul',
    payment_type: 'rahul',
    reference_no: 'REF-8821',
    payment_date: new Date().toISOString().split('T')[0],
    amount_paise: 450000,
    description: 'Advance payment for supplies',
    created_at: new Date().toISOString(),
  },
  {
    id: 'pout-2',
    receipt_no: '2',
    party_name: 'Sunil Enterprises',
    payment_type: 'Bank Account',
    reference_no: 'HDFC-49102',
    payment_date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    amount_paise: 1200000,
    description: 'Settlement against raw materials',
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.toLowerCase() || '';
    const paymentType = searchParams.get('paymentType') || '';

    let results = [...localPaymentsOut];

    // Try Supabase if available
    try {
      const session = await getServerSession();
      if (session) {
        const orgId = session.organization_id || session.organization?.id;
        if (orgId) {
          const supabase = createAdminClient();
          const { data, error } = await supabase
            .from('payments_out')
            .select('*')
            .eq('organization_id', orgId)
            .order('created_at', { ascending: false });

          if (!error && data && data.length > 0) {
            results = data.map((d: any) => ({
              id: d.id,
              receipt_no: d.receipt_no || d.receipt_number || '1',
              party_name: d.party_name || d.vendor_name || 'Party',
              party_id: d.party_id,
              payment_type: d.payment_type || d.payment_method || 'Cash',
              reference_no: d.reference_no || d.reference_number,
              payment_date: d.payment_date,
              amount_paise: d.amount_paise,
              description: d.description,
              receipt_url: d.receipt_url,
              created_at: d.created_at,
            }));
          }
        }
      }
    } catch {
      // Use in-memory store
    }

    if (search) {
      results = results.filter(
        (p) =>
          p.party_name.toLowerCase().includes(search) ||
          p.receipt_no.toLowerCase().includes(search) ||
          (p.reference_no && p.reference_no.toLowerCase().includes(search))
      );
    }

    if (paymentType && paymentType !== 'all') {
      results = results.filter(
        (p) => p.payment_type.toLowerCase() === paymentType.toLowerCase()
      );
    }

    return NextResponse.json({
      payments: results,
      total: results.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to list Payment-Out records' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.party_name) {
      return NextResponse.json({ error: 'Party name is required' }, { status: 400 });
    }

    if (!body.amount_paise || body.amount_paise <= 0) {
      return NextResponse.json({ error: 'Valid amount is required' }, { status: 400 });
    }

    const newRecord: LocalPaymentOut = {
      id: `pout-${Date.now()}`,
      receipt_no: String(body.receipt_no || localPaymentsOut.length + 1),
      party_name: body.party_name,
      party_id: body.party_id || null,
      payment_type: body.payment_type || 'Cash',
      reference_no: body.reference_no || null,
      payment_date: body.payment_date || new Date().toISOString().split('T')[0],
      amount_paise: Number(body.amount_paise),
      description: body.description || null,
      receipt_url: body.receipt_url || null,
      created_at: new Date().toISOString(),
    };

    // Store in memory
    localPaymentsOut.unshift(newRecord);

    // Try storing in Supabase if exists
    try {
      const session = await getServerSession();
      if (session) {
        const orgId = session.organization_id || session.organization?.id;
        const supabase = createAdminClient();
        await supabase.from('payments_out').insert({
          organization_id: orgId,
          party_name: newRecord.party_name,
          party_id: newRecord.party_id,
          receipt_no: newRecord.receipt_no,
          payment_type: newRecord.payment_type,
          reference_no: newRecord.reference_no,
          payment_date: newRecord.payment_date,
          amount_paise: newRecord.amount_paise,
          description: newRecord.description,
          receipt_url: newRecord.receipt_url,
        } as any);
      }
    } catch {
      // In-memory handles persistence for dev
    }

    return NextResponse.json(newRecord, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to record Payment-Out' },
      { status: 400 }
    );
  }
}
