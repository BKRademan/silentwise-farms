import { NextRequest } from 'next/server';
import { DeductionsDAO } from '@/lib/db';
import { handleApiRoute, ValidationError } from '@/lib/api-utils';
import { Deduction } from '@/types/database';
import { requireSouthAfricaDateOnly } from '@/lib/date-time/south-africa';

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
          requireSouthAfricaDateOnly(startDate, 'startDate'),
          requireSouthAfricaDateOnly(endDate, 'endDate')
        );
      }
      return deductionsDao.getDeductionsByEmployee(employeeId);
    }

    if (startDate && endDate) {
      return deductionsDao.getDeductionsByDateRange(
        requireSouthAfricaDateOnly(startDate, 'startDate'),
        requireSouthAfricaDateOnly(endDate, 'endDate')
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
      Date: requireSouthAfricaDateOnly(body.Date, 'Date'),
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
      Date: body.Date ? requireSouthAfricaDateOnly(body.Date, 'Date') : undefined,
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