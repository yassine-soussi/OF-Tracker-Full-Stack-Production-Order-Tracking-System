
require('dotenv').config();

const { Pool } = require('pg');



// Connexion à PostgreSQL

const pool = new Pool({
  user: process.env.PG_USER || 'postgres',
  host: process.env.PG_HOST || 'localhost',
  database: process.env.PG_DATABASE || 'postgres',
  password: process.env.PG_PASSWORD || 'yassine1234',
  port: process.env.PG_PORT || 5432,
});

// Vérification de la connexion
pool.connect()
  .then(() => console.log(' Connexion à la base de données PostgreSQL réussie'))
  .catch((err) => {
    console.error(' Impossible de se connecter à la base de données PostgreSQL:', err);
    process.exit(1); // Terminer l'application si la connexion échoue
  });

module.exports = pool;
