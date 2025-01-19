import { NextRequest } from 'next/server';
import { PPEDAO } from '@/lib/db';
import { handleApiRoute, ValidationError } from '@/lib/api-utils';
import { PPEItem } from '@/types/database';

const ppeDao = new PPEDAO();

export async function GET(request: NextRequest) {
  return handleApiRoute(async () => {
    const searchParams = request.nextUrl.searchParams;
    const name = searchParams.get('name');
    const minValue = searchParams.get('minValue');
    const maxValue = searchParams.get('maxValue');

    if (name) {
      return ppeDao.findByName(name);
    }

    if (minValue && maxValue) {
      return ppeDao.getPPEItemsByValue(
        parseFloat(minValue),
        parseFloat(maxValue)
      );
    }

    return ppeDao.findAll();
  });
}

export async function POST(request: NextRequest) {
  return handleApiRoute(async () => {
    const body = await request.json();
    
    if (!body.PPE_Item) {
      throw new ValidationError('Missing required fields');
    }

    const ppeItem: Omit<PPEItem, 'ID'> = {
      PPE_Item: body.PPE_Item,
      PPE_Item_Value: body.PPE_Item_Value || null
    };

    return ppeDao.addPPEItem(ppeItem);
  });
}

export async function PUT(request: NextRequest) {
  return handleApiRoute(async () => {
    const body = await request.json();
    
    if (!body.id) {
      throw new ValidationError('Missing PPE item ID');
    }

    const updates: Partial<PPEItem> = {
      PPE_Item: body.PPE_Item,
      PPE_Item_Value: body.PPE_Item_Value
    };

    await ppeDao.updatePPEItem(body.id, updates);
    return { message: 'PPE item updated successfully' };
  });
}

export async function DELETE(request: NextRequest) {
  return handleApiRoute(async () => {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      throw new ValidationError('Missing PPE item ID');
    }

    await ppeDao.deletePPEItem(parseInt(id));
    return { message: 'PPE item deleted successfully' };
  });
} 