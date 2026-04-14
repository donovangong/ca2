async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }

  return data;
}

function setMessage(element, text, color) {
  element.style.color = color || "";
  element.textContent = text;
}

function createCard(html) {
  const card = document.createElement("div");
  card.className = "card";
  card.innerHTML = html;
  return card;
}

function renderCards(container, items, toHtml) {
  container.innerHTML = "";
  items.forEach((item) => container.appendChild(createCard(toHtml(item))));
}
