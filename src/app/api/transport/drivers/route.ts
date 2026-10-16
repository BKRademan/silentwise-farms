import { NextRequest } from 'next/server';
import { TransportDriverDAO } from '@/lib/db';
import { handleApiRoute, parseOrThrow, requireIdParam } from '@/lib/api-utils';
import { driverInputSchema } from '@/lib/validations/capture';

export const dynamic = 'force-dynamic';

const driverDao = new TransportDriverDAO();

/** Active drivers for capture; `?all=1` returns every driver with its transport usage. */
export async function GET(request: NextRequest) {
  return handleApiRoute(() =>
    request.nextUrl.searchParams.get('all') === '1' ? driverDao.listWithUsage() : driverDao.listActive()
  );
}

export async function POST(request: NextRequest) {
  return handleApiRoute(async () => driverDao.add(parseOrThrow(driverInputSchema, await request.json())));
}

/** Renames (also updating matching `TTransport.Driver` text) and/or (de)activates a driver. */
export async function PUT(request: NextRequest) {
  return handleApiRoute(async () => {
    const body = await request.json();
    const id = requireIdParam(body?.id != null ? String(body.id) : null, 'driver ID');
    const result = await driverDao.update(id, parseOrThrow(driverInputSchema, body));
    return { message: 'Driver updated', ...result };
  });
}

export async function DELETE(request: NextRequest) {
  return handleApiRoute(async () => {
    const id = requireIdParam(request.nextUrl.searchParams.get('id'), 'driver ID');
    await driverDao.remove(id);
    return { message: 'Driver deleted' };
  });
}
