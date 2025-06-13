import { NextResponse } from 'next/server';
import { EmployeeDAO } from '@/lib/db/employee-dao';

// Force this route to be dynamic and disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
export const runtime = 'nodejs';

export async function GET() {
  try {
    console.log('[Available Numbers API] Request received at:', new Date().toISOString());
    console.log('[Available Numbers API] Environment:', process.env.NODE_ENV);
    
    const employeeDao = new EmployeeDAO();
    const availableEmployeeNumbers = await employeeDao.getAvailableEmployeeNumbers();
    
    console.log('[Available Numbers API] Query completed, found:', availableEmployeeNumbers.length, 'numbers');
    
    // Return with cache control headers to prevent caching
    return new NextResponse(JSON.stringify(availableEmployeeNumbers), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store',
        // Netlify-specific headers
        'Netlify-CDN-Cache-Control': 'no-cache',
        'CDN-Cache-Control': 'no-cache',
        // Additional anti-caching headers
        'Vary': 'Accept-Encoding',
        'Last-Modified': new Date().toUTCString(),
        'ETag': `"${Date.now()}-${Math.random()}"`
      }
    });
  } catch (error) {
    console.error('Error fetching available employee numbers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch available employee numbers' },
      { status: 500 }
    );
  }
} 