'use client';

import { HourRecord } from '@/types/database';
import { Document, Page, Text, View, StyleSheet, PDFViewer } from '@react-pdf/renderer';
import { format } from 'date-fns';

interface HoursPDFReportProps {
  data: HourRecord[];
  filters: {
    startDate?: string;
    endDate?: string;
    growerName?: string;
    employeeName?: string;
  };
  analytics: {
    totalRecords: number;
    uniqueEmployees: number;
    totalHours: number;
    uniqueGrowers: number;
  };
}

// Create styles
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 30,
  },
  title: {
    fontSize: 20,
    marginBottom: 20,
    textAlign: 'center',
  },
  filtersSection: {
    marginBottom: 20,
  },
  filterRow: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  filterLabel: {
    width: 65,
    fontWeight: 'bold',
    fontSize: 10,
  },
  filterValue: {
    flex: 1,
    fontSize: 10,
  },
  analyticsGrid: {
    flexDirection: 'row',
    marginBottom: 20,
    justifyContent: 'space-between',
    paddingHorizontal: 40,
  },
  analyticsItem: {
    flex: 1,
    alignItems: 'center',
    maxWidth: 150,
  },
  analyticsLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    textAlign: 'center',
  },
  analyticsValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1d4ed8',
    textAlign: 'center',
  },
  table: {
    width: '100%',
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    paddingBottom: 5,
    backgroundColor: '#f3f4f6',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    paddingVertical: 5,
  },
  tableCell: {
    flex: 1,
    fontSize: 10,
    padding: 3,
  },
  tableCellCenter: {
    flex: 1,
    fontSize: 10,
    padding: 3,
    textAlign: 'center',
  },
  tableCellRight: {
    flex: 1,
    fontSize: 10,
    padding: 3,
    textAlign: 'right',
  },
});

export function HoursPDFReport({ data, filters, analytics }: HoursPDFReportProps) {
  return (
    <PDFViewer style={{ width: '100%', height: '80vh' }}>
      <Document>
        <Page size="A4" style={styles.page}>
          <Text style={styles.title}>Hours Report</Text>

          {/* Filters Section */}
          <View style={styles.filtersSection}>
            <View style={styles.filterRow}>
              <Text style={styles.filterLabel}>Date Range:</Text>
              <Text style={styles.filterValue}>
                {filters.startDate && filters.endDate
                  ? `${format(new Date(filters.startDate), 'PP')} - ${format(new Date(filters.endDate), 'PP')}`
                  : 'All Dates'}
              </Text>
            </View>
            <View style={styles.filterRow}>
              <Text style={styles.filterValue}>
                {filters.growerName}
              </Text>
            </View>
            {filters.employeeName && (
              <View style={styles.filterRow}>
                <Text style={styles.filterLabel}>Employee:</Text>
                <Text style={styles.filterValue}>
                  {filters.employeeName}
                </Text>
              </View>
            )}
          </View>

          {/* Analytics Grid */}
          <View style={styles.analyticsGrid}>
            <View style={styles.analyticsItem}>
              <Text style={styles.analyticsLabel}>Total Records</Text>
              <Text style={styles.analyticsValue}>{analytics.totalRecords}</Text>
            </View>
            <View style={styles.analyticsItem}>
              <Text style={styles.analyticsLabel}>Employees</Text>
              <Text style={styles.analyticsValue}>{analytics.uniqueEmployees}</Text>
            </View>
            <View style={styles.analyticsItem}>
              <Text style={styles.analyticsLabel}>Total Hours</Text>
              <Text style={styles.analyticsValue}>{analytics.totalHours}</Text>
            </View>
          </View>

          {/* Table */}
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.tableCell}>Date</Text>
              <Text style={styles.tableCell}>Employee</Text>
              <Text style={styles.tableCellCenter}>Hours</Text>
              <Text style={styles.tableCellCenter}>OT</Text>
              <Text style={styles.tableCellCenter}>Holiday</Text>
              <Text style={styles.tableCellCenter}>Sick</Text>
            </View>
            {data.map((record, index) => (
              <View 
                key={record.ID} 
                style={[
                  styles.tableRow, 
                  index % 2 === 0 ? { backgroundColor: '#f9fafb' } : {}
                ]}
              >
                <Text style={styles.tableCell}>
                  {record.Work_Date ? format(new Date(record.Work_Date), 'PP') : '-'}
                </Text>
                <Text style={styles.tableCell}>{record.Employee || '-'}</Text>
                <Text style={styles.tableCellCenter}>{record.Hours_Worked || 0}</Text>
                <Text style={styles.tableCellCenter}>{record.Overtime || 0}</Text>
                <Text style={styles.tableCellCenter}>{record.PHoliday || 0}</Text>
                <Text style={styles.tableCellCenter}>{record.Sick_Leave || 0}</Text>
              </View>
            ))}
          </View>
        </Page>
      </Document>
    </PDFViewer>
  );
} 