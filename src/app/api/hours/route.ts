import { NextRequest } from 'next/server';
import { HoursDAO } from '@/lib/db';
import { handleApiRoute, ValidationError } from '@/lib/api-utils';
import { HourRecord } from '@/types/database';

const hoursDao = new HoursDAO();

export async function GET(request: NextRequest) {
  return handleApiRoute(async () => {
    const searchParams = request.nextUrl.searchParams;
    const startDateISO = searchParams.get('startDate');
    const endDateISO = searchParams.get('endDate');
    const employeeId = searchParams.get('employeeId');
    const growerId = searchParams.get('growerId');

    if (!startDateISO || !endDateISO) {
      throw new ValidationError('Start date and end date are required');
    }

    const start = new Date(startDateISO);
    const end = new Date(endDateISO);

    let records: HourRecord[];

    if (growerId && employeeId) {
      records = await hoursDao.getHoursByGrowerEmployeeAndDate(
        parseInt(growerId),
        parseInt(employeeId),
        start,
        end
      );
    } else if (growerId) {
      records = await hoursDao.getHoursByGrowerAndDate(
        parseInt(growerId),
        start,
        end
      );
    } else if (employeeId) {
      // Get records for the employee within date range
      records = await hoursDao.getHoursByEmployeeAndDate(
        parseInt(employeeId),
        start,
        end
      );
    } else {
      // Just get records by date range
      records = await hoursDao.getHoursByDateRange(
        start,
        new Date(end.getTime() - 1)  // Subtract 1ms to make end date inclusive
      );
    }

    return records;
  });
}

export async function POST(request: NextRequest) {
  return handleApiRoute(async () => {
    const body = await request.json();
    
    if (!body.Work_Date || !body.Hours_Worked || !body.Employee_ID_FK || !body.Grower_ID) {
      throw new ValidationError('Missing required fields');
    }

    const hourRecord: Omit<HourRecord, 'ID'> = {
      Work_Date: new Date(body.Work_Date),
      Hours_Worked: body.Hours_Worked,
      Employee_ID_FK: body.Employee_ID_FK,
      Employee: body.Employee,
      Grower_ID: body.Grower_ID,
      GrowerName: body.GrowerName,
      Overtime: body.Overtime || null,
      PHoliday: body.PHoliday || null,
      Emp_Rate: body.Emp_Rate || null,
      Con_Tot: body.Con_Tot || null,
      Man_Fee: body.Man_Fee || null,
      Sick_Leave: body.Sick_Leave || null
    };

    return hoursDao.addHourRecord(hourRecord);
  });
}

export async function PUT(request: NextRequest) {
  return handleApiRoute(async () => {
    const body = await request.json();
    
    if (!body.id) {
      throw new ValidationError('Missing record ID');
    }

    const updates: Partial<HourRecord> = {
      Work_Date: body.Work_Date ? new Date(body.Work_Date) : undefined,
      Hours_Worked: body.Hours_Worked,
      Employee_ID_FK: body.Employee_ID_FK,
      Grower_ID: body.Grower_ID,
      Overtime: body.Overtime,
      PHoliday: body.PHoliday,
      Sick_Leave: body.Sick_Leave
    };

    await hoursDao.updateHourRecord(body.id, updates);
    return { message: 'Record updated successfully' };
  });
}

export async function DELETE(request: NextRequest) {
  return handleApiRoute(async () => {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      throw new ValidationError('Missing record ID');
    }

    await hoursDao.deleteHourRecord(parseInt(id));
    return { message: 'Record deleted successfully' };
  });
} 