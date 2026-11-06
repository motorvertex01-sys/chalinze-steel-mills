import { createConnection, type RowDataPacket } from "mysql2/promise";
type Connection = Awaited<ReturnType<typeof createConnection>>;

type SqlValue = string | number | boolean | null | Uint8Array;
type BoundStatement = {
  all<T>(): Promise<{ results: T[] }>;
  first<T>(): Promise<T | null>;
  run(): Promise<unknown>;
};

function mysqlValues(values: SqlValue[]) {
  return values.map((value) => value instanceof Uint8Array ? Buffer.from(value) : value);
}

async function execute(connection: Connection, sql: string, values: SqlValue[] = []) {
  const prepared = await connection.prepare(sql);
  try {
    return await prepared.execute(mysqlValues(values));
  } finally {
    await prepared.close();
  }
}

class MysqlStatement implements BoundStatement {
  constructor(private connection: Connection, private sql: string, private values: SqlValue[] = []) {}

  bind(...values: SqlValue[]) {
    return new MysqlStatement(this.connection, this.sql, values);
  }

  async all<T>() {
    const [rows] = await execute(this.connection, this.sql, this.values);
    return { results: rows as RowDataPacket[] as T[] };
  }

  async first<T>() {
    const [rows] = await execute(this.connection, this.sql, this.values);
    return ((rows as RowDataPacket[])[0] as T | undefined) ?? null;
  }

  async run() {
    const [result] = await execute(this.connection, this.sql, this.values);
    return result;
  }
}

export class MysqlDatabase {
  constructor(private connection: Connection) {}

  prepare(sql: string) {
    return new MysqlStatement(this.connection, sql);
  }

  async batch(statements: BoundStatement[]) {
    await this.connection.beginTransaction();
    try {
      const results = [];
      for (const statement of statements) results.push(await statement.run());
      await this.connection.commit();
      return results;
    } catch (error) {
      try {
        await this.connection.rollback();
      } catch (rollbackError) {
        throw new AggregateError([error, rollbackError], "The MySQL transaction failed and rollback also failed.");
      }
      throw error;
    }
  }
}

export async function connectHyperdrive(binding: Hyperdrive) {
  if (!binding.host || !binding.user || typeof binding.password !== "string" ||
      !binding.database || !Number.isInteger(binding.port) || binding.port < 1 || binding.port > 65535) {
    throw new Error("The Hyperdrive MySQL binding is missing connection properties.");
  }
  return createConnection({
    host: binding.host,
    user: binding.user,
    password: binding.password,
    database: binding.database,
    port: binding.port,
    disableEval: true,
    multipleStatements: false,
    dateStrings: true,
  });
}

export async function checkMySqlHealth(connection: Connection) {
  const [rows] = await execute(connection, "SELECT 1 AS healthy");
  if (!Array.isArray(rows) || rows.length !== 1) return false;
  const first = rows[0];
  return typeof first === "object" && first !== null && "healthy" in first && first.healthy === 1;
}
