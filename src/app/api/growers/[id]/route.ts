import { NextRequest } from 'next/server';
import { GrowerDAO } from '@/lib/db';
import { handleApiRoute } from '@/lib/api-utils';

const growerDao = new GrowerDAO();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return handleApiRoute(async () => {
    const grower = await growerDao.findById(parseInt(params.id));
    if (!grower) {
      throw new Error('Grower not found');
    }
    return grower;
  });
} 