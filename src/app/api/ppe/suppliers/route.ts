import { NextRequest } from 'next/server';
import { PPESupplierDAO } from '@/lib/db';
import { handleApiRoute, parseOrThrow, requireIdParam } from '@/lib/api-utils';
import { supplierInputSchema } from '@/lib/validations/capture';

export const dynamic = 'force-dynamic';

const supplierDao = new PPESupplierDAO();

export async function GET() {
  return handleApiRoute(() => supplierDao.listWithUsage());
}

export async function POST(request: NextRequest) {
  return handleApiRoute(async () => supplierDao.add(parseOrThrow(supplierInputSchema, await request.json())));
}

export async function PUT(request: NextRequest) {
  return handleApiRoute(async () => {
    const body = await request.json();
    const id = requireIdParam(body?.id != null ? String(body.id) : null, 'supplier ID');
    await supplierDao.update(id, parseOrThrow(supplierInputSchema, body));
    return { message: 'Supplier updated' };
  });
}

export async function DELETE(request: NextRequest) {
  return handleApiRoute(async () => {
    const id = requireIdParam(request.nextUrl.searchParams.get('id'), 'supplier ID');
    await supplierDao.remove(id);
    return { message: 'Supplier deleted' };
  });
}
