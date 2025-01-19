import { NextRequest } from 'next/server';
import { DeductionsDAO } from '@/lib/db';
import { handleApiRoute, ValidationError } from '@/lib/api-utils';
import { Deduction } from '@/types/database';

const deductionsDao = new DeductionsDAO();

export async function GET(request: NextRequest) {
  return handleApiRoute(async () => {
    const searchParams = request.nextUrl.searchParams;
    const employeeId = searchParams.get('employeeId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const ppeItemId = searchParams.get('ppeItemId');

    if (employeeId) {
      if (startDate && endDate) {
        return deductionsDao.getDeductionSummaryByEmployee(
          employeeId,
          new Date(startDate),
          new Date(endDate)
        );
      }
      return deductionsDao.getDeductionsByEmployee(employeeId);
    }

    if (startDate && endDate) {
      return deductionsDao.getDeductionsByDateRange(
        new Date(startDate),
        new Date(endDate)
      );
    }

    if (ppeItemId) {
      return deductionsDao.getDeductionsByPPEItem(parseInt(ppeItemId));
    }

    return deductionsDao.findAll();
  });
}

export async function POST(request: NextRequest) {
  return handleApiRoute(async () => {
    const body = await request.json();
    
    if (!body.FK_Emp_ID || !body.Date) {
      throw new ValidationError('Missing required fields');
    }

    const deduction: Omit<Deduction, 'ID'> = {
      Loans: body.Loans || null,
      PPE: body.PPE || null,
      Date: new Date(body.Date),
      FK_Emp_ID: body.FK_Emp_ID,
      FK_PPE_Item: body.FK_PPE_Item || null
    };

    return deductionsDao.addDeduction(deduction);
  });
}

export async function PUT(request: NextRequest) {
  return handleApiRoute(async () => {
    const body = await request.json();
    
    if (!body.id) {
      throw new ValidationError('Missing deduction ID');
    }

    const updates: Partial<Deduction> = {
      Loans: body.Loans,
      PPE: body.PPE,
      Date: body.Date ? new Date(body.Date) : undefined,
      FK_Emp_ID: body.FK_Emp_ID,
      FK_PPE_Item: body.FK_PPE_Item
    };

    await deductionsDao.updateDeduction(body.id, updates);
    return { message: 'Deduction updated successfully' };
  });
}

export async function DELETE(request: NextRequest) {
  return handleApiRoute(async () => {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      throw new ValidationError('Missing deduction ID');
    }

    await deductionsDao.deleteDeduction(parseInt(id));
    return { message: 'Deduction deleted successfully' };
  });
} 