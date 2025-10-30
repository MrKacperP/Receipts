import express from 'express';
import db from '../db.js';

const router = express.Router();

// Search product by SKU or barcode
router.get('/:code', (req, res) => {
  try {
    const { code } = req.params;
    
    // Try to find by barcode first, then by SKU
    let product = db.prepare('SELECT * FROM products WHERE barcode = ? LIMIT 1').get(code);
    
    if (!product) {
      product = db.prepare('SELECT * FROM products WHERE sku = ? LIMIT 1').get(code);
    }
    
    if (!product) {
      return res.status(404).json({ 
        not_found: true, 
        message: 'Product not found',
        code 
      });
    }
    
    // Format response
    res.json({
      id: product.id,
      sku: product.sku,
      barcode: product.barcode,
      name: product.name,
      msrp_cents: product.price_cents,
      image_url: product.image_url,
      category: product.category,
      description: product.description,
      in_stock: product.in_stock === 1
    });
  } catch (error) {
    console.error('Product lookup error:', error);
    res.status(500).json({ error: 'Failed to lookup product' });
  }
});

// Get all products (for admin/testing)
router.get('/', (req, res) => {
  try {
    const products = db.prepare('SELECT * FROM products ORDER BY created_at DESC LIMIT 100').all();
    res.json(products.map(p => ({
      id: p.id,
      sku: p.sku,
      barcode: p.barcode,
      name: p.name,
      msrp_cents: p.price_cents,
      image_url: p.image_url,
      category: p.category,
      in_stock: p.in_stock === 1
    })));
  } catch (error) {
    console.error('Products list error:', error);
    res.status(500).json({ error: 'Failed to list products' });
  }
});

// Add new product
router.post('/', (req, res) => {
  try {
    const { sku, barcode, name, price_cents, image_url, category, description } = req.body;
    
    if (!sku || !name || price_cents === undefined) {
      return res.status(400).json({ error: 'sku, name, and price_cents are required' });
    }
    
    const stmt = db.prepare(`
      INSERT INTO products (sku, barcode, name, price_cents, image_url, category, description)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(sku, barcode || null, name, price_cents, image_url || null, category || null, description || null);
    
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid);
    
    res.status(201).json({
      id: product.id,
      sku: product.sku,
      barcode: product.barcode,
      name: product.name,
      msrp_cents: product.price_cents,
      image_url: product.image_url,
      category: product.category
    });
  } catch (error) {
    console.error('Product creation error:', error);
    if (error.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Product with this SKU already exists' });
    }
    res.status(500).json({ error: 'Failed to create product' });
  }
});

export default router;
