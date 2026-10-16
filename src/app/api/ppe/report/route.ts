import { NextRequest } from 'next/server';
import { PPEReportDAO } from '@/lib/db';
import { handleApiRoute, parseOrThrow } from '@/lib/api-utils';
import { dateRangeQuerySchema } from '@/lib/validations/capture';

export const dynamic = 'force-dynamic';

const reportDao = new PPEReportDAO();

export async function GET(request: NextRequest) {
  return handleApiRoute(async () => {
    const params = request.nextUrl.searchParams;
    const range = parseOrThrow(dateRangeQuerySchema, {
      startDate: params.get('startDate'),
      endDate: params.get('endDate'),
    });
    return reportDao.getReport(range);
  });
}
