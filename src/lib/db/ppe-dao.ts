import { BaseDAO } from './base-dao';
import { PPEItem } from '@/types/database';

export class PPEDAO extends BaseDAO<PPEItem> {
  constructor() {
    super('dbo.TPPE_Items');
  }

  async findByName(name: string): Promise<PPEItem[]> {
    return this.executeQuery<PPEItem>(
      `SELECT * FROM ${this.tableName} 
       WHERE PPE_Item LIKE @name
       ORDER BY PPE_Item`,
      { name: `%${name}%` }
    );
  }

  async addPPEItem(item: Omit<PPEItem, 'ID'>): Promise<PPEItem> {
    const result = await this.executeQuery<PPEItem>(
      `INSERT INTO ${this.tableName} (
        PPE_Item, PPE_Item_Value
      ) VALUES (
        @ppeItem, @ppeItemValue
      );
      SELECT SCOPE_IDENTITY() as ID;`,
      {
        ppeItem: item.PPE_Item,
        ppeItemValue: item.PPE_Item_Value
      }
    );

    return {
      ID: result[0].ID,
      ...item
    };
  }

  async updatePPEItem(id: number, item: Partial<PPEItem>): Promise<void> {
    const updates = Object.entries(item)
      .filter(([key]) => key !== 'ID')
      .map(([key]) => `${key} = @${key}`)
      .join(', ');

    await this.executeQuery(
      `UPDATE ${this.tableName} 
       SET ${updates}
       WHERE ID = @id`,
      {
        ...item,
        id
      }
    );
  }

  async deletePPEItem(id: number): Promise<void> {
    await this.executeQuery(
      `DELETE FROM ${this.tableName} WHERE ID = @id`,
      { id }
    );
  }

  async getPPEItemsByValue(minValue: number, maxValue: number): Promise<PPEItem[]> {
    return this.executeQuery<PPEItem>(
      `SELECT * FROM ${this.tableName} 
       WHERE PPE_Item_Value BETWEEN @minValue AND @maxValue
       ORDER BY PPE_Item_Value`,
      { minValue, maxValue }
    );
  }
} 