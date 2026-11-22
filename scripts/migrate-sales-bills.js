require('dotenv').config();
const mysql = require('mysql2/promise');

async function createConnWithRetry(maxRetries = 4) {
  const url = new URL(process.env.DATABASE_URL);
  for (let i = 1; i <= maxRetries; i++) {
    try {
      console.log(`Connecting to DB (attempt ${i}/${maxRetries})...`);
      const conn = await mysql.createConnection({
        host: url.hostname,
        port: parseInt(url.port) || 3306,
        user: url.username,
        password: decodeURIComponent(url.password),
        database: url.pathname.slice(1),
        connectTimeout: 30000,
      });
      console.log('Connected successfully!');
      return conn;
    } catch (err) {
      console.warn(`Connection attempt ${i} failed: ${err.message}`);
      if (i === maxRetries) throw err;
      await new Promise(r => setTimeout(r, 2000 * i));
    }
  }
}

async function main() {
  const isDryRun = process.argv.includes('--dry-run');
  console.log(`Starting sales bills migration (dry-run: ${isDryRun})...`);

  const conn = await createConnWithRetry(4);

  const [sales] = await conn.query("SELECT sale_id, bill_number, cus_id, total_amount, payment, cash_payment, bank_payment, advance_payment, previous_balance, bill_type FROM sales WHERE bill_type = 'BILL' ORDER BY sale_id ASC");
  const [ledger] = await conn.query("SELECT l_id, cus_id, bill_no, opening_balance, closing_balance, debit_amount, credit_amount, trnx_type, ledger_type, details, created_at FROM ledger ORDER BY created_at ASC, l_id ASC");

  console.log(`Loaded ${sales.length} BILL sales and ${ledger.length} ledger entries.`);

  const updates = [];

  for (const s of sales) {
    // Find customer ledger entries for this bill
    const custEntries = ledger.filter(l => l.cus_id === s.cus_id && (String(l.bill_no) === String(s.sale_id) || String(l.bill_no) === String(s.bill_number)));
    
    if (custEntries.length === 0) {
      console.warn(`⚠️ No customer ledger entry found for Sale #${s.sale_id} (bill_number: ${s.bill_number}, cus_id: ${s.cus_id})`);
      continue;
    }

    const firstCustEntry = custEntries[0];
    const ledgerOpeningBalance = parseFloat(firstCustEntry.opening_balance || 0);
    const currentPrevBalance = parseFloat(s.previous_balance || 0);

    if (Math.abs(currentPrevBalance - ledgerOpeningBalance) > 0.009) {
      updates.push({
        sale_id: s.sale_id,
        bill_number: s.bill_number,
        cus_id: s.cus_id,
        old_previous_balance: currentPrevBalance,
        new_previous_balance: ledgerOpeningBalance,
        ledger_l_id: firstCustEntry.l_id
      });
    }
  }

  console.log(`Found ${updates.length} sales bills requiring previous_balance correction.`);

  console.log('Sample updates (first 15):');
  console.dir(updates.slice(0, 15), { depth: null });

  // Check Sale 131 and 105 in updates
  const u131 = updates.find(u => u.sale_id === 131 || u.bill_number === 131);
  const u105 = updates.find(u => u.sale_id === 105 || u.bill_number === 105);
  console.log('Update for Sale 131:', u131);
  console.log('Update for Sale 105:', u105);

  if (!isDryRun) {
    console.log(`Applying updates to database for ${updates.length} sales...`);
    let applied = 0;
    for (const u of updates) {
      await conn.query("UPDATE sales SET previous_balance = ? WHERE sale_id = ?", [
        u.new_previous_balance,
        u.sale_id
      ]);
      applied++;
    }
    console.log(`Successfully updated ${applied} sales bills in database!`);
  } else {
    console.log('Dry run complete. No database changes were made.');
  }

  await conn.end();
}

main().catch(console.error);
