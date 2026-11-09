require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function runMigration() {
  try {
    console.log('🔄 Checking database for formulas table and columns...\n');

    // 1. Create formulas table if not exists
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS \`formulas\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`branch_id\` INT NOT NULL DEFAULT 1,
        \`name\` VARCHAR(191) NOT NULL,
        \`description\` VARCHAR(255) NULL,
        \`tolerance\` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
        \`width_steps\` TEXT NOT NULL,
        \`height_steps\` TEXT NULL,
        \`min_width\` DECIMAL(10, 2) NOT NULL DEFAULT 6.00,
        \`min_height\` DECIMAL(10, 2) NOT NULL DEFAULT 6.00,
        \`divisor\` DECIMAL(10, 2) NOT NULL DEFAULT 144.00,
        \`rounding_rule\` VARCHAR(50) NOT NULL DEFAULT 'SLAB_TIERS',
        \`is_default\` BOOLEAN NOT NULL DEFAULT FALSE,
        \`is_active\` BOOLEAN NOT NULL DEFAULT TRUE,
        \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updated_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        INDEX \`formulas_branch_id_idx\`(\`branch_id\`),
        PRIMARY KEY (\`id\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
    console.log('✅ formulas table ready');

    // 2. Check if formula_id exists on products
    const [checkFormulaId] = await prisma.$queryRaw`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'products' 
      AND COLUMN_NAME = 'formula_id'
    `;

    if (checkFormulaId && checkFormulaId.COLUMN_NAME) {
      console.log('✅ Column formula_id already exists in products table.');
    } else {
      console.log('➕ Adding formula_id column to products table...');
      await prisma.$executeRawUnsafe(`
        ALTER TABLE products 
        ADD COLUMN formula_id INT NULL AFTER pro_packing,
        ADD INDEX products_formula_id_idx (formula_id)
      `);
      console.log('✅ Column formula_id added to products table successfully!');
    }

    // 3. Seed pre-configured formulas if table is empty
    const countResult = await prisma.$queryRaw`SELECT COUNT(*) as cnt FROM formulas`;
    const count = Number(countResult[0]?.cnt || 0);

    if (count === 0) {
      console.log('🌱 Seeding initial formulas based on Ghani Glass rates...');

      // Formula 1: 0.1" Tolerance (White / Mirror / 3mm / 5mm / Brown)
      await prisma.$executeRawUnsafe(`
        INSERT INTO formulas (
          branch_id, name, description, tolerance, width_steps, height_steps, min_width, min_height, divisor, rounding_rule, is_default, is_active
        ) VALUES (
          1,
          'Ghani Glass 0.1" Tolerance (3mm, 5mm, Mirror, Brown)',
          'Tolerance 0.1": <= 6.1 -> 6, <= 9.1 -> 9, <= 12.1 -> 12, <= 15.1 -> 15... Area / 144',
          0.10,
          '6, 9, 12, 15, 18, 21, 24, 30, 36, 42, 48, 54, 60, 72, 84, 96, 108, 120, 144',
          '6, 9, 12, 15, 18, 21, 24, 30, 36, 42, 48, 54, 60, 72, 84, 96, 108, 120, 144',
          6.00,
          6.00,
          144.00,
          'SLAB_TIERS',
          TRUE,
          TRUE
        )
      `);

      // Formula 2: Strict Step (8mm, 10mm, 12mm Heavy Glass, Polish)
      await prisma.$executeRawUnsafe(`
        INSERT INTO formulas (
          branch_id, name, description, tolerance, width_steps, height_steps, min_width, min_height, divisor, rounding_rule, is_default, is_active
        ) VALUES (
          1,
          'Heavy Glass Strict Steps (8mm, 10mm, 12mm, Polish)',
          'Strict step without tolerance: <= 6 -> 6, > 6 -> 9... steps by 3" to 24", then by 6" to 144"',
          0.00,
          '6, 9, 12, 15, 18, 21, 24, 30, 36, 42, 48, 54, 60, 66, 72, 84, 96, 102, 108, 114, 120, 126, 132, 144',
          '6, 9, 12, 15, 18, 21, 24, 30, 36, 42, 48, 54, 60, 66, 72, 84, 96, 102, 108, 114, 120, 126, 132, 144',
          6.00,
          6.00,
          144.00,
          'SLAB_TIERS',
          FALSE,
          TRUE
        )
      `);

      console.log('✅ Seeded Formula 1 and Formula 2 successfully!');
    } else {
      console.log(`ℹ️ Formulas table already has ${count} records.`);
    }

    console.log('✨ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runMigration();
