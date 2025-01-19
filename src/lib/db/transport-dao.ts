import { BaseDAO } from './base-dao';
import { Transport } from '@/types/database';

export class TransportDAO extends BaseDAO<Transport> {
  constructor() {
    super('dbo.TTransport');
  }

  async getTransportByDateRange(startDate: Date, endDate: Date): Promise<Transport[]> {
    return this.executeQuery<Transport>(
      `SELECT t.*, g.GrowerName 
       FROM ${this.tableName} t
       LEFT JOIN dbo.TGrowers g ON t.Grower_ID_FK = g.ID
       WHERE t.Date BETWEEN @startDate AND @endDate
       ORDER BY t.Date DESC`,
      { startDate, endDate }
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
        @growerId, @date, @km,
        @ratePerKM, @driver, @comment
      );
      SELECT SCOPE_IDENTITY() as ID;`,
      {
        growerId: transport.Grower_ID_FK,
        date: transport.Date,
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
      .map(([key]) => `${key} = @${key}`)
      .join(', ');

    await this.executeQuery(
      `UPDATE ${this.tableName} 
       SET ${updates}
       WHERE ID = @id`,
      {
        ...transport,
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
    startDate: Date,
    endDate: Date
  ): Promise<{ totalKM: number; totalCost: number }> {
    const result = await this.executeQuery<{ totalKM: number; totalCost: number }>(
      `SELECT 
        SUM(KM) as totalKM,
        SUM(KM * RatePerKM) as totalCost
       FROM ${this.tableName}
       WHERE Grower_ID_FK = @growerId
       AND Date BETWEEN @startDate AND @endDate`,
      { growerId, startDate, endDate }
    );

    return result[0] || { totalKM: 0, totalCost: 0 };
  }
} 