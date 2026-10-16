import { NextRequest } from 'next/server';
import { PPEGrowerChargeDAO } from '@/lib/db';
import { handleApiRoute, parseOrThrow, requireIdParam } from '@/lib/api-utils';
import { dateRangeQuerySchema, growerChargeInputSchema } from '@/lib/validations/capture';

export const dynamic = 'force-dynamic';

const growerChargeDao = new PPEGrowerChargeDAO();

export async function GET(request: NextRequest) {
  return handleApiRoute(async () => {
    const params = request.nextUrl.searchParams;
    const range = parseOrThrow(dateRangeQuerySchema, {
      startDate: params.get('startDate'),
      endDate: params.get('endDate'),
    });
    const growerId = params.get('growerId');
    return growerChargeDao.list({
      ...range,
      growerId: growerId ? requireIdParam(growerId, 'grower ID') : undefined,
    });
  });
}

export async function POST(request: NextRequest) {
  return handleApiRoute(async () => growerChargeDao.add(parseOrThrow(growerChargeInputSchema, await request.json())));
}

export async function PUT(request: NextRequest) {
  return handleApiRoute(async () => {
    const body = await request.json();
    const id = requireIdParam(body?.id != null ? String(body.id) : null, 'grower charge ID');
    await growerChargeDao.update(id, parseOrThrow(growerChargeInputSchema, body));
    return { message: 'Grower charge updated' };
  });
}

export async function DELETE(request: NextRequest) {
  return handleApiRoute(async () => {
    const id = requireIdParam(request.nextUrl.searchParams.get('id'), 'grower charge ID');
    await growerChargeDao.remove(id);
    return { message: 'Grower charge deleted' };
  });
}
