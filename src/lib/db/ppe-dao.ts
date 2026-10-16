import { BaseDAO } from './base-dao';
import { PPEItem, PPEItemWithUsage } from '@/types/database';

export interface PPEItemInput {
  PPE_Item: string;
  PPE_Item_Value: number;
}

export class PPEItemDAO extends BaseDAO<PPEItem> {
  constructor() {
    super('dbo.TPPE_Items');
  }

  async listWithUsage(): Promise<PPEItemWithUsage[]> {
    return this.executeQuery<PPEItemWithUsage>(
      `SELECT i.ID, i.PPE_Item, i.PPE_Item_Value,
              COUNT(d.ID) AS IssueCount,
              MAX(d.Date) AS LastIssued
       FROM ${this.tableName} i
       LEFT JOIN dbo.TDeductions d ON d.FK_PPE_Item = i.ID AND d.PPE IS NOT NULL
       GROUP BY i.ID, i.PPE_Item, i.PPE_Item_Value
       ORDER BY i.PPE_Item`
    );
  }

  async nameExists(name: string, excludeId?: number): Promise<boolean> {
    const rows = await this.executeQuery<{ ID: number }>(
      `SELECT ID FROM ${this.tableName}
       WHERE LOWER(LTRIM(RTRIM(PPE_Item))) = LOWER(@name)
         ${excludeId ? 'AND ID <> @excludeId' : ''}`,
      { name: name.trim(), ...(excludeId ? { excludeId } : {}) }
    );
    return rows.length > 0;
  }

  async add(input: PPEItemInput): Promise<{ ID: number }> {
    const result = await this.executeQuery<{ ID: number }>(
      `INSERT INTO ${this.tableName} (PPE_Item, PPE_Item_Value)
       VALUES (@name, @value);
       SELECT CAST(SCOPE_IDENTITY() AS int) AS ID;`,
      { name: input.PPE_Item.trim(), value: input.PPE_Item_Value }
    );
    return result[0];
  }

  async update(id: number, input: PPEItemInput): Promise<void> {
    await this.executeQuery(
      `UPDATE ${this.tableName} SET PPE_Item = @name, PPE_Item_Value = @value WHERE ID = @id`,
      { name: input.PPE_Item.trim(), value: input.PPE_Item_Value, id }
    );
  }

  async updatePrice(id: number, value: number): Promise<void> {
    await this.executeQuery(
      `UPDATE ${this.tableName} SET PPE_Item_Value = @value WHERE ID = @id`,
      { value, id }
    );
  }

  async issueCount(id: number): Promise<number> {
    const rows = await this.executeQuery<{ n: number }>(
      `SELECT COUNT(*) AS n FROM dbo.TDeductions WHERE FK_PPE_Item = @id`,
      { id }
    );
    return rows[0]?.n ?? 0;
  }

  async remove(id: number): Promise<void> {
    await this.executeQuery(`DELETE FROM ${this.tableName} WHERE ID = @id`, { id });
  }
}
