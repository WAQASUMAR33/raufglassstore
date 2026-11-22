require('dotenv').config();
const mysql = require('mysql2/promise');

async function main() {
  const url = new URL(process.env.DATABASE_URL);
  const pool = mysql.createPool({
    host: url.hostname,
    port: parseInt(url.port) || 3306,
    user: url.username,
    password: decodeURIComponent(url.password),
    database: url.pathname.slice(1),
    waitForConnections: true,
    connectionLimit: 3,
    connectTimeout: 30000,
    enableKeepAlive: true,
  });

  // 1. Fix Sale 25
  await pool.query("UPDATE sales SET previous_balance = -148720 WHERE sale_id = 25");
  console.log("Updated sale_id 25 previous_balance to -148720");

  // 2. Fix remaining positive previous_balance for customer sales (quotations, orders, etc.)
  const [positiveSales] = await pool.query(`
    SELECT s.sale_id, s.bill_number, s.bill_type, s.cus_id, s.previous_balance, c.cus_category
    FROM sales s
    JOIN customers c ON s.cus_id = c.cus_id
    WHERE s.previous_balance > 0 AND c.cus_category IN (4, 5) AND s.cus_id != 28
  `);

  console.log(`Found ${positiveSales.length} non-bill sales with positive previous_balance for customer category 4/5:`);
  console.table(positiveSales);

  for (const s of positiveSales) {
    const newPrev = -parseFloat(s.previous_balance);
    await pool.query("UPDATE sales SET previous_balance = ? WHERE sale_id = ?", [newPrev, s.sale_id]);
    console.log(`Updated sale_id ${s.sale_id} (${s.bill_type}) previous_balance from ${s.previous_balance} to ${newPrev}`);
  }

  // 3. Re-run audit
  const [sales] = await pool.query(`
    SELECT s.*, c.cus_name, c.cus_balance as current_cus_balance
    FROM sales s
    LEFT JOIN customers c ON s.cus_id = c.cus_id
    ORDER BY s.sale_id ASC
  `);

  const [ledger] = await pool.query("SELECT l_id, cus_id, bill_no, opening_balance, closing_balance, debit_amount, credit_amount FROM ledger ORDER BY created_at ASC, l_id ASC");

  let discrepancies = 0;
  for (const s of sales) {
    const billValue = parseFloat(s.total_amount || 0);
    const totalPaid = parseFloat(s.payment || 0);
    const balance = billValue - totalPaid;
    const prevBal = parseFloat(s.previous_balance || 0);
    const totalBalance = prevBal - balance;

    let custEntries = ledger.filter(l => l.cus_id === s.cus_id && String(l.bill_no) === String(s.sale_id));
    if (custEntries.length === 0) {
      custEntries = ledger.filter(l => l.cus_id === s.cus_id && String(l.bill_no) === String(s.bill_number));
    }

    if (custEntries.length > 0) {
      const firstEntry = custEntries[0];
      const lastEntry = custEntries[custEntries.length - 1];
      const ledgerOpen = parseFloat(firstEntry.opening_balance || 0);
      const ledgerClose = parseFloat(lastEntry.closing_balance || 0);

      const prevMismatch = Math.abs(prevBal - ledgerOpen) > 0.01;
      const totalMismatch = Math.abs(totalBalance - ledgerClose) > 0.01;

      if (prevMismatch || totalMismatch) {
        discrepancies++;
        console.error(`Discrepancy on Sale #${s.sale_id}: prevBal=${prevBal} (ledger=${ledgerOpen}), totalBal=${totalBalance} (ledger=${ledgerClose})`);
      }
    }
  }

  console.log(`Audit complete: ${discrepancies} discrepancies out of ${sales.length} sales.`);

  await pool.end();
}

main().catch(console.error);

