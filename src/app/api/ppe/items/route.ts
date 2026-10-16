import { NextRequest } from 'next/server';
import { PPEItemDAO } from '@/lib/db';
import { handleApiRoute, parseOrThrow, requireIdParam, ValidationError } from '@/lib/api-utils';
import { ppeItemInputSchema } from '@/lib/validations/capture';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const ppeItemDao = new PPEItemDAO();

const priceUpdateSchema = z.object({
  PPE_Item_Value: z.coerce.number().min(0, 'Deduction price cannot be negative'),
});

export async function GET() {
  return handleApiRoute(() => ppeItemDao.listWithUsage());
}

export async function POST(request: NextRequest) {
  return handleApiRoute(async () => {
    const input = parseOrThrow(ppeItemInputSchema, await request.json());
    if (await ppeItemDao.nameExists(input.PPE_Item)) {
      throw new ValidationError(`A PPE item called "${input.PPE_Item}" already exists`);
    }
    return ppeItemDao.add(input);
  });
}

export async function PUT(request: NextRequest) {
  return handleApiRoute(async () => {
    const body = await request.json();
    const id = requireIdParam(body?.id != null ? String(body.id) : null, 'PPE item ID');
    const input = parseOrThrow(ppeItemInputSchema, body);
    if (await ppeItemDao.nameExists(input.PPE_Item, id)) {
      throw new ValidationError(`A PPE item called "${input.PPE_Item}" already exists`);
    }
    await ppeItemDao.update(id, input);
    return { message: 'PPE item updated' };
  });
}

/** Price-only update, used by the "update deduction price" shortcut. */
export async function PATCH(request: NextRequest) {
  return handleApiRoute(async () => {
    const body = await request.json();
    const id = requireIdParam(body?.id != null ? String(body.id) : null, 'PPE item ID');
    const { PPE_Item_Value } = parseOrThrow(priceUpdateSchema, body);
    await ppeItemDao.updatePrice(id, PPE_Item_Value);
    return { message: 'Deduction price updated' };
  });
}

export async function DELETE(request: NextRequest) {
  return handleApiRoute(async () => {
    const id = requireIdParam(request.nextUrl.searchParams.get('id'), 'PPE item ID');
    const issued = await ppeItemDao.issueCount(id);
    if (issued > 0) {
      throw new ValidationError(
        `This item has been issued ${issued} time${issued === 1 ? '' : 's'} and cannot be deleted`
      );
    }
    await ppeItemDao.remove(id);
    return { message: 'PPE item deleted' };
  });
}
