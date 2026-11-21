require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const isDryRun = process.argv.includes('--dry-run');

async function migrate() {
  console.log(`Starting customer balance migration (DryRun: ${isDryRun})...`);

  const customerCats = [4, 5]; // Customer, Walkin Customer
  const customers = await prisma.customer.findMany({
    where: { cus_category: { in: customerCats } },
    include: {
      ledger: {
        orderBy: [{ created_at: 'asc' }, { l_id: 'asc' }]
      }
    }
  });

  console.log(`Total customers found in categories [4, 5]: ${customers.length}`);

  let noLedgerUpdated = 0;
  let withLedgerUpdated = 0;
  let ledgerRowsUpdated = 0;
  let receivingConvertedToCredit = 0;

  const itemChargeKeywords = [
    'chanal', 'spacer', 'silicon', 'hardware', 'd lock', 'mirror clump', 'realing', 'sabqa'
  ];

  for (const c of customers) {
    if (c.ledger.length === 0) {
      const oldBal = parseFloat(c.cus_balance || 0);
      if (oldBal > 0) {
        const newBal = -oldBal;
        noLedgerUpdated++;
        if (!isDryRun) {
          await prisma.customer.update({
            where: { cus_id: c.cus_id },
            data: { cus_balance: newBal }
          });
        }
      }
    } else {
      withLedgerUpdated++;
      const firstEntry = c.ledger[0];
      const firstOpen = parseFloat(firstEntry.opening_balance || 0);
      const initialOpening = firstOpen > 0 ? -firstOpen : firstOpen;

      let running = initialOpening;

      for (const l of c.ledger) {
        let debit = parseFloat(l.debit_amount || 0);
        let credit = parseFloat(l.credit_amount || 0);
        let trnx = l.trnx_type;

        // Check if this is a payment receiving entry mistakenly recorded as DEBIT
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
          receivingConvertedToCredit++;
        }

        const open = running;
        const close = Number((open - debit + credit).toFixed(2));
        running = close;

        const needsUpdate =
          Math.abs(parseFloat(l.opening_balance) - open) > 0.009 ||
          Math.abs(parseFloat(l.closing_balance) - close) > 0.009 ||
          l.trnx_type !== trnx ||
          Math.abs(parseFloat(l.debit_amount) - debit) > 0.009 ||
          Math.abs(parseFloat(l.credit_amount) - credit) > 0.009;

        if (needsUpdate) {
          ledgerRowsUpdated++;
          if (!isDryRun) {
            await prisma.ledger.update({
              where: { l_id: l.l_id },
              data: {
                opening_balance: open,
                closing_balance: close,
                debit_amount: debit,
                credit_amount: credit,
                trnx_type: trnx
              }
            });
          }
        }
      }

      if (!isDryRun) {
        await prisma.customer.update({
          where: { cus_id: c.cus_id },
          data: { cus_balance: running }
        });
      }
    }
  }

  console.log('\nMigration completed successfully!');
  console.log({
    dryRun: isDryRun,
    customersWithNoLedgerNegated: noLedgerUpdated,
    customersWithLedgerProcessed: withLedgerUpdated,
    ledgerRowsUpdated,
    receivingConvertedToCredit
  });
}

migrate()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
