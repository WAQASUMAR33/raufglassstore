require('dotenv').config();
const mysql = require('mysql2/promise');

async function run() {
  console.log('Connecting via mysql2 with single connection...');
  const url = new URL(process.env.DATABASE_URL);
  const connection = await mysql.createConnection({
    host: url.hostname,
    port: parseInt(url.port) || 3306,
    user: url.username,
    password: decodeURIComponent(url.password),
    database: url.pathname.slice(1),
    multipleStatements: true,
    connectTimeout: 20000,
  });

  try {
    console.log('Fetching customers...');
    const [customers] = await connection.query(
      'SELECT cus_id, cus_name, cus_balance, cus_category FROM customers WHERE cus_category IN (4, 5)'
    );

    console.log(`Fetched ${customers.length} customers.`);

    console.log('Fetching customer ledger entries...');
    const [ledgerEntries] = await connection.query(
      'SELECT l_id, cus_id, opening_balance, closing_balance, debit_amount, credit_amount, trnx_type, ledger_type, details, created_at FROM ledger WHERE cus_id IN (?) ORDER BY created_at ASC, l_id ASC',
      [customers.map(c => c.cus_id)]
    );

    console.log(`Fetched ${ledgerEntries.length} ledger entries.`);

    // Group ledger entries by cus_id
    const ledgerByCus = {};
    for (const l of ledgerEntries) {
      if (!ledgerByCus[l.cus_id]) ledgerByCus[l.cus_id] = [];
      ledgerByCus[l.cus_id].push(l);
    }

    const itemChargeKeywords = [
      'chanal', 'spacer', 'silicon', 'hardware', 'd lock', 'mirror clump', 'realing', 'sabqa'
    ];

    const updates = [];
    let noLedgerNegated = 0;
    let withLedgerProcessed = 0;
    let receivingConverted = 0;

    for (const c of customers) {
      const entries = ledgerByCus[c.cus_id] || [];
      const oldBal = parseFloat(c.cus_balance || 0);

      if (entries.length === 0) {
        if (oldBal > 0) {
          updates.push(
            mysql.format('UPDATE customers SET cus_balance = ? WHERE cus_id = ?;', [-oldBal, c.cus_id])
          );
          noLedgerNegated++;
        }
      } else {
        withLedgerProcessed++;
        const firstEntry = entries[0];
        const firstOpen = parseFloat(firstEntry.opening_balance || 0);
        const initialOpening = firstOpen > 0 ? -firstOpen : firstOpen;
        let running = initialOpening;

        for (const l of entries) {
          let debit = parseFloat(l.debit_amount || 0);
          let credit = parseFloat(l.credit_amount || 0);
          let trnx = l.trnx_type;

          const detailsLower = (l.details || '').toLowerCase();
          const isItemCharge = itemChargeKeywords.some(kw => detailsLower.includes(kw));

          const isPaymentReceivingDebit =
            trnx === 'DEBIT' &&
            !isItemCharge &&
            (
              (l.ledger_type || '').toLowerCase().includes('receiving') ||
              detailsLower.includes('receiving') ||
              detailsLower.includes('payment received') ||
              detailsLower.includes('cash pkr') ||
              detailsLower.includes('bank') ||
              detailsLower.includes('meezan')
            );

          if (isPaymentReceivingDebit) {
            credit = debit;
            debit = 0;
            trnx = 'CREDIT';
            receivingConverted++;
          }

          const open = running;
          const close = Number((open - debit + credit).toFixed(2));
          running = close;

          updates.push(
            mysql.format(
              'UPDATE ledger SET opening_balance = ?, closing_balance = ?, debit_amount = ?, credit_amount = ?, trnx_type = ? WHERE l_id = ?;',
              [open, close, debit, credit, trnx, l.l_id]
            )
          );
        }

        updates.push(
          mysql.format('UPDATE customers SET cus_balance = ? WHERE cus_id = ?;', [running, c.cus_id])
        );
      }
    }

    console.log(`Generated ${updates.length} SQL statements.`);
    console.log(`Customers with no ledger negated: ${noLedgerNegated}`);
    console.log(`Customers with ledger processed: ${withLedgerProcessed}`);
    console.log(`Receiving entries converted to CREDIT: ${receivingConverted}`);

    console.log('Executing transaction...');
    await connection.query('START TRANSACTION;');
    // Execute in chunks of 50 to avoid any packet size issues
    for (let i = 0; i < updates.length; i += 50) {
      const chunk = updates.slice(i, i + 50).join('\n');
      await connection.query(chunk);
    }
    await connection.query('COMMIT;');

    console.log('Transaction committed successfully!');

    // Verify stats
    const [[stats]] = await connection.query(`
      SELECT 
        COUNT(CASE WHEN cus_balance < 0 THEN 1 END) as receivables_count,
        SUM(CASE WHEN cus_balance < 0 THEN cus_balance ELSE 0 END) as total_receivables,
        COUNT(CASE WHEN cus_balance > 0 THEN 1 END) as payables_count,
        SUM(CASE WHEN cus_balance > 0 THEN cus_balance ELSE 0 END) as total_payables,
        COUNT(CASE WHEN cus_balance = 0 THEN 1 END) as settled_count
      FROM customers
      WHERE cus_category IN (4, 5)
    `);

    console.log('\n=== MIGRATION VERIFICATION ===');
    console.log(`Receivables (Negative < 0): ${stats.receivables_count} customers | Rs. ${Math.abs(parseFloat(stats.total_receivables)).toLocaleString()}`);
    console.log(`Payables (Positive > 0): ${stats.payables_count} customers | Rs. ${parseFloat(stats.total_payables).toLocaleString()}`);
    console.log(`Settled (Zero = 0): ${stats.settled_count} customers`);

  } catch (err) {
    await connection.query('ROLLBACK;').catch(() => {});
    throw err;
  } finally {
    await connection.end();
  }
}

run().catch(console.error);

