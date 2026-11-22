const mysql = require('mysql2/promise');
require('dotenv').config();

async function getConnection() {
  const dbUrl = new URL(process.env.DATABASE_URL);
  for (let i = 0; i < 5; i++) {
    try {
      const conn = await mysql.createConnection({
        host: dbUrl.hostname,
        port: parseInt(dbUrl.port || '3306', 10),
        user: decodeURIComponent(dbUrl.username),
        password: decodeURIComponent(dbUrl.password),
        database: dbUrl.pathname.replace(/^\//, ''),
        connectTimeout: 20000,
      });
      return conn;
    } catch (err) {
      console.warn(`Connection attempt ${i + 1} failed: ${err.message}. Retrying...`);
      if (i === 4) throw err;
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}

function classifyRow(acc, r) {
  const cat = acc.cus_category;
  const desc = (r.details || '').toLowerCase();
  const lType = (r.ledger_type || '').toLowerCase();
  const amt = parseFloat(r.debit_amount) || parseFloat(r.credit_amount) || 0;

  if (cat === 2 || cat === 3) {
    // CASH & BANK
    // Inflows -> CREDIT (+)
    if (
      desc.includes('payment received') ||
      desc.includes('receiving') ||
      desc.includes('refund from') ||
      desc.includes('cash refund from') ||
      desc.includes('bank refund from') ||
      lType === 'receiving'
    ) {
      return { dr: 0, cr: amt, trnx: 'CREDIT' };
    }
    // Outflows -> DEBIT (-)
    if (
      desc.includes('payment to') ||
      desc.includes('payment ') ||
      desc.includes('expense') ||
      desc.includes('refund to') ||
      desc.includes('cash payment made') ||
      desc.includes('bank payment made') ||
      lType === 'payment' ||
      lType === 'expense'
    ) {
      return { dr: amt, cr: 0, trnx: 'DEBIT' };
    }
    if (desc.includes('astimat') || desc.includes('hardwre 2380') || desc.includes('nill')) {
      return { dr: amt, cr: 0, trnx: 'DEBIT' };
    }
    if (parseFloat(r.debit_amount) > 0 && parseFloat(r.credit_amount) === 0) {
      return { dr: 0, cr: amt, trnx: 'CREDIT' };
    }
    return { dr: amt, cr: 0, trnx: 'DEBIT' };
  }

  if (cat === 9) {
    // SUPPLIER
    // Purchases -> CREDIT (+)
    if (desc.includes('purchase invoice') || desc.includes('purchase update') || lType === 'purchase') {
      if (desc.includes('cargo/out charges deducted') || desc.includes('payment')) {
        return { dr: amt, cr: 0, trnx: 'DEBIT' };
      }
      return { dr: 0, cr: amt, trnx: 'CREDIT' };
    }
    // Payments / deductions -> DEBIT (-)
    return { dr: amt, cr: 0, trnx: 'DEBIT' };
  }

  // SERVICE / VENDOR / PAYABLES (Labour 6, Cargo 7, Transport 8, Fitter 11, Hardware 12)
  if (desc.includes('payment') || lType === 'payment' || desc.includes('mahar allmnm') || (acc.cus_id === 11 && desc.includes('receiving'))) {
    // Payment to vendor -> DEBIT (-)
    return { dr: amt, cr: 0, trnx: 'DEBIT' };
  }
  // Service / Material charges -> CREDIT (+)
  return { dr: 0, cr: amt, trnx: 'CREDIT' };
}

async function runMigration() {
  console.log('Connecting to remote MySQL database...');
  const conn = await getConnection();

  const [categories] = await conn.query('SELECT cus_cat_id, cus_cat_title FROM customer_categories ORDER BY cus_cat_id');
  const catMap = {};
  for (const c of categories) catMap[c.cus_cat_id] = c.cus_cat_title;

  const [accounts] = await conn.query(`
    SELECT cus_id, cus_name, cus_balance, cus_category
    FROM customers
    WHERE cus_category NOT IN (4, 5)
    ORDER BY cus_category, cus_id
  `);

  console.log(`Starting migration for ${accounts.length} other accounts...\n`);

  for (const acc of accounts) {
    const [ledgers] = await conn.query(`
      SELECT l_id, bill_no, trnx_type, ledger_type, details, debit_amount, credit_amount, opening_balance, closing_balance, created_at
      FROM ledger
      WHERE cus_id = ?
      ORDER BY created_at ASC, l_id ASC
    `, [acc.cus_id]);

    if (ledgers.length === 0) {
      let newBal = parseFloat(acc.cus_balance || 0);
      if (acc.cus_id === 236 && newBal < 0) {
        newBal = Math.abs(newBal); // Flip JS bank negative opening balance
        await conn.query('UPDATE customers SET cus_balance = ?, updated_at = NOW() WHERE cus_id = ?', [newBal, acc.cus_id]);
        console.log(`✅ [${acc.cus_id}] ${acc.cus_name}: Updated opening balance from ${acc.cus_balance} -> ${newBal}`);
      } else {
        console.log(`ℹ️ [${acc.cus_id}] ${acc.cus_name}: 0 ledger rows, balance remains ${acc.cus_balance}`);
      }
      continue;
    }

    let runningBalance = 0;
    if (acc.cus_id === 15) {
      runningBalance = -300000;
    }

    const updates = [];

    for (let i = 0; i < ledgers.length; i++) {
      const r = ledgers[i];
      const { dr, cr, trnx } = classifyRow(acc, r);
      const open = runningBalance;
      const close = open - dr + cr;
      runningBalance = close;

      updates.push({
        l_id: r.l_id,
        debit_amount: dr,
        credit_amount: cr,
        trnx_type: trnx,
        opening_balance: Number(open.toFixed(2)),
        closing_balance: Number(close.toFixed(2))
      });
    }

    // Apply batch update for ledger entries of this account
    for (const u of updates) {
      await conn.query(`
        UPDATE ledger
        SET debit_amount = ?, credit_amount = ?, trnx_type = ?, opening_balance = ?, closing_balance = ?, updated_at = NOW()
        WHERE l_id = ?
      `, [u.debit_amount, u.credit_amount, u.trnx_type, u.opening_balance, u.closing_balance, u.l_id]);
    }

    // Update customer cus_balance
    const finalBalance = Number(runningBalance.toFixed(2));
    await conn.query('UPDATE customers SET cus_balance = ?, updated_at = NOW() WHERE cus_id = ?', [finalBalance, acc.cus_id]);

    console.log(`✅ [${acc.cus_id}] ${acc.cus_name} (${catMap[acc.cus_category]}): Updated ${updates.length} rows | Old bal: ${acc.cus_balance} -> New bal: ${finalBalance}`);
  }

  console.log('\nMigration completed successfully!');
  await conn.end();
}

runMigration().catch(console.error);

