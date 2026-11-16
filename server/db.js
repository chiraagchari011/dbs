// One shared connection helper keeps the database setup in one place.
const { MongoClient } = require('mongodb');

let client;
let database;

async function getDatabase() {
  if (!database) {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
    client = new MongoClient(uri);
    await client.connect();
    database = client.db(process.env.DB_NAME || 'classroom_allocation_db');
    console.log(`Connected to MongoDB database: ${database.databaseName}`);
  }
  return database;
}

async function closeDatabase() {
  if (client) await client.close();
}

module.exports = { getDatabase, closeDatabase };
