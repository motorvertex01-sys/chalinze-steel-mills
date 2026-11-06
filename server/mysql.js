import mysql from "mysql2/promise";

function assertHyperdriveBinding(binding) {
  if (!binding || typeof binding.host !== "string" || typeof binding.user !== "string" ||
      typeof binding.password !== "string" || typeof binding.database !== "string" ||
      !Number.isInteger(binding.port)) {
    throw new Error("The Hyperdrive MySQL binding is missing connection properties.");
  }
}

export async function connectHyperdrive(binding) {
  assertHyperdriveBinding(binding);
  return mysql.createConnection({
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

export async function connectMySqlUrl(connectionString) {
  if (typeof connectionString !== "string" || !connectionString.trim()) {
    throw new Error("MYSQL_URL must be configured in the private environment.");
  }
  const url = new URL(connectionString);
  if (url.protocol !== "mysql:" && url.protocol !== "mariadb:") {
    throw new Error("MYSQL_URL must use the mysql:// or mariadb:// scheme.");
  }
  const localHost = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  const sslDisabled = process.env.MYSQL_SSL?.toLowerCase() === "false";
  if (sslDisabled && !localHost) {
    throw new Error("TLS may only be disabled for a local MySQL server.");
  }
  return mysql.createConnection({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.replace(/^\//, "")),
    ssl: sslDisabled ? undefined : { rejectUnauthorized: true },
    multipleStatements: false,
    dateStrings: true,
    supportBigNumbers: true,
    bigNumberStrings: true,
  });
}

export async function checkMySqlHealth(connection) {
  const [rows] = await connection.execute("SELECT 1 AS healthy");
  return rows.length === 1 && rows[0].healthy === 1;
}

export async function withTransaction(connection, callback) {
  await connection.beginTransaction();
  try {
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    try {
      await connection.rollback();
    } catch (rollbackError) {
      throw new AggregateError([error, rollbackError], "The MySQL transaction failed and rollback also failed.");
    }
    throw error;
  }
}
