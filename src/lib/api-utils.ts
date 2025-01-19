import { NextResponse } from 'next/server';

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

export function successResponse<T>(data: T): NextResponse<ApiResponse<T>> {
  return NextResponse.json({
    success: true,
    data,
  });
}

export function errorResponse(error: string | Error, status = 400): NextResponse<ApiResponse<never>> {
  const message = error instanceof Error ? error.message : error;
  return NextResponse.json(
    {
      success: false,
      error: message,
    },
    { status }
  );
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export async function handleApiRoute<T>(
  handler: () => Promise<T>
): Promise<NextResponse<ApiResponse<T>>> {
  try {
    const data = await handler();
    return successResponse(data);
  } catch (error) {
    console.error('API Error:', error);
    
    if (error instanceof ValidationError) {
      return errorResponse(error, 400);
    }
    
    if (error instanceof Error) {
      return errorResponse(error, 500);
    }
    
    return errorResponse('An unexpected error occurred', 500);
  }
} 