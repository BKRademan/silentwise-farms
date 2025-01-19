import { NextRequest } from 'next/server';
import { GrowerDAO } from '@/lib/db';
import { handleApiRoute, ValidationError } from '@/lib/api-utils';
import { Grower } from '@/types/database';
import { NextResponse } from 'next/server';

const growerDao = new GrowerDAO();

export async function GET(request: NextRequest) {
  try {
    console.log('🔄 Starting grower fetch request...');
    const growers = await growerDao.findActive();
    console.log('✅ Successfully fetched growers from database');

    return NextResponse.json({
      success: true,
      data: growers
    });
  } catch (error) {
    console.error('❌ Error in /api/growers GET:', error);
    // Log more details about the error
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }

    // Determine if it's a connection error
    const isConnectionError = error instanceof Error && 
      (error.message.includes('Connection is closed') || 
       error.message.includes('Failed to connect') ||
       error.message.includes('Connection lost'));

    return NextResponse.json(
      {
        success: false,
        error: isConnectionError ? 'Database connection error' : 'Failed to fetch growers',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { 
        status: isConnectionError ? 503 : 500 // Use 503 Service Unavailable for connection issues
      }
    );
  }
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