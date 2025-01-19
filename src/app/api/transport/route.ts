import { NextRequest } from 'next/server';
import { TransportDAO } from '@/lib/db';
import { handleApiRoute, ValidationError } from '@/lib/api-utils';
import { Transport } from '@/types/database';

const transportDao = new TransportDAO();

export async function GET(request: NextRequest) {
  return handleApiRoute(async () => {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const growerId = searchParams.get('growerId');
    const driver = searchParams.get('driver');

    if (startDate && endDate) {
      return transportDao.getTransportByDateRange(
        new Date(startDate),
        new Date(endDate)
      );
    }

    if (growerId) {
      return transportDao.getTransportByGrower(parseInt(growerId));
    }

    if (driver) {
      return transportDao.getTransportByDriver(driver);
    }

    return transportDao.findAll();
  });
}

export async function POST(request: NextRequest) {
  return handleApiRoute(async () => {
    const body = await request.json();
    
    if (!body.Grower_ID_FK || !body.Date || !body.KM || !body.Driver) {
      throw new ValidationError('Missing required fields');
    }

    const transport: Omit<Transport, 'ID'> = {
      Grower_ID_FK: body.Grower_ID_FK,
      Date: new Date(body.Date),
      KM: body.KM,
      RatePerKM: body.RatePerKM || null,
      Driver: body.Driver,
      Comment: body.Comment || null
    };

    return transportDao.addTransport(transport);
  });
}

export async function PUT(request: NextRequest) {
  return handleApiRoute(async () => {
    const body = await request.json();
    
    if (!body.id) {
      throw new ValidationError('Missing transport ID');
    }

    const updates: Partial<Transport> = {
      Grower_ID_FK: body.Grower_ID_FK,
      Date: body.Date ? new Date(body.Date) : undefined,
      KM: body.KM,
      RatePerKM: body.RatePerKM,
      Driver: body.Driver,
      Comment: body.Comment
    };

    await transportDao.updateTransport(body.id, updates);
    return { message: 'Transport record updated successfully' };
  });
}

export async function DELETE(request: NextRequest) {
  return handleApiRoute(async () => {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      throw new ValidationError('Missing transport ID');
    }

    await transportDao.deleteTransport(parseInt(id));
    return { message: 'Transport record deleted successfully' };
  });
} 