import { NextRequest } from 'next/server';
import { GrowerDAO } from '@/lib/db';
import { handleApiRoute, ValidationError } from '@/lib/api-utils';
import { Grower } from '@/types/database';
import { NextResponse } from 'next/server';

const growerDao = new GrowerDAO();

export async function GET() {
  const growers = await growerDao.findActive();
  return NextResponse.json(growers);
}

export async function POST(request: NextRequest) {
  return handleApiRoute(async () => {
    const body = await request.json();
    
    if (!body.GrowerName) {
      throw new ValidationError('Missing required fields');
    }

    const grower: Omit<Grower, 'ID'> = {
      GrowerName: body.GrowerName,
      RatePerKM: body.RatePerKM || null,
      HasManFee: body.HasManFee || false,
      ManFee: body.ManFee || null,
      PaysSickLeave: body.PaysSickLeave || false,
      ContPerc: body.ContPerc || null,
      AnnualLeavePerc: body.AnnualLeavePerc || null,
      SickLeavePerc: body.SickLeavePerc || null,
      WMCPerc: body.WMCPerc || null,
      SDLPerc: body.SDLPerc || null,
      PPEPerc: body.PPEPerc || null,
      UIFPerc: body.UIFPerc || null,
      HrsPerDay: body.HrsPerDay || null
    };

    return growerDao.addGrower(grower);
  });
}

export async function PUT(request: NextRequest) {
  return handleApiRoute(async () => {
    const body = await request.json();
    
    if (!body.id) {
      throw new ValidationError('Missing grower ID');
    }

    const updates: Partial<Grower> = {
      GrowerName: body.GrowerName,
      RatePerKM: body.RatePerKM,
      HasManFee: body.HasManFee,
      ManFee: body.ManFee,
      PaysSickLeave: body.PaysSickLeave,
      ContPerc: body.ContPerc,
      AnnualLeavePerc: body.AnnualLeavePerc,
      SickLeavePerc: body.SickLeavePerc,
      WMCPerc: body.WMCPerc,
      SDLPerc: body.SDLPerc,
      PPEPerc: body.PPEPerc,
      UIFPerc: body.UIFPerc,
      HrsPerDay: body.HrsPerDay
    };

    await growerDao.updateGrower(body.id, updates);
    return { message: 'Grower updated successfully' };
  });
} 