import { NextRequest } from 'next/server';
import { TransportDAO } from '@/lib/db';
import { handleApiRoute, parseOrThrow, requireIdParam } from '@/lib/api-utils';
import { dateRangeQuerySchema, transportInputSchema } from '@/lib/validations/capture';

const transportDao = new TransportDAO();

export async function GET(request: NextRequest) {
  return handleApiRoute(async () => {
    const params = request.nextUrl.searchParams;
    const range = parseOrThrow(dateRangeQuerySchema, {
      startDate: params.get('startDate'),
      endDate: params.get('endDate'),
    });
    const growerId = params.get('growerId');

    return transportDao.list({
      ...range,
      growerId: growerId ? requireIdParam(growerId, 'grower ID') : undefined,
    });
  });
}

export async function POST(request: NextRequest) {
  return handleApiRoute(async () => {
    const input = parseOrThrow(transportInputSchema, await request.json());
    return transportDao.add(input);
  });
}

export async function PUT(request: NextRequest) {
  return handleApiRoute(async () => {
    const body = await request.json();
    const id = requireIdParam(body?.id != null ? String(body.id) : null, 'transport ID');
    await transportDao.update(id, parseOrThrow(transportInputSchema, body));
    return { message: 'Transport record updated' };
  });
}

export async function DELETE(request: NextRequest) {
  return handleApiRoute(async () => {
    const id = requireIdParam(request.nextUrl.searchParams.get('id'), 'transport ID');
    await transportDao.remove(id);
    return { message: 'Transport record deleted' };
  });
}
