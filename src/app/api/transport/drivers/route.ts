import { TransportDAO } from '@/lib/db';
import { handleApiRoute } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

const transportDao = new TransportDAO();

export async function GET() {
  return handleApiRoute(() => transportDao.listDrivers());
}
