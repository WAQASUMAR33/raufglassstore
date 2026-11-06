const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Initializing Zain Traders Database & Admin Accounts...\n');

  // 1. Ensure Main Branch exists
  let branch = await prisma.branch.findUnique({ where: { branch_code: 'MAIN' } });
  if (!branch) {
    branch = await prisma.branch.create({
      data: {
        branch_code: 'MAIN',
        branch_name: 'Main Branch',
        status: 'ACTIVE',
        isolation_mode: 'SHARED',
        table_prefix: 'main',
        tables_provisioned: true,
        provision_status: 'ACTIVE',
        provision_message: 'Main branch default',
      },
    });
    console.log(`✅ Created Main Branch (ID: ${branch.branch_id})`);
  } else {
    console.log(`ℹ️  Main Branch exists (ID: ${branch.branch_id})`);
  }

  // 2. Ensure default Store / Warehouse exists
  let store = await prisma.store.findFirst({ where: { branch_id: branch.branch_id } });
  if (!store) {
    store = await prisma.store.create({
      data: {
        branch_id: branch.branch_id,
        store_name: 'Main Store',
        store_address: 'Main Branch Warehouse',
      },
    });
    console.log(`✅ Created Default Store: ${store.store_name} (ID: ${store.storeid})`);
  } else {
    console.log(`ℹ️  Default Store exists: ${store.store_name} (ID: ${store.storeid})`);
  }

  // 3. User accounts to create
  const defaultPin = await bcrypt.hash('123456', 10);
  const adminPassword = await bcrypt.hash('Admin@123', 10);
  const simplePassword = await bcrypt.hash('admin123', 10);
  const managerPassword = await bcrypt.hash('Manager@123', 10);
  const cashierPassword = await bcrypt.hash('Cashier@123', 10);

  const accounts = [
    {
      full_name: 'Zain Admin',
      email: 'admin@zaintraders.com',
      password: adminPassword,
      pin_code: defaultPin,
      role: 'ADMIN',
      branch_id: branch.branch_id,
      plainPass: 'Admin@123',
      plainPin: '123456',
      desc: 'Store Administrator (Full POS, inventory & accounting control)',
    },
    {
      full_name: 'Super Admin',
      email: 'superadmin@zaintraders.com',
      password: adminPassword,
      pin_code: defaultPin,
      role: 'SUPER_ADMIN',
      branch_id: null,
      plainPass: 'Admin@123',
      plainPin: '123456',
      desc: 'Head Office Super Administrator (Multi-branch oversight & system control)',
    },
    {
      full_name: 'Quick Admin',
      email: 'admin@example.com',
      password: simplePassword,
      pin_code: defaultPin,
      role: 'ADMIN',
      branch_id: branch.branch_id,
      plainPass: 'admin123',
      plainPin: '123456',
      desc: 'Quick dev admin account with simple password',
    },
    {
      full_name: 'Store Manager',
      email: 'manager@zaintraders.com',
      password: managerPassword,
      pin_code: defaultPin,
      role: 'MANAGER',
      branch_id: branch.branch_id,
      plainPass: 'Manager@123',
      plainPin: '123456',
      desc: 'Branch Manager (Operational approvals & staff oversight)',
    },
    {
      full_name: 'Counter Cashier',
      email: 'cashier@zaintraders.com',
      password: cashierPassword,
      pin_code: defaultPin,
      role: 'SALESMAN',
      branch_id: branch.branch_id,
      plainPass: 'Cashier@123',
      plainPin: '123456',
      desc: 'Front Counter Cashier (POS billing & customer receipts)',
    },
  ];

  console.log('\n👤 Creating Accounts:');
  for (const acc of accounts) {
    const existing = await prisma.users.findUnique({ where: { email: acc.email } });
    if (existing) {
      await prisma.users.update({
        where: { email: acc.email },
        data: {
          full_name: acc.full_name,
          password: acc.password,
          pin_code: acc.pin_code,
          role: acc.role,
          branch_id: acc.branch_id,
          status: 'ACTIVE',
          is_verified: true,
        },
      });
      console.log(`  🔄 Updated: ${acc.email} (${acc.role})`);
    } else {
      await prisma.users.create({
        data: {
          full_name: acc.full_name,
          email: acc.email,
          password: acc.password,
          pin_code: acc.pin_code,
          role: acc.role,
          branch_id: acc.branch_id,
          status: 'ACTIVE',
          is_verified: true,
        },
      });
      console.log(`  ✅ Created: ${acc.email} (${acc.role})`);
    }
  }

  console.log('\n✨ All admin & staff accounts are ready!\n');
}

main()
  .catch((e) => {
    console.error('❌ Error creating accounts:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
