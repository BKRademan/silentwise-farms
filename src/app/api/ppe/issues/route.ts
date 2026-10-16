import { NextRequest } from 'next/server';
import { DeductionsDAO } from '@/lib/db';
import { handleApiRoute, parseOrThrow, requireIdParam } from '@/lib/api-utils';
import { dateRangeQuerySchema, ppeIssueInputSchema } from '@/lib/validations/capture';

const deductionsDao = new DeductionsDAO();

export async function GET(request: NextRequest) {
  return handleApiRoute(async () => {
    const params = request.nextUrl.searchParams;
    const range = parseOrThrow(dateRangeQuerySchema, {
      startDate: params.get('startDate'),
      endDate: params.get('endDate'),
    });
    const employeeId = params.get('employeeId');
    const ppeItemId = params.get('ppeItemId');

    return deductionsDao.listPPEIssues({
      ...range,
      employeeId: employeeId ? requireIdParam(employeeId, 'employee ID') : undefined,
      ppeItemId: ppeItemId ? requireIdParam(ppeItemId, 'PPE item ID') : undefined,
    });
  });
}

export async function POST(request: NextRequest) {
  return handleApiRoute(async () => {
    const input = parseOrThrow(ppeIssueInputSchema, await request.json());
    return deductionsDao.addPPEIssue(input);
  });
}

export async function PUT(request: NextRequest) {
  return handleApiRoute(async () => {
    const body = await request.json();
    const id = requireIdParam(body?.id != null ? String(body.id) : null, 'PPE issue ID');
    await deductionsDao.updatePPEIssue(id, parseOrThrow(ppeIssueInputSchema, body));
    return { message: 'PPE issue updated' };
  });
}

export async function DELETE(request: NextRequest) {
  return handleApiRoute(async () => {
    const id = requireIdParam(request.nextUrl.searchParams.get('id'), 'PPE issue ID');
    await deductionsDao.remove(id);
    return { message: 'PPE issue deleted' };
  });
}
