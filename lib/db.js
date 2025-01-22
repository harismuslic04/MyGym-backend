import mysql from "mysql2/promise";

let connection;

export const connectToDataBase = async () => {
  if (!connection) {
    try {
      console.log("Connecting to database...");
      connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME, // <-- Koristi ispravan naziv baze
      });
      console.log("Database connected successfully!");
    } catch (error) {
      console.error("Error connecting to database:", error);
      throw error; // Preporučuje se da baciš grešku ako konekcija ne uspe
    }
  }
  return connection;
};
