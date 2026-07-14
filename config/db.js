const mysql = require('mysql2');

// Création du pool de connexion en utilisant les variables de ton fichier .env
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'milungu_shop',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Exporter la version basée sur les Promesses pour pouvoir utiliser async/await dans les routes
module.exports = pool.promise();