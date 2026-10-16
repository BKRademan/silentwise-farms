import { BaseDAO } from './base-dao';
import { TransportRecord } from '@/types/database';
import { addDaysToDateOnly, toSqlDateTimeStartOfDay } from '@/lib/date-time/south-africa';

export interface TransportFilters {
  startDate: string;
  endDate: string;
  growerId?: number;
}

export interface TransportInput {
  Grower_ID_FK: number;
  Date: string;
  Days: number;
  RatePerDay: number | null;
  Driver: string | null;
  Comment: string | null;
}

// TTransport predates the move to per-day billing: KM stores days, RatePerKM stores rate per day.
const SELECT_TRANSPORT = `
  SELECT t.ID, t.Grower_ID_FK, g.GrowerName, t.Date,
         t.KM AS Days, t.RatePerKM AS RatePerDay, t.Driver, t.Comment
  FROM dbo.TTransport t
  LEFT JOIN dbo.TGrowers g ON t.Grower_ID_FK = g.ID`;

export class TransportDAO extends BaseDAO<TransportRecord> {
  constructor() {
    super('dbo.TTransport');
  }

  async list({ startDate, endDate, growerId }: TransportFilters): Promise<TransportRecord[]> {
    return this.executeQuery<TransportRecord>(
      `${SELECT_TRANSPORT}
       WHERE t.Date >= CONVERT(datetime2, @startDate, 121)
         AND t.Date < CONVERT(datetime2, @endDate, 121)
         ${growerId ? 'AND t.Grower_ID_FK = @growerId' : ''}
       ORDER BY t.Date DESC, g.GrowerName`,
      {
        startDate: toSqlDateTimeStartOfDay(startDate),
        endDate: `${addDaysToDateOnly(endDate, 1)} 00:00:00.000`,
        ...(growerId ? { growerId } : {}),
      }
    );
  }

  async add(input: TransportInput): Promise<{ ID: number }> {
    const result = await this.executeQuery<{ ID: number }>(
      `INSERT INTO ${this.tableName} (Grower_ID_FK, Date, KM, RatePerKM, Driver, Comment)
       VALUES (@growerId, CONVERT(datetime2, @date, 121), @days, @ratePerDay, @driver, @comment);
       SELECT CAST(SCOPE_IDENTITY() AS int) AS ID;`,
      this.toParams(input)
    );
    return result[0];
  }

  async update(id: number, input: TransportInput): Promise<void> {
    await this.executeQuery(
      `UPDATE ${this.tableName}
       SET Grower_ID_FK = @growerId,
           Date = CONVERT(datetime2, @date, 121),
           KM = @days,
           RatePerKM = @ratePerDay,
           Driver = @driver,
           Comment = @comment
       WHERE ID = @id`,
      { ...this.toParams(input), id }
    );
  }

  async remove(id: number): Promise<void> {
    await this.executeQuery(`DELETE FROM ${this.tableName} WHERE ID = @id`, { id });
  }

  private toParams(input: TransportInput) {
    return {
      growerId: input.Grower_ID_FK,
      date: toSqlDateTimeStartOfDay(input.Date),
      days: input.Days,
      ratePerDay: input.RatePerDay,
      driver: input.Driver,
      comment: input.Comment,
    };
  }
}
