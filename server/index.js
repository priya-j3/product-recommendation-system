import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { products } from "../src/data/products.js";

dotenv.config();

const app = express();
const port = Number(process.env.PORT) || 3001;

app.use(cors());
app.use(express.json());

app.get("/api/products", (_req, res) => {
  res.json({ products });
});

app.post("/api/recommend", async (req, res) => {
  const preference = String(req.body?.preference ?? "").trim();

  if (!preference) {
    return res.status(400).json({ error: "Please describe what you are looking for." });
  }

  try {
    const result = await recommendWithOpenAI(preference);
    return res.json(result);
  } catch (error) {
    console.error("OpenAI recommendation failed, using local filter:", error.message);
    const fallback = fallbackRecommend(preference);
    return res.json({
      ...fallback,
      source: "fallback",
      notice:
        "AI API was unavailable, so recommendations were generated with a local keyword filter.",
    });
  }
});

async function recommendWithOpenAI(preference) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.includes("your-key-here")) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const catalog = products.map((product) => ({
    id: product.id,
    name: product.name,
    brand: product.brand,
    category: product.category,
    price: product.price,
    rating: product.rating,
    description: product.description,
  }));

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a product recommendation engine. Only recommend items from the provided catalog. Return JSON with recommendedIds (array of numeric ids that match the shopper preference) and explanation (short friendly reason). Prefer 2 to 5 items. Respect budget, category, and use-case constraints. If nothing fits well, return the closest matches and say so.",
        },
        {
          role: "user",
          content: JSON.stringify({ preference, catalog }),
        },
      ],
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`OpenAI HTTP ${response.status}: ${details}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  const parsed = JSON.parse(content);
  const recommendedIds = Array.isArray(parsed.recommendedIds)
    ? parsed.recommendedIds.map(Number)
    : [];

  const recommendedProducts = filterCatalog(recommendedIds);

  return {
    source: "openai",
    explanation: parsed.explanation || "Here are products that match your preference.",
    recommendedIds: recommendedProducts.map((product) => product.id),
    products: recommendedProducts,
  };
}

function fallbackRecommend(preference) {
  const query = preference.toLowerCase();
  const budgetMatch = query.match(/under\s*\$?\s*(\d+)/i) || query.match(/below\s*\$?\s*(\d+)/i);
  const maxPrice = budgetMatch ? Number(budgetMatch[1]) : Infinity;

  const categoryHints = [
    ["phone", "Phone"],
    ["smartphone", "Phone"],
    ["laptop", "Laptop"],
    ["notebook", "Laptop"],
    ["headphone", "Headphones"],
    ["earbuds", "Headphones"],
    ["camera", "Camera"],
    ["tablet", "Tablet"],
    ["watch", "Smartwatch"],
    ["fitness", "Smartwatch"],
  ];

  const hintedCategory = categoryHints.find(([hint]) => query.includes(hint))?.[1];

  const scored = products
    .map((product) => {
      let score = 0;
      if (product.price <= maxPrice) score += 3;
      if (hintedCategory && product.category === hintedCategory) score += 4;
      const haystack = `${product.name} ${product.brand} ${product.category} ${product.description}`.toLowerCase();
      query.split(/\s+/).forEach((word) => {
        if (word.length > 2 && haystack.includes(word)) score += 1;
      });
      return { product, score };
    })
    .filter(({ product, score }) => score > 0 && product.price <= maxPrice)
    .sort((a, b) => b.score - a.score || a.product.price - b.product.price)
    .slice(0, 4)
    .map(({ product }) => product);

  const recommendedProducts = scored.length ? scored : products.filter((p) => p.price <= maxPrice).slice(0, 3);

  return {
    explanation: `Matched your request against the catalog${
      Number.isFinite(maxPrice) ? ` with a budget under $${maxPrice}` : ""
    }.`,
    recommendedIds: recommendedProducts.map((product) => product.id),
    products: recommendedProducts,
  };
}

function filterCatalog(ids) {
  const allowed = new Set(ids);
  return products.filter((product) => allowed.has(product.id));
}

app.listen(port, () => {
  console.log(`Recommendation API listening on http://localhost:${port}`);
});
