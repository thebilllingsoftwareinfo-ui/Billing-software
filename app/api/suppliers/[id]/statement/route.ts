import { NextRequest, NextResponse } from 'next/server'
import { getApiSession } from '@/lib/auth/api-session'
import { CrmService } from '@/lib/services/crm.service'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getApiSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start_date') || undefined
    const endDate = searchParams.get('end_date') || undefined
    const format = searchParams.get('format')

    const statement = await CrmService.getSupplierStatement(session, id, { startDate, endDate })

    if (format === 'csv') {
      const csvLines: string[] = []
      csvLines.push(`Supplier Statement: ${statement.party.display_name || statement.party.name}`)
      csvLines.push(`Period: ${startDate || 'All'} to ${endDate || 'Present'}`)
      csvLines.push('')
      csvLines.push(`Opening Balance,${statement.opening_balance.toFixed(2)}`)
      csvLines.push('')
      csvLines.push('Date,Type,Reference,Description,Debit,Credit,Running Balance')

      for (const line of statement.lines) {
        csvLines.push(
          `${line.date},${line.type},${line.reference},"${(line.description || '').replace(/"/g, '""')}",${line.debit.toFixed(2)},${line.credit.toFixed(2)},${line.running_balance.toFixed(2)}`
        )
      }

      csvLines.push('')
      csvLines.push(`Total Debits,${statement.total_debits.toFixed(2)}`)
      csvLines.push(`Total Credits,${statement.total_credits.toFixed(2)}`)
      csvLines.push(`Closing Balance,${statement.closing_balance.toFixed(2)}`)

      const csvContent = csvLines.join('\n')
      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="supplier-statement-${id}.csv"`,
        },
      })
    }

    return NextResponse.json({ success: true, data: statement })
  } catch (error: any) {
    console.error('[Supplier Statement] Error:', error?.message)
    if (error?.message === 'Supplier not found') {
      return NextResponse.json({ success: false, error: 'Supplier not found' }, { status: 404 })
    }
    if (error?.message?.includes('Permission')) {
      return NextResponse.json({ success: false, error: error.message }, { status: 403 })
    }
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
