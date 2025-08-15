const bcrypt = require('bcrypt');
const pool = require('../config/db');

const hashPasswords = async () => {
  try {
    console.log('Starting password hashing migration...');
    
    // Get all users with their current passwords
    const result = await pool.query('SELECT id, nom, password FROM users');
    const users = result.rows;
    
    console.log(`Found ${users.length} users to process`);
    
    // Hash each password and update the database
    for (const user of users) {
      // Skip if password is already hashed (bcrypt hashes start with $2a$, $2b$, or $2y$)
      if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$') || user.password.startsWith('$2y$')) {
        console.log(`Password for ${user.nom} is already hashed, skipping...`);
        continue;
      }
      
      // Hash the password with salt rounds of 12
      const hashedPassword = await bcrypt.hash(user.password, 12);
      
      // Update the user's password in the database
      await pool.query(
        'UPDATE users SET password = $1 WHERE id = $2',
        [hashedPassword, user.id]
      );
      
      console.log(`✓ Hashed password for user: ${user.nom}`);
    }
    
    console.log('Password hashing migration completed successfully!');
    
    // Verify the changes
    const verifyResult = await pool.query('SELECT nom, LEFT(password, 10) as password_start FROM users LIMIT 5');
    console.log('\nVerification - First 10 characters of hashed passwords:');
    verifyResult.rows.forEach(user => {
      console.log(`${user.nom}: ${user.password_start}...`);
    });
    
  } catch (error) {
    console.error('Error during password hashing migration:', error);
  } finally {
    await pool.end();
  }
};

hashPasswords();