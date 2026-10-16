import { PPEStockDAO } from '@/lib/db';
import { handleApiRoute } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

const stockDao = new PPEStockDAO();

export async function GET() {
  return handleApiRoute(() => stockDao.listStockLevels());
}
