const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'o2c.db');

function initDB() {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // ── Schema ──────────────────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      city TEXT,
      country TEXT,
      segment TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT,
      price REAL,
      uom TEXT
    );

    CREATE TABLE IF NOT EXISTS sales_orders (
      id TEXT PRIMARY KEY,
      customer_id TEXT REFERENCES customers(id),
      order_date TEXT,
      status TEXT,
      sales_rep TEXT
    );

    CREATE TABLE IF NOT EXISTS sales_order_items (
      id TEXT PRIMARY KEY,
      sales_order_id TEXT REFERENCES sales_orders(id),
      product_id TEXT REFERENCES products(id),
      qty INTEGER,
      amount REAL
    );

    CREATE TABLE IF NOT EXISTS deliveries (
      id TEXT PRIMARY KEY,
      sales_order_id TEXT REFERENCES sales_orders(id),
      delivery_date TEXT,
      status TEXT,
      plant TEXT
    );

    CREATE TABLE IF NOT EXISTS billing_docs (
      id TEXT PRIMARY KEY,
      sales_order_id TEXT REFERENCES sales_orders(id),
      billing_date TEXT,
      amount REAL,
      status TEXT,
      company_code TEXT
    );

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      billing_doc_id TEXT REFERENCES billing_docs(id),
      payment_date TEXT,
      amount REAL,
      method TEXT,
      status TEXT
    );

    CREATE TABLE IF NOT EXISTS journal_entries (
      id TEXT PRIMARY KEY,
      billing_doc_id TEXT REFERENCES billing_docs(id),
      accounting_doc TEXT,
      gl_account TEXT,
      amount REAL,
      currency TEXT,
      posting_date TEXT,
      doc_type TEXT
    );
  `);

  // ── Seed ───────────────────────────────────────────────────
  const alreadySeeded = db.prepare('SELECT COUNT(*) as c FROM customers').get().c > 0;
  if (alreadySeeded) return db;

  const insertCustomer = db.prepare('INSERT INTO customers (id, name, city, country, segment) VALUES (?, ?, ?, ?, ?)');
  const insertProduct = db.prepare('INSERT INTO products (id, name, category, price, uom) VALUES (?, ?, ?, ?, ?)');
  const insertSO = db.prepare('INSERT INTO sales_orders (id, customer_id, order_date, status, sales_rep) VALUES (?, ?, ?, ?, ?)');
  const insertSOI = db.prepare('INSERT INTO sales_order_items (id, sales_order_id, product_id, qty, amount) VALUES (?, ?, ?, ?, ?)');
  const insertDel = db.prepare('INSERT INTO deliveries (id, sales_order_id, delivery_date, status, plant) VALUES (?, ?, ?, ?, ?)');
  const insertBD = db.prepare('INSERT INTO billing_docs (id, sales_order_id, billing_date, amount, status, company_code) VALUES (?, ?, ?, ?, ?, ?)');
  const insertPay = db.prepare('INSERT INTO payments (id, billing_doc_id, payment_date, amount, method, status) VALUES (?, ?, ?, ?, ?, ?)');
  const insertJE = db.prepare('INSERT INTO journal_entries (id, billing_doc_id, accounting_doc, gl_account, amount, currency, posting_date, doc_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');

  const runSeed = db.transaction(() => {
    [
      ['C001','Tata Motors Ltd','Mumbai','IN','Enterprise'],
      ['C002','Infosys Technologies','Bangalore','IN','Enterprise'],
      ['C003','Reliance Retail','Mumbai','IN','Mid-Market'],
      ['C004','Mahindra & Mahindra','Pune','IN','Enterprise'],
      ['C005','Wipro Limited','Hyderabad','IN','Mid-Market'],
      ['C006','HCL Technologies','Noida','IN','Enterprise'],
      ['C007','Bajaj Auto','Pune','IN','Mid-Market'],
      ['C008','L&T Finance','Mumbai','IN','SMB'],
    ].forEach(r => insertCustomer.run(...r));

    [
      ['P001','ERP Core Module','Software',250000,'License'],
      ['P002','CRM Suite','Software',120000,'License'],
      ['P003','SAP HANA DB','Database',500000,'License'],
      ['P004','Cloud Hosting 1TB','Infrastructure',85000,'Month'],
      ['P005','Support & Maintenance','Service',45000,'Month'],
      ['P006','Implementation Services','Service',180000,'Days'],
      ['P007','Training Package','Service',35000,'Session'],
      ['P008','Analytics Dashboard','Software',95000,'License'],
    ].forEach(r => insertProduct.run(...r));

    [
      ['SO001','C001','2025-01-10','Complete','Ankit Sharma'],
      ['SO002','C002','2025-01-15','Complete','Priya Patel'],
      ['SO003','C003','2025-02-01','Complete','Ankit Sharma'],
      ['SO004','C004','2025-02-10','Delivered_NoBill','Ravi Kumar'],
      ['SO005','C005','2025-02-20','Complete','Priya Patel'],
      ['SO006','C006','2025-03-01','Complete','Ankit Sharma'],
      ['SO007','C007','2025-03-05','Billed_NoDelivery','Ravi Kumar'],
      ['SO008','C008','2025-03-10','Open','Priya Patel'],
      ['SO009','C001','2025-03-15','Complete','Ankit Sharma'],
      ['SO010','C002','2025-03-20','Open','Ravi Kumar'],
    ].forEach(r => insertSO.run(...r));

    [
      ['SOI001','SO001','P001',2,500000],
      ['SOI002','SO001','P005',12,540000],
      ['SOI003','SO002','P002',5,600000],
      ['SOI004','SO002','P007',3,105000],
      ['SOI005','SO003','P003',1,500000],
      ['SOI006','SO004','P001',3,750000],
      ['SOI007','SO004','P006',5,900000],
      ['SOI008','SO005','P004',6,510000],
      ['SOI009','SO005','P008',2,190000],
      ['SOI010','SO006','P002',3,360000],
      ['SOI011','SO006','P005',12,540000],
      ['SOI012','SO007','P006',10,1800000],
      ['SOI013','SO009','P003',1,500000],
      ['SOI014','SO009','P004',12,1020000],
    ].forEach(r => insertSOI.run(...r));

    [
      ['DEL001','SO001','2025-01-18','Delivered','Mumbai-WH1'],
      ['DEL002','SO002','2025-01-25','Delivered','Bangalore-WH1'],
      ['DEL003','SO003','2025-02-10','Delivered','Mumbai-WH2'],
      ['DEL004','SO004','2025-02-20','Delivered','Pune-WH1'],
      ['DEL005','SO005','2025-03-01','Delivered','Hyderabad-WH1'],
      ['DEL006','SO006','2025-03-10','Delivered','Noida-WH1'],
      ['DEL007','SO009','2025-03-22','Delivered','Mumbai-WH1'],
    ].forEach(r => insertDel.run(...r));

    [
      ['BD001','SO001','2025-01-20',1040000,'Posted','IN01'],
      ['BD002','SO002','2025-01-28',705000,'Posted','IN01'],
      ['BD002B','SO002','2025-02-28',150000,'Posted','IN01'],
      ['BD003','SO003','2025-02-12',500000,'Posted','IN01'],
      ['BD005','SO005','2025-03-05',700000,'Posted','IN01'],
      ['BD006','SO006','2025-03-14',900000,'Posted','IN01'],
      ['BD007','SO007','2025-03-08',1800000,'Posted','IN01'],
      ['BD009','SO009','2025-03-25',1520000,'Posted','IN01'],
    ].forEach(r => insertBD.run(...r));

    [
      ['PAY001','BD001','2025-02-10',1040000,'NEFT','Cleared'],
      ['PAY002','BD002','2025-02-20',705000,'RTGS','Cleared'],
      ['PAY002B','BD002B','2025-03-20',150000,'NEFT','Cleared'],
      ['PAY003','BD003','2025-03-01',500000,'NEFT','Cleared'],
      ['PAY005','BD005','2025-03-20',700000,'Cheque','Cleared'],
      ['PAY006','BD006','2025-03-28',900000,'RTGS','Pending'],
      ['PAY009','BD009','2025-04-02',1520000,'NEFT','Pending'],
    ].forEach(r => insertPay.run(...r));

    [
      ['JE001','BD001','9400635001','12000010',1040000,'INR','2025-01-20','RV'],
      ['JE002','BD002','9400635002','12000010',705000,'INR','2025-01-28','RV'],
      ['JE002B','BD002B','9400635958','15500020',-1167,'INR','2025-04-02','RV'],
      ['JE003','BD003','9400635003','12000010',500000,'INR','2025-02-12','RV'],
      ['JE005','BD005','9400635005','12000010',700000,'INR','2025-03-05','RV'],
      ['JE006','BD006','9400635006','12000010',900000,'INR','2025-03-14','RV'],
      ['JE007','BD007','9400635007','12000010',1800000,'INR','2025-03-08','RV'],
      ['JE009','BD009','9400635009','12000010',1520000,'INR','2025-03-25','RV'],
    ].forEach(r => insertJE.run(...r));
  });

  runSeed();
  console.log('✅ Database seeded successfully');
  return db;
}

module.exports = { initDB };