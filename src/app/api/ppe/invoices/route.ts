import { NextRequest } from 'next/server';
import { PPEInvoiceDAO } from '@/lib/db';
import { handleApiRoute, parseOrThrow, requireIdParam, ValidationError } from '@/lib/api-utils';
import { dateRangeQuerySchema, invoiceInputSchema } from '@/lib/validations/capture';

export const dynamic = 'force-dynamic';

const invoiceDao = new PPEInvoiceDAO();

/** `?id=` returns one invoice with its lines; otherwise invoices in the date range. */
export async function GET(request: NextRequest) {
  return handleApiRoute(async () => {
    const params = request.nextUrl.searchParams;
    const id = params.get('id');
    if (id) {
      const invoice = await invoiceDao.getDetail(requireIdParam(id, 'invoice ID'));
      if (!invoice) throw new ValidationError('Invoice not found');
      return invoice;
    }

    const range = parseOrThrow(dateRangeQuerySchema, {
      startDate: params.get('startDate'),
      endDate: params.get('endDate'),
    });
    const supplierId = params.get('supplierId');
    return invoiceDao.list({
      ...range,
      supplierId: supplierId ? requireIdParam(supplierId, 'supplier ID') : undefined,
    });
  });
}

export async function POST(request: NextRequest) {
  return handleApiRoute(async () => invoiceDao.save(null, parseOrThrow(invoiceInputSchema, await request.json())));
}

/** Replaces the header and all lines of an existing invoice. */
export async function PUT(request: NextRequest) {
  return handleApiRoute(async () => {
    const body = await request.json();
    const id = requireIdParam(body?.id != null ? String(body.id) : null, 'invoice ID');
    return invoiceDao.save(id, parseOrThrow(invoiceInputSchema, body));
  });
}

export async function DELETE(request: NextRequest) {
  return handleApiRoute(async () => {
    const id = requireIdParam(request.nextUrl.searchParams.get('id'), 'invoice ID');
    await invoiceDao.remove(id);
    return { message: 'Invoice deleted' };
  });
}
