import Database from 'better-sqlite3';
import path from 'path';
import url from 'url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, '..', 'dev.sqlite');
const db = new Database(dbPath);

console.log('Initializing products table...');

try {
  // Drop old table if exists
  db.exec('DROP TABLE IF EXISTS products');
  console.log('✓ Dropped old products table');

  // Create new products table
  db.exec(`
    CREATE TABLE products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sku TEXT UNIQUE NOT NULL,
      barcode TEXT,
      name TEXT NOT NULL,
      price_cents INTEGER NOT NULL,
      image_url TEXT,
      category TEXT,
      description TEXT,
      in_stock INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX idx_products_sku ON products(sku);
    CREATE INDEX idx_products_barcode ON products(barcode);
  `);
  console.log('✓ Created products table with indexes');
  console.log('✅ Products table initialized successfully!');
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}

db.close();
