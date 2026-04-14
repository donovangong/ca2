class FakeElement {
  constructor(id = "") {
    this.id = id;
    this.children = [];
    this.listeners = {};
    this.style = {};
    this.dataset = {};
    this.value = "";
    this.className = "";
    this.textContent = "";
    this._innerHTML = "";
  }

  set innerHTML(value) {
    this._innerHTML = value;
  }

  get innerHTML() {
    const childHtml = this.children.map((child) => child.innerHTML).join("");
    return `${this._innerHTML}${childHtml}`;
  }

  appendChild(child) {
    this.children.push(child);
  }

  addEventListener(event, handler) {
    this.listeners[event] = handler;
  }

  click() {
    if (this.listeners.click) {
      return this.listeners.click();
    }
    return undefined;
  }
}

function createFakeDocument(initialIds = []) {
  const elements = new Map();
  const buttons = [];

  function getOrCreate(id) {
    if (!elements.has(id)) {
      elements.set(id, new FakeElement(id));
    }
    return elements.get(id);
  }

  initialIds.forEach(getOrCreate);

  return {
    elements,
    buttons,
    createElement() {
      const element = new FakeElement();
      const originalInnerHtml = Object.getOwnPropertyDescriptor(FakeElement.prototype, "innerHTML");

      Object.defineProperty(element, "innerHTML", {
        set(value) {
          originalInnerHtml.set.call(element, value);

          const buttonMatches = value.matchAll(/<button[^>]*data-id="([^"]+)"[^>]*>/g);
          for (const match of buttonMatches) {
            const button = new FakeElement();
            button.dataset.id = match[1];
            const classMatch = match[0].match(/class="([^"]+)"/);
            button.className = classMatch ? classMatch[1] : "";
            buttons.push(button);
          }

          const inputMatches = value.matchAll(/<input[^>]*id="([^"]+)"[^>]*value="([^"]*)"[^>]*>/g);
          for (const match of inputMatches) {
            const input = getOrCreate(match[1]);
            input.value = match[2];
          }
        },
        get() {
          return originalInnerHtml.get.call(element);
        }
      });

      return element;
    },
    getElementById: getOrCreate,
    querySelectorAll(selector) {
      if (selector === "button[data-id]") {
        return buttons;
      }

      const classDataIdMatch = selector.match(/^\.([A-Za-z0-9_-]+)\[data-id\]$/);
      if (classDataIdMatch) {
        return buttons.filter((button) => button.className.split(/\s+/).includes(classDataIdMatch[1]));
      }

      return [];
    }
  };
}

module.exports = {
  FakeElement,
  createFakeDocument
};
