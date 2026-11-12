const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: { url: process.env.DATABASE_URL || 'mysql://root:@127.0.0.1:3306/raufglass' }
  }
});

async function main() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS cutters (
      cutter_id INT AUTO_INCREMENT PRIMARY KEY,
      branch_id INT DEFAULT 1,
      cutter_name VARCHAR(191) NOT NULL,
      cutter_phone VARCHAR(191) NULL,
      notes TEXT NULL,
      status VARCHAR(50) DEFAULT 'ACTIVE',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX cutters_branch_id_idx (branch_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  console.log('✅ cutters table ready');

  // Insert a couple sample cutters if empty
  const count = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as cnt FROM cutters`);
  const total = Number(count[0]?.cnt || 0);
  if (total === 0) {
    await prisma.$executeRawUnsafe(`
      INSERT INTO cutters (branch_id, cutter_name, cutter_phone, notes, status)
      VALUES 
        (1, 'Master Aslam', '0300-1234567', 'Senior Glass Cutter', 'ACTIVE'),
        (1, 'Rashid Glass Cutter', '0312-9876543', 'Table 1 specialist', 'ACTIVE'),
        (1, 'Tariq Mehmood', '0345-5556677', 'Machine Cutter', 'ACTIVE');
    `);
    console.log('✅ Sample cutters seeded');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());

