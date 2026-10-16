import { NextRequest } from 'next/server';
import { TransportDAO, TransportDriverDAO } from '@/lib/db';
import { handleApiRoute, parseOrThrow, requireIdParam, ValidationError } from '@/lib/api-utils';
import { dateRangeQuerySchema, transportInputSchema } from '@/lib/validations/capture';

const transportDao = new TransportDAO();
const driverDao = new TransportDriverDAO();

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
    return transportDao.add({ ...input, Driver: await driverDao.resolveForTransport(input.Driver) });
  });
}

export async function PUT(request: NextRequest) {
  return handleApiRoute(async () => {
    const body = await request.json();
    const id = requireIdParam(body?.id != null ? String(body.id) : null, 'transport ID');
    const input = parseOrThrow(transportInputSchema, body);
    const current = await transportDao.findById(id);
    if (!current) throw new ValidationError('Transport record not found');
    await transportDao.update(id, {
      ...input,
      Driver: await driverDao.resolveForTransport(input.Driver, current.Driver),
    });
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
