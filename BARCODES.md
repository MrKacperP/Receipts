# Test Barcodes

Use these barcodes to test the POS scanner:

## Beverages
- **049000050103** - Coca-Cola Classic 12oz Can - $1.49
- **012000161551** - Pepsi Cola 12oz Can - $1.39
- **012000161568** - Spring Water 500ml - $0.99

## Snacks
- **028400642057** - Lay's Classic Potato Chips - $3.49
- **040000484097** - Snickers Chocolate Bar - $1.29

## Grocery
- **001234567890** - White Sandwich Bread - $2.99
- **001234567891** - Whole Milk 1 Gallon - $4.49
- **001234567892** - Large Eggs (Dozen) - $3.99

## Produce
- **001234567893** - Bananas (per lb) - $0.59
- **001234567894** - Red Apples (per lb) - $1.99

## How to Add More Products

### Via API:
```bash
curl -X POST http://localhost:5050/products \
  -H "Content-Type: application/json" \
  -d '{
    "sku": "YOUR-SKU",
    "barcode": "123456789012",
    "name": "Product Name",
    "price_cents": 999,
    "image_url": "https://example.com/image.jpg",
    "category": "Category Name"
  }'
```

### Via Database Tool:
Edit `backend/tools/seed-products.js` and run:
```bash
cd backend && node tools/seed-products.js
```
