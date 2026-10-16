import { NextRequest } from 'next/server';
import { PPEStockDAO } from '@/lib/db';
import { handleApiRoute, parseOrThrow, requireIdParam } from '@/lib/api-utils';
import { stockAdjustmentInputSchema } from '@/lib/validations/capture';

export const dynamic = 'force-dynamic';

const stockDao = new PPEStockDAO();

export async function GET(request: NextRequest) {
  return handleApiRoute(async () => {
    const ppeItemId = request.nextUrl.searchParams.get('ppeItemId');
    return stockDao.listAdjustments(ppeItemId ? requireIdParam(ppeItemId, 'PPE item ID') : undefined);
  });
}

export async function POST(request: NextRequest) {
  return handleApiRoute(async () => stockDao.addAdjustment(parseOrThrow(stockAdjustmentInputSchema, await request.json())));
}

export async function PUT(request: NextRequest) {
  return handleApiRoute(async () => {
    const body = await request.json();
    const id = requireIdParam(body?.id != null ? String(body.id) : null, 'stock adjustment ID');
    await stockDao.updateAdjustment(id, parseOrThrow(stockAdjustmentInputSchema, body));
    return { message: 'Stock adjustment updated' };
  });
}

export async function DELETE(request: NextRequest) {
  return handleApiRoute(async () => {
    const id = requireIdParam(request.nextUrl.searchParams.get('id'), 'stock adjustment ID');
    await stockDao.removeAdjustment(id);
    return { message: 'Stock adjustment deleted' };
  });
}
