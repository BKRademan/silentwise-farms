import { NextRequest } from 'next/server';
import { EmployeeDAO } from '@/lib/db';
import { handleApiRoute } from '@/lib/api-utils';

const employeeDao = new EmployeeDAO();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return handleApiRoute(async () => {
    const employee = await employeeDao.findById(parseInt(params.id));
    if (!employee) {
      throw new Error('Employee not found');
    }
    return employee;
  });
} 