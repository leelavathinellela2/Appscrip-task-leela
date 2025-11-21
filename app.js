/* app.js
   Minimal vanilla JS to fetch products from fakestoreapi and render cards.
   No frameworks required. Keep DOM minimal: create elements once per product.
*/

const API_BASE = "https://fakestoreapi.com";
const gridRoot = document.getElementById("products");
const categorySelect = document.getElementById("category-select");
const searchInput = document.getElementById("search");
const yearSpan = document.getElementById("year");
const schemaEl = document.getElementById("product-schema");

yearSpan.textContent = new Date().getFullYear();

async function fetchProducts() {
  try {
    const res = await fetch(`${API_BASE}/products`);
    if (!res.ok) throw new Error("Network error");
    const data = await res.json();
    return data;
  } catch (err) {
    console.error(err);
    return [];
  }
}

async function fetchCategories() {
  try {
    const res = await fetch(`${API_BASE}/products/categories`);
    if (!res.ok) throw new Error("Network error");
    return res.json();
  } catch {
    return [];
  }
}

function makeProductCard(product) {
  // Create minimal DOM nodes for a card
  const card = document.createElement("article");
  card.className = "card";
  card.setAttribute("itemtype", "https://schema.org/Product");
  card.setAttribute("itemscope", "");

  // Media container
  const media = document.createElement("div");
  media.className = "media";
  const img = document.createElement("img");
  // Provide SEO friendly alt text
  img.alt = `${product.title} - image`;
  // Use the remote image; keep filename semantic in alt text
  img.loading = "lazy";
  img.src = product.image;
  media.appendChild(img);

  const title = document.createElement("h3");
  title.textContent = product.title;
  title.setAttribute("itemprop", "name");

  const desc = document.createElement("p");
  desc.className = "desc";
  desc.textContent = product.description;

  const meta = document.createElement("div");
  meta.className = "meta";

  const price = document.createElement("div");
  price.className = "price";
  price.textContent = `₹${(product.price * 82).toFixed(0)}`; // display INR approx (demonstration)
  price.setAttribute("itemprop", "offers");
  price.setAttribute("itemscope", "");
  price.setAttribute("itemtype", "https://schema.org/Offer");

  const btn = document.createElement("button");
  btn.className = "btn";
  btn.textContent = "Add";
  btn.addEventListener("click", () => {
    btn.textContent = "Added";
    btn.disabled = true;
    btn.classList.add("secondary");
  });

  meta.appendChild(price);
  meta.appendChild(btn);

  // Compose
  card.appendChild(media);
  card.appendChild(title);
  card.appendChild(desc);
  card.appendChild(meta);

  return { element: card, searchableText: (product.title + " " + product.description + " " + product.category).toLowerCase(), category: product.category, schema: product };
}

/* Render list into DOM (replaces previous list) */
function renderGrid(items) {
  // Clear and insert grid wrapper
  gridRoot.innerHTML = "";
  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "grid-placeholder";
    empty.textContent = "No products found.";
    gridRoot.appendChild(empty);
    return;
  }

  const list = document.createElement("div");
  list.className = "product-grid-list";

  const itemListElements = []; // for JSON-LD schema

  items.forEach(({ element, schema }, idx) => {
    list.appendChild(element);
    // Prepare itemListElement for schema
    itemListElements.push({
      "@type": "ListItem",
      "position": idx + 1,
      "url": schema.image || "",
      "name": schema.title || ""
    });
  });

  gridRoot.appendChild(list);

  // Update JSON-LD schema with these products
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "ShopEase Products",
    "itemListElement": itemListElements
  };
  schemaEl.textContent = JSON.stringify(jsonLd, null, 2);
}

/* Wire up filters */
function setupFilters(allItems) {
  // Populate categories
  (async () => {
    const cats = await fetchCategories();
    cats.forEach(cat => {
      const opt = document.createElement("option");
      opt.value = cat;
      opt.textContent = cat[0].toUpperCase() + cat.slice(1);
      categorySelect.appendChild(opt);
    });
  })();

  // Searching and category filtering with a single pass filter
  function applyFilters() {
    const q = searchInput.value.trim().toLowerCase();
    const cat = categorySelect.value;
    const filtered = allItems.filter(it => {
      const catMatch = cat === "all" ? true : it.category === cat;
      const queryMatch = q === "" ? true : it.searchableText.includes(q);
      return catMatch && queryMatch;
    });
    renderGrid(filtered);
  }

  searchInput.addEventListener("input", debounce(applyFilters, 180));
  categorySelect.addEventListener("change", applyFilters);
}

/* Utility: debounce */
function debounce(fn, wait) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

/* Init: fetch products and render */
(async function init() {
  const raw = await fetchProducts();
  if (!raw.length) {
    gridRoot.innerHTML = '<div class="grid-placeholder">Unable to load products.</div>';
    return;
  }

  // Map to minimal render data to keep DOM small
  const items = raw.map(p => {
    const card = makeProductCard(p);
    return {
      element: card.element,
      searchableText: card.searchableText,
      category: card.category,
      schema: card.schema
    };
  });

  // initial render
  renderGrid(items);

  // wire filters/search
  setupFilters(items);
})();
