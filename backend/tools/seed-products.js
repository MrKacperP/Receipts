import Database from 'better-sqlite3';
import path from 'path';
import url from 'url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, '..', 'dev.sqlite');
const db = new Database(dbPath);

const sampleProducts = [
  {
    sku: 'COKE-12OZ',
    barcode: '049000050103',
    name: 'Coca-Cola Classic 12oz Can',
    price_cents: 149,
    image_url: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&h=400&fit=crop',
    category: 'Beverages'
  },
  {
    sku: 'PEPSI-12OZ',
    barcode: '012000161551',
    name: 'Pepsi Cola 12oz Can',
    price_cents: 139,
    image_url: 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=400&h=400&fit=crop',
    category: 'Beverages'
  },
  {
    sku: 'LAYS-ORIG',
    barcode: '028400642057',
    name: "Lay's Classic Potato Chips",
    price_cents: 349,
    image_url: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400&h=400&fit=crop',
    category: 'Snacks'
  },
  {
    sku: 'SNICKERS-BAR',
    barcode: '040000484097',
    name: 'Snickers Chocolate Bar',
    price_cents: 129,
    image_url: 'https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?w=400&h=400&fit=crop',
    category: 'Candy'
  },
  {
    sku: 'WATER-500ML',
    barcode: '012000161568',
    name: 'Spring Water 500ml',
    price_cents: 99,
    image_url: 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400&h=400&fit=crop',
    category: 'Beverages'
  },
  {
    sku: 'BREAD-WHITE',
    barcode: '001234567890',
    name: 'White Sandwich Bread',
    price_cents: 299,
    image_url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=400&fit=crop',
    category: 'Bakery'
  },
  {
    sku: 'MILK-GALLON',
    barcode: '001234567891',
    name: 'Whole Milk 1 Gallon',
    price_cents: 449,
    image_url: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&h=400&fit=crop',
    category: 'Dairy'
  },
  {
    sku: 'EGGS-DOZEN',
    barcode: '001234567892',
    name: 'Large Eggs (Dozen)',
    price_cents: 399,
    image_url: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=400&h=400&fit=crop',
    category: 'Dairy'
  },
  {
    sku: 'BANANA-LB',
    barcode: '001234567893',
    name: 'Bananas (per lb)',
    price_cents: 59,
    image_url: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400&h=400&fit=crop',
    category: 'Produce'
  },
  {
    sku: 'APPLE-LB',
    barcode: '001234567894',
    name: 'Red Apples (per lb)',
    price_cents: 199,
    image_url: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400&h=400&fit=crop',
    category: 'Produce'
  }
];

console.log('Seeding products...');

const stmt = db.prepare(`
  INSERT OR REPLACE INTO products (sku, barcode, name, price_cents, image_url, category)
  VALUES (?, ?, ?, ?, ?, ?)
`);

let count = 0;
for (const product of sampleProducts) {
  try {
    stmt.run(
      product.sku,
      product.barcode,
      product.name,
      product.price_cents,
      product.image_url,
      product.category
    );
    count++;
    console.log(`✓ Added: ${product.name} (${product.barcode})`);
  } catch (error) {
    console.error(`✗ Failed to add ${product.name}:`, error.message);
  }
}

console.log(`\n✅ Seeded ${count}/${sampleProducts.length} products`);

db.close();
