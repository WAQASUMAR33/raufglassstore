import { prisma as rootPrisma } from '@/lib/prisma';

let schemaReady = false;

/**
 * Ensure `assets` table exists in the database
 */
export async function ensureAssetsSchema(db) {
  if (schemaReady) return;
  const client = db ?? rootPrisma;
  try {
    await client.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS assets (
        asset_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        branch_id INT NOT NULL DEFAULT 1,
        asset_name VARCHAR(255) NOT NULL,
        category VARCHAR(64) NOT NULL DEFAULT 'Other',
        purchase_date DATE NOT NULL,
        purchase_cost DECIMAL(14,2) NOT NULL DEFAULT 0.00,
        current_value DECIMAL(14,2) NOT NULL DEFAULT 0.00,
        description TEXT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        created_by VARCHAR(128) NULL,
        updated_by VARCHAR(128) NULL,
        INDEX idx_assets_branch (branch_id),
        INDEX idx_assets_category (category),
        INDEX idx_assets_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    schemaReady = true;
  } catch (err) {
    console.error('Error ensuring assets schema:', err);
  }
}

/**
 * Fetch assets list with optional filtering
 */
export async function getAssetsList(db, { search = '', category = '', status = '' } = {}) {
  await ensureAssetsSchema(db);
  const client = db ?? rootPrisma;

  let query = 'SELECT * FROM assets WHERE 1=1';
  const params = [];

  if (status && status !== 'ALL') {
    query += ' AND status = ?';
    params.push(status);
  }
  if (category && category !== 'ALL') {
    query += ' AND category = ?';
    params.push(category);
  }
  if (search && search.trim()) {
    query += ' AND (asset_name LIKE ? OR description LIKE ?)';
    params.push(`%${search.trim()}%`, `%${search.trim()}%`);
  }

  query += ' ORDER BY asset_id DESC';

  const rows = await client.$queryRawUnsafe(query, ...params);
  return rows.map(r => ({
    ...r,
    purchase_cost: parseFloat(r.purchase_cost || 0),
    current_value: parseFloat(r.current_value || 0),
    purchase_date: r.purchase_date instanceof Date ? r.purchase_date.toISOString().split('T')[0] : String(r.purchase_date || ''),
  }));
}

/**
 * Get total value and count of active fixed assets
 */
export async function getTotalFixedAssets(db) {
  await ensureAssetsSchema(db);
  const client = db ?? rootPrisma;
  try {
    const rows = await client.$queryRawUnsafe(`
      SELECT 
        COALESCE(SUM(current_value), 0) AS total_value,
        COUNT(*) AS total_count
      FROM assets 
      WHERE status = 'ACTIVE'
    `);
    const total = parseFloat(rows[0]?.total_value || 0);
    const count = Number(rows[0]?.total_count || 0);
    return { total, count };
  } catch (err) {
    console.error('Error calculating fixed assets total:', err);
    return { total: 0, count: 0 };
  }
}

