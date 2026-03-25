// queryEngine.js — All structured queries against SQLite

function runQuery(db, queryName, params = {}) {
  switch (queryName) {

    case 'products_by_billing_count': {
      return db.prepare(`
        SELECT
          p.id,
          p.name AS product,
          p.category,
          COUNT(DISTINCT bd.id) AS billing_count,
          SUM(soi.amount)       AS total_revenue
        FROM products p
        JOIN sales_order_items soi ON soi.product_id = p.id
        JOIN billing_docs bd       ON bd.sales_order_id = soi.sales_order_id
        GROUP BY p.id
        ORDER BY billing_count DESC
      `).all();
    }

    case 'trace_billing_document': {
      const { billingDocId } = params;
      if (!billingDocId) return { error: 'billingDocId param required' };

      const billing = db.prepare(`SELECT * FROM billing_docs WHERE id = ?`).get(billingDocId);
      if (!billing) return { error: `Billing document ${billingDocId} not found` };

      const salesOrder = db.prepare(`SELECT * FROM sales_orders WHERE id = ?`).get(billing.sales_order_id);
      const customer   = db.prepare(`SELECT * FROM customers WHERE id = ?`).get(salesOrder?.customer_id);
      const delivery   = db.prepare(`SELECT * FROM deliveries WHERE sales_order_id = ?`).get(salesOrder?.id);
      const items      = db.prepare(`
        SELECT soi.*, p.name AS product_name, p.category
        FROM sales_order_items soi
        JOIN products p ON p.id = soi.product_id
        WHERE soi.sales_order_id = ?
      `).all(salesOrder?.id);
      const payments       = db.prepare(`SELECT * FROM payments WHERE billing_doc_id = ?`).all(billingDocId);
      const journalEntries = db.prepare(`SELECT * FROM journal_entries WHERE billing_doc_id = ?`).all(billingDocId);

      return { billing, salesOrder, customer, delivery, items, payments, journalEntries };
    }

    case 'broken_flows': {
      // Delivered but not billed
      const deliveredNotBilled = db.prepare(`
        SELECT so.*, c.name AS customer_name, 'Delivered but not billed' AS issue
        FROM sales_orders so
        JOIN customers c ON c.id = so.customer_id
        WHERE EXISTS (SELECT 1 FROM deliveries d WHERE d.sales_order_id = so.id)
          AND NOT EXISTS (SELECT 1 FROM billing_docs bd WHERE bd.sales_order_id = so.id)
      `).all();

      // Billed without delivery
      const billedNoDelivery = db.prepare(`
        SELECT so.*, c.name AS customer_name, 'Billed without delivery' AS issue
        FROM sales_orders so
        JOIN customers c ON c.id = so.customer_id
        WHERE EXISTS (SELECT 1 FROM billing_docs bd WHERE bd.sales_order_id = so.id)
          AND NOT EXISTS (SELECT 1 FROM deliveries d WHERE d.sales_order_id = so.id)
      `).all();

      // Billed but not paid (no cleared payment)
      const billedNotPaid = db.prepare(`
        SELECT bd.id AS billing_id, bd.amount, bd.billing_date, so.id AS so_id,
               c.name AS customer_name, 'Billed but no cleared payment' AS issue
        FROM billing_docs bd
        JOIN sales_orders so ON so.id = bd.sales_order_id
        JOIN customers c ON c.id = so.customer_id
        WHERE NOT EXISTS (
          SELECT 1 FROM payments p WHERE p.billing_doc_id = bd.id AND p.status = 'Cleared'
        )
      `).all();

      return {
        deliveredNotBilled,
        billedNoDelivery,
        billedNotPaid,
        totalIssues: deliveredNotBilled.length + billedNoDelivery.length + billedNotPaid.length
      };
    }

    case 'unpaid_invoices': {
      return db.prepare(`
        SELECT bd.id, bd.amount, bd.billing_date, bd.status,
               so.id AS sales_order_id,
               c.name AS customer_name,
               c.segment,
               p.status AS payment_status,
               p.payment_date,
               p.method
        FROM billing_docs bd
        JOIN sales_orders so ON so.id = bd.sales_order_id
        JOIN customers c ON c.id = so.customer_id
        LEFT JOIN payments p ON p.billing_doc_id = bd.id
        WHERE p.id IS NULL OR p.status != 'Cleared'
        ORDER BY bd.amount DESC
      `).all();
    }

    case 'customer_summary': {
      return db.prepare(`
        SELECT
          c.id, c.name, c.city, c.segment,
          COUNT(DISTINCT so.id)            AS order_count,
          COALESCE(SUM(bd.amount), 0)      AS total_billed,
          COALESCE(SUM(CASE WHEN p.status='Cleared' THEN p.amount ELSE 0 END), 0) AS total_paid,
          COALESCE(SUM(bd.amount),0) - COALESCE(SUM(CASE WHEN p.status='Cleared' THEN p.amount ELSE 0 END),0) AS outstanding
        FROM customers c
        LEFT JOIN sales_orders so ON so.customer_id = c.id
        LEFT JOIN billing_docs bd ON bd.sales_order_id = so.id
        LEFT JOIN payments p ON p.billing_doc_id = bd.id
        GROUP BY c.id
        ORDER BY total_billed DESC
      `).all();
    }

    case 'revenue_by_product': {
      return db.prepare(`
        SELECT
          p.id, p.name, p.category, p.uom,
          COALESCE(SUM(soi.amount), 0) AS total_revenue,
          COALESCE(SUM(soi.qty), 0)    AS total_qty,
          COUNT(DISTINCT soi.sales_order_id) AS order_count
        FROM products p
        LEFT JOIN sales_order_items soi ON soi.product_id = p.id
        GROUP BY p.id
        ORDER BY total_revenue DESC
      `).all();
    }

    case 'revenue_by_month': {
      return db.prepare(`
        SELECT
          strftime('%Y-%m', bd.billing_date) AS month,
          SUM(bd.amount)   AS total_billed,
          COUNT(bd.id)     AS invoice_count
        FROM billing_docs bd
        GROUP BY month
        ORDER BY month
      `).all();
    }

    case 'journal_by_billing': {
      const { billingDocId } = params;
      if (!billingDocId) return { error: 'billingDocId param required' };
      return db.prepare(`
        SELECT je.*, bd.amount AS billing_amount, so.id AS sales_order_id
        FROM journal_entries je
        JOIN billing_docs bd ON bd.id = je.billing_doc_id
        JOIN sales_orders so ON so.id = bd.sales_order_id
        WHERE je.billing_doc_id = ?
      `).all(billingDocId);
    }

    case 'sales_rep_performance': {
      return db.prepare(`
        SELECT
          so.sales_rep,
          COUNT(DISTINCT so.id)            AS order_count,
          COALESCE(SUM(bd.amount), 0)      AS total_revenue,
          COALESCE(SUM(CASE WHEN p.status='Cleared' THEN p.amount ELSE 0 END),0) AS collected
        FROM sales_orders so
        LEFT JOIN billing_docs bd ON bd.sales_order_id = so.id
        LEFT JOIN payments p ON p.billing_doc_id = bd.id
        GROUP BY so.sales_rep
        ORDER BY total_revenue DESC
      `).all();
    }

    case 'open_orders': {
      return db.prepare(`
        SELECT so.*, c.name AS customer_name, c.segment
        FROM sales_orders so
        JOIN customers c ON c.id = so.customer_id
        WHERE so.status = 'Open'
        ORDER BY so.order_date
      `).all();
    }

    case 'graph_nodes': {
      const customers      = db.prepare('SELECT id, name, city, segment FROM customers').all()
        .map(r => ({ id: r.id, type: 'customer', label: r.name, meta: r }));
      const products       = db.prepare('SELECT id, name, category, price FROM products').all()
        .map(r => ({ id: r.id, type: 'product', label: r.name, meta: r }));
      const salesOrders    = db.prepare('SELECT id, customer_id, order_date, status, sales_rep FROM sales_orders').all()
        .map(r => ({ id: r.id, type: 'salesOrder', label: r.id, meta: r }));
      const soItems        = db.prepare('SELECT id, sales_order_id, product_id, qty, amount FROM sales_order_items').all()
        .map(r => ({ id: r.id, type: 'soItem', label: r.id, meta: r }));
      const deliveries     = db.prepare('SELECT id, sales_order_id, delivery_date, status, plant FROM deliveries').all()
        .map(r => ({ id: r.id, type: 'delivery', label: r.id, meta: r }));
      const billingDocs    = db.prepare('SELECT id, sales_order_id, billing_date, amount, status FROM billing_docs').all()
        .map(r => ({ id: r.id, type: 'billing', label: r.id, meta: r }));
      const payments       = db.prepare('SELECT id, billing_doc_id, payment_date, amount, method, status FROM payments').all()
        .map(r => ({ id: r.id, type: 'payment', label: r.id, meta: r }));
      const journalEntries = db.prepare('SELECT id, billing_doc_id, accounting_doc, gl_account, amount, currency, posting_date FROM journal_entries').all()
        .map(r => ({ id: r.id, type: 'journal', label: r.accounting_doc, meta: r }));

      const edges = [];
      db.prepare('SELECT id, customer_id, id as so_id FROM sales_orders').all()
        .forEach(r => edges.push({ source: r.customer_id, target: r.so_id, label: 'placed' }));
      db.prepare('SELECT id, sales_order_id FROM sales_order_items').all()
        .forEach(r => edges.push({ source: r.sales_order_id, target: r.id, label: 'has item' }));
      db.prepare('SELECT id, product_id FROM sales_order_items').all()
        .forEach(r => edges.push({ source: r.id, target: r.product_id, label: 'references' }));
      db.prepare('SELECT id, sales_order_id FROM deliveries').all()
        .forEach(r => edges.push({ source: r.sales_order_id, target: r.id, label: 'fulfilled by' }));
      db.prepare('SELECT id, sales_order_id FROM billing_docs').all()
        .forEach(r => edges.push({ source: r.sales_order_id, target: r.id, label: 'billed via' }));
      db.prepare('SELECT id, billing_doc_id FROM payments').all()
        .forEach(r => edges.push({ source: r.billing_doc_id, target: r.id, label: 'paid by' }));
      db.prepare('SELECT id, billing_doc_id FROM journal_entries').all()
        .forEach(r => edges.push({ source: r.billing_doc_id, target: r.id, label: 'posted as' }));

      const nodes = [...customers, ...products, ...salesOrders, ...soItems, ...deliveries, ...billingDocs, ...payments, ...journalEntries];
      return { nodes, edges };
    }

    default:
      return { error: `Unknown query: ${queryName}` };
  }
}

// All available queries for LLM context
const QUERY_CATALOG = `
Available query functions:
1. products_by_billing_count — products ranked by number of billing documents they appear in
2. trace_billing_document(billingDocId) — full O2C flow: Customer→SO→Items→Delivery→Billing→Payment→Journal
3. broken_flows — sales orders with incomplete flows (delivered not billed, billed no delivery, billed not paid)
4. unpaid_invoices — billing documents without a cleared payment
5. customer_summary — per-customer: order count, total billed, total paid, outstanding balance
6. revenue_by_product — total revenue and order count per product
7. revenue_by_month — monthly billing totals
8. journal_by_billing(billingDocId) — journal entries for a specific billing document
9. sales_rep_performance — revenue and collection by sales representative
10. open_orders — sales orders still in Open status
`;

module.exports = { runQuery, QUERY_CATALOG };
