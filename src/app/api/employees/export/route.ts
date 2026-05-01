import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import {
  EmployeeDAO,
  type EmployeeDetailsExportRow,
} from '@/lib/db/employee-dao';

const EXPORT_COLUMNS = [
  'Company',
  'Employee',
  'Surname',
  'Initials',
  'First name',
  'Second name',
  'Known as',
  'Title',
  'Id number/Co No',
  'Date of birth',
  'Date engaged',
  'Date terminated',
  'Language',
  'Group',
  'Gender',
  'Marital status',
  'Home number',
  'Business number',
  'Cell number',
  'Tax number',
  'Tax status',
  'UIF status',
  'Tax year start',
  'UIF End Date',
  'New UIF Start Date',
  'Pay method',
  'Bank acc type',
  'Bank acc no',
  'Branch code',
  'Bank name',
  'Acc holder',
  'Acc relationship',
  'Hrs per period',
  'Hours per day',
  'Work address code',
  'Rep addr1',
  'Rep addr2',
  'Rep addr3',
  'Rep post code',
  'Res unit',
  'Res complex',
  'Res street no',
  'Res street name',
  'Res suburb',
  'Res city',
  'Res post code',
  'Residential Country',
  'Link postal to',
] as const;

function cellValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value);
}

function buildWorkbook(rows: EmployeeDetailsExportRow[]): Buffer {
  const worksheetData = [
    [...EXPORT_COLUMNS],
    ...rows.map((row) => EXPORT_COLUMNS.map((column) => cellValue(row[column]))),
  ];
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  worksheet['!cols'] = EXPORT_COLUMNS.map((column) => ({
    wch: Math.max(column.length + 2, 14),
  }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Employee Details');

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

function filenameSafe(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
}

export async function GET(request: NextRequest) {
  const companyNumber = request.nextUrl.searchParams.get('company')?.trim();

  if (!companyNumber) {
    return NextResponse.json(
      { error: 'Company number is required' },
      { status: 400 }
    );
  }

  try {
    const employeeDao = new EmployeeDAO();
    await employeeDao.refreshTaxYearStartForAllEmployees();
    const rows = await employeeDao.getDetailsExportRows(companyNumber);
    const workbook = buildWorkbook(rows);
    const safeCompany = filenameSafe(companyNumber) || 'company';

    return new NextResponse(workbook, {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="employee-details-${safeCompany}.xlsx"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Error exporting employee details:', error);
    return NextResponse.json(
      { error: 'Failed to export employee details' },
      { status: 500 }
    );
  }
}
