# O2C Graph Explorer
### Order-to-Cash Graph-Based Data Modeling & Query System

A full-stack application that models SAP-like Order-to-Cash business data as an interactive graph,
with an LLM-powered conversational query interface.

---

## Quick Start

### Prerequisites
- Node.js 18+
- An Anthropic API key ([get one free](https://console.anthropic.com))

### 1. Clone / extract the project
```bash
# The project has two folders: backend/ and frontend/
```

### 2. Set up the backend
```bash
cd backend
npm install

# Create your .env file
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY

npm start
# → API running at http://localhost:3001
# → SQLite database auto-created and seeded on first run
```

### 3. Set up the frontend (new terminal)
```bash
cd frontend
npm install
npm start
# → App opens at http://localhost:3000
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     React Frontend                       │
│  ┌──────────────────┐   ┌────────────────────────────┐  │
│  │  D3 Force Graph  │   │     Chat Interface         │  │
│  │  (GraphCanvas)   │   │  (NodePanel, ChatPanel)    │  │
│  └────────┬─────────┘   └───────────┬────────────────┘  │
└───────────┼─────────────────────────┼───────────────────┘
            │           REST API      │
┌───────────▼─────────────────────────▼───────────────────┐
│               Express.js Backend (port 3001)             │
│  ┌────────────────┐   ┌─────────────────────────────┐   │
│  │  Query Engine  │   │    LLM Chat Handler         │   │
│  │  (queryEngine) │   │  Two-pass: intent → data    │   │
│  └───────┬────────┘   └────────────┬────────────────┘   │
│          │                         │                     │
│  ┌───────▼─────────┐   ┌───────────▼───────────────┐    │
│  │  SQLite (o2c.db)│   │  Anthropic claude-opus-4-5│    │
│  │  better-sqlite3 │   │  claude-opus-4-5            │    │
│  └─────────────────┘   └───────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

---

## Graph Model

### Node Types (8)
| Type | Color | Description |
|------|-------|-------------|
| Customer | Blue | Enterprise customers (Tata, Infosys, etc.) |
| Product | Green | Software/service products |
| Sales Order | Amber | O2C lifecycle entry point |
| SO Item | Gray | Line items linking orders to products |
| Delivery | Teal | Physical/logical fulfillment records |
| Billing Doc | Purple | Invoice documents |
| Payment | Pink | Payment receipts |
| Journal Entry | Orange | Accounting records |

### Edge Relationships
- Customer **→ placed →** Sales Order
- Sales Order **→ has item →** SO Item
- SO Item **→ references →** Product
- Sales Order **→ fulfilled by →** Delivery
- Sales Order **→ billed via →** Billing Doc
- Billing Doc **→ paid by →** Payment
- Billing Doc **→ posted as →** Journal Entry

---

## LLM Integration

### Two-Pass Architecture
1. **Intent Pass**: Claude receives the user query + system prompt. Returns a JSON action:
   ```json
   {"action":"query","queryName":"trace_billing_document","params":{"billingDocId":"BD001"},"explanation":"..."}
   ```

2. **Analysis Pass**: The query runs against SQLite, results are fed back to Claude for natural language synthesis.

### Why Two Passes?
- Keeps the LLM away from raw data hallucination (it only sees actual query results)
- Allows structured SQL queries with full database access
- Makes the system auditable — every answer traces back to a specific query

### Guardrails
The system prompt strictly instructs Claude to:
- Only answer O2C domain questions
- Respond with the exact restriction message for off-topic queries:
  *"This system is designed to answer questions related to the Order-to-Cash dataset only."*
- Never make up data — always use a query

---

## Database Choice: SQLite

**Why SQLite over a graph database (Neo4j)?**

| Consideration | SQLite | Neo4j |
|---------------|--------|-------|
| Setup | Zero config, file-based | Requires JVM, separate server |
| Query language | SQL (LLM-friendly, well-trained on) | Cypher (less LLM training data) |
| Scale | Sufficient for this dataset | Overkill for <1000 nodes |
| Joins | Simple FK joins | Native graph traversal |
| Demo portability | Single file (`o2c.db`) | Docker or cloud required |

The graph is constructed **at read time** from relational tables — the graph visualization is a view over the relational model, not a separate store.

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/graph` | All nodes + edges for visualization |
| GET | `/api/stats` | Dashboard statistics |
| POST | `/api/chat` | LLM conversation with query execution |
| POST | `/api/query` | Direct query execution (testing) |
| GET | `/api/node/:id` | Single node detail lookup |

---

## Sample Queries

```
# Product analysis
"Which products are associated with the highest number of billing documents?"

# Document tracing
"Trace the full flow of billing document BD001"
"Find the journal entry for billing document BD002B"

# Flow analysis
"Show me all sales orders with broken or incomplete flows"
"Which orders were delivered but never billed?"

# Financial
"Which invoices are still unpaid?"
"How much outstanding balance does Tata Motors have?"
"What is the monthly revenue trend?"

# Performance
"How is each sales rep performing?"
"Which customer has the highest outstanding balance?"
```

---

## Dataset

10 sales orders across 8 enterprise Indian customers. Notable data points:
- **SO004** (Mahindra): Delivered but not billed → detected as broken flow
- **SO007** (Bajaj Auto): Billed without delivery → detected as broken flow
- **BD002B**: A credit note with negative journal entry amount (-₹1,167)
- **PAY006, PAY009**: Pending payments (not yet cleared)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, D3.js v7 (force simulation) |
| Backend | Node.js, Express.js |
| Database | SQLite via better-sqlite3 |
| LLM | Anthropic claude-opus-4-5 (claude-opus-4-5) |
| Fonts | IBM Plex Sans + IBM Plex Mono |
