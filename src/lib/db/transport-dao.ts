import { BaseDAO } from './base-dao';
import { Transport } from '@/types/database';
import { addDaysToDateOnly, toSouthAfricaDateOnly, toSqlDateTimeStartOfDay } from '@/lib/date-time/south-africa';

export class TransportDAO extends BaseDAO<Transport> {
  constructor() {
    super('dbo.TTransport');
  }

  private formatSQLDate(date: Date | string | null | undefined): string | null {
    return toSqlDateTimeStartOfDay(date);
  }

  private formatExclusiveEndDate(date: Date | string): string {
    const dateOnly = toSouthAfricaDateOnly(date);
    if (!dateOnly) throw new Error('End date is required');
    return `${addDaysToDateOnly(dateOnly, 1)} 00:00:00.000`;
  }

  async getTransportByDateRange(startDate: Date | string, endDate: Date | string): Promise<Transport[]> {
    return this.executeQuery<Transport>(
      `SELECT t.*, g.GrowerName 
       FROM ${this.tableName} t
       LEFT JOIN dbo.TGrowers g ON t.Grower_ID_FK = g.ID
       WHERE t.Date >= CONVERT(datetime2, @startDate, 121)
         AND t.Date < CONVERT(datetime2, @endDate, 121)
       ORDER BY t.Date DESC`,
      {
        startDate: this.formatSQLDate(startDate),
        endDate: this.formatExclusiveEndDate(endDate),
      }
    );
  }

  async getTransportByGrower(growerId: number): Promise<Transport[]> {
    return this.executeQuery<Transport>(
      `SELECT t.*, g.GrowerName 
       FROM ${this.tableName} t
       LEFT JOIN dbo.TGrowers g ON t.Grower_ID_FK = g.ID
       WHERE t.Grower_ID_FK = @growerId
       ORDER BY t.Date DESC`,
      { growerId }
    );
  }

  async getTransportByDriver(driver: string): Promise<Transport[]> {
    return this.executeQuery<Transport>(
      `SELECT t.*, g.GrowerName 
       FROM ${this.tableName} t
       LEFT JOIN dbo.TGrowers g ON t.Grower_ID_FK = g.ID
       WHERE t.Driver LIKE @driver
       ORDER BY t.Date DESC`,
      { driver: `%${driver}%` }
    );
  }

  async addTransport(transport: Omit<Transport, 'ID'>): Promise<Transport> {
    const result = await this.executeQuery<Transport>(
      `INSERT INTO ${this.tableName} (
        Grower_ID_FK, Date, KM,
        RatePerKM, Driver, Comment
      ) VALUES (
        @growerId, CONVERT(datetime2, @date, 121), @km,
        @ratePerKM, @driver, @comment
      );
      SELECT SCOPE_IDENTITY() as ID;`,
      {
        growerId: transport.Grower_ID_FK,
        date: this.formatSQLDate(transport.Date),
        km: transport.KM,
        ratePerKM: transport.RatePerKM,
        driver: transport.Driver,
        comment: transport.Comment
      }
    );

    return {
      ID: result[0].ID,
      ...transport
    };
  }

  async updateTransport(id: number, transport: Partial<Transport>): Promise<void> {
    const updates = Object.entries(transport)
      .filter(([key]) => key !== 'ID')
      .map(([key]) => (
        key === 'Date'
          ? `${key} = CONVERT(datetime2, @${key}, 121)`
          : `${key} = @${key}`
      ))
      .join(', ');

    const normalizedTransport = {
      ...transport,
      Date: transport.Date ? this.formatSQLDate(transport.Date) : transport.Date,
    };

    await this.executeQuery(
      `UPDATE ${this.tableName} 
       SET ${updates}
       WHERE ID = @id`,
      {
        ...normalizedTransport,
        id
      }
    );
  }

  async deleteTransport(id: number): Promise<void> {
    await this.executeQuery(
      `DELETE FROM ${this.tableName} WHERE ID = @id`,
      { id }
    );
  }

  async getTransportSummaryByGrower(
    growerId: number,
    startDate: Date | string,
    endDate: Date | string
  ): Promise<{ totalKM: number; totalCost: number }> {
    const result = await this.executeQuery<{ totalKM: number; totalCost: number }>(
      `SELECT 
        SUM(KM) as totalKM,
        SUM(KM * RatePerKM) as totalCost
       FROM ${this.tableName}
       WHERE Grower_ID_FK = @growerId
       AND Date >= CONVERT(datetime2, @startDate, 121)
       AND Date < CONVERT(datetime2, @endDate, 121)`,
      {
        growerId,
        startDate: this.formatSQLDate(startDate),
        endDate: this.formatExclusiveEndDate(endDate),
      }
    );

    return result[0] || { totalKM: 0, totalCost: 0 };
  }
} 