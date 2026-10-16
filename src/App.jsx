import { useMemo, useState } from "react";
import { products as catalog } from "./data/products.js";

const EXAMPLES = [
  "I want a phone under $500",
  "Budget laptop for school",
  "Wireless headphones for commuting",
  "Camera for travel photography",
];

export default function App() {
  const [preference, setPreference] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const recommendedIds = useMemo(
    () => new Set(result?.recommendedIds ?? []),
    [result]
  );

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preference }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Could not get recommendations.");
      }
      setResult(data);
    } catch (err) {
      setError(err.message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <header className="hero">
        <p className="eyebrow">ShopWise</p>
        <h1>AI product recommendations</h1>
        <p className="lede">
          Browse the catalog, describe what you need, and the AI will pick matching
          products from this list.
        </p>

        <form className="search" onSubmit={handleSubmit}>
          <label htmlFor="preference">Your preference</label>
          <div className="search-row">
            <input
              id="preference"
              value={preference}
              onChange={(event) => setPreference(event.target.value)}
              placeholder='Try: "I want a phone under $500"'
              required
            />
            <button type="submit" disabled={loading}>
              {loading ? "Finding…" : "Recommend"}
            </button>
          </div>
        </form>

        <div className="examples">
          {EXAMPLES.map((example) => (
            <button
              key={example}
              type="button"
              className="chip"
              onClick={() => setPreference(example)}
            >
              {example}
            </button>
          ))}
        </div>
      </header>

      {error ? <p className="banner error">{error}</p> : null}

      {result ? (
        <section className="panel">
          <div className="panel-head">
            <h2>Recommended for you</h2>
            <span className={`source ${result.source}`}>{result.source}</span>
          </div>
          <p className="explanation">{result.explanation}</p>
          {result.notice ? <p className="notice">{result.notice}</p> : null}
          <ProductGrid
            products={result.products}
            recommendedIds={recommendedIds}
            emptyText="No matching products were returned."
          />
        </section>
      ) : null}

      <section className="panel">
        <div className="panel-head">
          <h2>Full catalog</h2>
          <span className="count">{catalog.length} products</span>
        </div>
        <ProductGrid products={catalog} recommendedIds={recommendedIds} />
      </section>
    </div>
  );
}

function ProductGrid({ products, recommendedIds, emptyText }) {
  if (!products?.length) {
    return <p className="empty">{emptyText}</p>;
  }

  return (
    <div className="grid">
      {products.map((product) => {
        const highlighted = recommendedIds.has(product.id);
        return (
          <article
            key={product.id}
            className={`card ${highlighted ? "recommended" : ""}`}
          >
            <div className="card-top">
              <span className="category">{product.category}</span>
              {highlighted ? <span className="badge">AI pick</span> : null}
            </div>
            <h3>{product.name}</h3>
            <p className="brand">{product.brand}</p>
            <p className="desc">{product.description}</p>
            <div className="card-foot">
              <strong>${product.price}</strong>
              <span>★ {product.rating.toFixed(1)}</span>
            </div>
          </article>
        );
      })}
    </div>
  );
}
