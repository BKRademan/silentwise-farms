import { BaseDAO } from './base-dao';
import { Grower } from '@/types/database';

export class GrowerDAO extends BaseDAO<Grower> {
  constructor() {
    super('dbo.TGrowers');
  }

  async findByName(name: string): Promise<Grower[]> {
    return this.executeQuery<Grower>(
      `SELECT * FROM ${this.tableName} 
       WHERE GrowerName LIKE @name
       ORDER BY GrowerName`,
      { name: `%${name}%` }
    );
  }

  async findActive(): Promise<Grower[]> {
    return this.executeQuery<Grower>(
      `SELECT * FROM ${this.tableName} 
       ORDER BY GrowerName`
    );
  }

  async addGrower(grower: Omit<Grower, 'ID'>): Promise<Grower> {
    const result = await this.executeQuery<Grower>(
      `INSERT INTO ${this.tableName} (
        GrowerName, RatePerKM, HasManFee, ManFee,
        PaysSickLeave, ContPerc, AnnualLeavePerc,
        SickLeavePerc, WMCPerc, SDLPerc,
        PPEPerc, UIFPerc, HrsPerDay
      ) VALUES (
        @growerName, @ratePerKM, @hasManFee, @manFee,
        @paysSickLeave, @contPerc, @annualLeavePerc,
        @sickLeavePerc, @wmcPerc, @sdlPerc,
        @ppePerc, @uifPerc, @hrsPerDay
      );
      SELECT SCOPE_IDENTITY() as ID;`,
      {
        growerName: grower.GrowerName,
        ratePerKM: grower.RatePerKM,
        hasManFee: grower.HasManFee,
        manFee: grower.ManFee,
        paysSickLeave: grower.PaysSickLeave,
        contPerc: grower.ContPerc,
        annualLeavePerc: grower.AnnualLeavePerc,
        sickLeavePerc: grower.SickLeavePerc,
        wmcPerc: grower.WMCPerc,
        sdlPerc: grower.SDLPerc,
        ppePerc: grower.PPEPerc,
        uifPerc: grower.UIFPerc,
        hrsPerDay: grower.HrsPerDay
      }
    );

    return {
      ID: result[0].ID,
      ...grower
    };
  }

  async updateGrower(id: number, grower: Partial<Grower>): Promise<void> {
    const updates = Object.entries(grower)
      .filter(([key]) => key !== 'ID')
      .map(([key]) => `${key} = @${key}`)
      .join(', ');

    await this.executeQuery(
      `UPDATE ${this.tableName} 
       SET ${updates}
       WHERE ID = @id`,
      {
        ...grower,
        id
      }
    );
  }

  async getGrowersByDate(date: Date): Promise<Grower[]> {
    return this.executeQuery<Grower>(
      `SELECT DISTINCT g.* 
       FROM ${this.tableName} g
       INNER JOIN dbo.THour_Data_View h ON g.ID = h.Grower_ID
       WHERE CAST(h.Work_Date AS DATE) = CAST(@date AS DATE)
       ORDER BY g.GrowerName`,
      { date }
    );
  }
} 