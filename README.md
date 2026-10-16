# ShopWise — AI Product Recommendation System

React catalog plus an Express API that sends shopper preferences to OpenAI, then filters this app's product list to the recommended IDs.

## Setup

```bash
cd product-recommendation-system
npm install
copy .env.example .env
```

Put your OpenAI key in `.env`:

```
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
PORT=3001
```

## Run

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Describe a need such as `I want a phone under $500`. The UI posts that text to `/api/recommend`, the server asks the model to pick catalog IDs, and matching products are shown.

If the API key is missing or OpenAI is unreachable, the server falls back to a local keyword/budget filter so the demo still works.
