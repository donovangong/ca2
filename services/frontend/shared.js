async function fetchJson(url, options) {
  const response = await fetch(url, options);

  let data;
  try {
    data = await response.json();
  } catch (error) {
    throw new Error("Invalid server response");
  }

  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }

  return data;
}

function setMessage(element, text, type = "error") {
  element.className = `alert show ${type}`;
  element.textContent = text;
}

function clearMessage(element) {
  element.className = "alert";
  element.textContent = "";
}

function createCard(html) {
  const card = document.createElement("article");
  card.className = "card";
  card.innerHTML = html;
  return card;
}

function renderCards(container, items, toHtml) {
  container.innerHTML = "";
  items.forEach((item) => container.appendChild(createCard(toHtml(item))));
}

function renderEmptyState(container, title, description) {
  container.innerHTML = `
    <div class="empty-state">
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(description)}</p>
    </div>
  `;
}

function showLoadingState(container, message) {
  container.innerHTML = `
    <div class="empty-state">
      <h3>${escapeHtml(message)}</h3>
    </div>
  `;
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR"
  }).format(Number(value) || 0);
}

function formatDateTime(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }

  return date.toLocaleString();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}