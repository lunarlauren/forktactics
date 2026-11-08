// Edit one package in the future-week price book without touching the
// price/quantity snapshot belonging to an existing weekly plan.
export function updatePriceBook(products, id, field, value) {
  if (!Array.isArray(products) || !['packageQuantity', 'priceCents'].includes(field))
    throw new Error('Choose a valid grocery package field.');
  const item = products.find(p => p.id === id);
  if (!item) throw new Error('Unknown grocery ingredient.');
  if (typeof value !== 'number' || !Number.isFinite(value))
    throw new Error('Enter a valid number.');
  if (field === 'packageQuantity') {
    if (value <= 0 || value > 1e9 || (item.unit === 'count' && !Number.isInteger(value)))
      throw new Error(item.unit === 'count' ? 'Package count must be a positive whole number.' : 'Package size must be a positive number.');
  } else if (!Number.isSafeInteger(value) || value < 1 || value > 1e9) {
    throw new Error('Price must be between $0.01 and $10,000,000.00.');
  }
  return products.map(p => p.id === id ? {...p, [field]:value} : p);
}
