import { BaseDAO, TransactionContext } from './base-dao';
import { isUniqueViolation } from './sql-errors';
import { ValidationError } from '@/lib/api-utils';
import type { DriverInput } from '@/lib/validations/capture';
import type { TransportDriver, TransportDriverWithUsage } from '@/types/database';

const DRIVER_NAME_UNIQUE = 'UQ_TTransport_Drivers_Name';

/** Transport rows store the driver as text; trimmed, case-insensitive matches (the column's collation) count as the same driver. */
const TRANSPORT_USES_DRIVER = 'LTRIM(RTRIM(t.Driver)) = d.Driver_Name';

function driverInUseMessage(name: string, uses: number): string {
  return `${name} is the driver on ${uses} transport record${uses === 1 ? '' : 's'} and cannot be deleted. Deactivate the driver instead.`;
}

export interface DriverUpdateResult {
  transportRowsUpdated: number;
}

export class TransportDriverDAO extends BaseDAO<TransportDriver> {
  constructor() {
    super('dbo.TTransport_Drivers');
  }

  /** Active first, then most recently used, so the first active driver is a sensible default. */
  async listWithUsage(): Promise<TransportDriverWithUsage[]> {
    return this.executeQuery<TransportDriverWithUsage>(
      `SELECT d.ID, d.Driver_Name, d.Is_Active,
              COALESCE(u.UsageCount, 0) AS UsageCount, u.LastUsed
       FROM ${this.tableName} d
       OUTER APPLY (
         SELECT COUNT(*) AS UsageCount, MAX(t.Date) AS LastUsed
         FROM dbo.TTransport t
         WHERE ${TRANSPORT_USES_DRIVER}
       ) u
       ORDER BY d.Is_Active DESC, u.LastUsed DESC, d.Driver_Name`
    );
  }

  async listActive(): Promise<TransportDriver[]> {
    const drivers = await this.listWithUsage();
    return drivers
      .filter((driver) => driver.Is_Active)
      .map(({ ID, Driver_Name, Is_Active }) => ({ ID, Driver_Name, Is_Active }));
  }

  async add(input: DriverInput): Promise<{ ID: number }> {
    await this.assertNameAvailable(input.Driver_Name);
    try {
      const rows = await this.executeQuery<{ ID: number }>(
        `INSERT INTO ${this.tableName} (Driver_Name, Is_Active)
         OUTPUT INSERTED.ID
         VALUES (@name, @isActive)`,
        { name: input.Driver_Name, isActive: input.Is_Active ?? true }
      );
      return rows[0];
    } catch (error) {
      throw this.toFriendlyError(error, input.Driver_Name);
    }
  }

  /**
   * Renames and/or (de)activates a driver. A rename also rewrites `TTransport.Driver` on every
   * row that used the old name, in the same transaction, so history stays grouped.
   */
  async update(id: number, input: DriverInput): Promise<DriverUpdateResult> {
    try {
      return await this.withTransaction(async (tx) => {
        const current = await this.lockDriver(tx, id);
        await this.assertNameAvailable(input.Driver_Name, id, tx);

        await tx.query(
          `UPDATE ${this.tableName} SET Driver_Name = @name, Is_Active = @isActive WHERE ID = @id`,
          { id, name: input.Driver_Name, isActive: input.Is_Active ?? current.Is_Active }
        );

        if (current.Driver_Name === input.Driver_Name) return { transportRowsUpdated: 0 };

        const renamed = await tx.query<{ n: number }>(
          `UPDATE dbo.TTransport SET Driver = @name WHERE LTRIM(RTRIM(Driver)) = @oldName;
           SELECT @@ROWCOUNT AS n;`,
          { name: input.Driver_Name, oldName: current.Driver_Name }
        );
        return { transportRowsUpdated: renamed[0]?.n ?? 0 };
      });
    } catch (error) {
      throw this.toFriendlyError(error, input.Driver_Name);
    }
  }

  /** Deletes a driver only when no transport record uses the name; otherwise it must be deactivated. */
  async remove(id: number): Promise<void> {
    await this.withTransaction(async (tx) => {
      const current = await this.lockDriver(tx, id);
      const usage = await tx.query<{ n: number }>(
        `SELECT COUNT(*) AS n FROM dbo.TTransport WITH (HOLDLOCK) WHERE LTRIM(RTRIM(Driver)) = @name`,
        { name: current.Driver_Name }
      );
      const uses = usage[0]?.n ?? 0;
      if (uses > 0) throw new ValidationError(driverInUseMessage(current.Driver_Name, uses));
      await tx.query(`DELETE FROM ${this.tableName} WHERE ID = @id`, { id });
    });
  }

  /**
   * Returns the name to store on a transport record: the canonical active driver name, or the
   * record's existing name when editing a record whose driver is inactive or not in the list.
   */
  async resolveForTransport(name: string | null, currentName: string | null = null): Promise<string | null> {
    if (!name) return null;
    const rows = await this.executeQuery<{ Driver_Name: string }>(
      `SELECT Driver_Name FROM ${this.tableName} WHERE Driver_Name = @name AND Is_Active = 1`,
      { name }
    );
    if (rows[0]) return rows[0].Driver_Name;
    if (currentName && currentName.trim().toLowerCase() === name.trim().toLowerCase()) return currentName;
    throw new ValidationError(`"${name}" is not an active driver. Add or reactivate it under Manage Drivers.`);
  }

  private async lockDriver(tx: TransactionContext, id: number): Promise<TransportDriver> {
    const rows = await tx.query<TransportDriver>(
      `SELECT ID, Driver_Name, Is_Active FROM ${this.tableName} WITH (UPDLOCK, HOLDLOCK) WHERE ID = @id`,
      { id }
    );
    if (!rows[0]) throw new ValidationError('Driver not found');
    return rows[0];
  }

  private async assertNameAvailable(name: string, excludeId?: number, tx?: TransactionContext): Promise<void> {
    const query = `SELECT ID FROM ${this.tableName} WHERE Driver_Name = @name ${excludeId ? 'AND ID <> @excludeId' : ''}`;
    const params = { name, ...(excludeId ? { excludeId } : {}) };
    const rows = tx ? await tx.query<{ ID: number }>(query, params) : await this.executeQuery<{ ID: number }>(query, params);
    if (rows.length > 0) throw new ValidationError(`A driver called "${name}" already exists`);
  }

  private toFriendlyError(error: unknown, name: string): unknown {
    return isUniqueViolation(error, DRIVER_NAME_UNIQUE)
      ? new ValidationError(`A driver called "${name}" already exists`)
      : error;
  }
}
