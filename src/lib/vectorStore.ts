type StoreEntry = {
  content: string;
  createdAt: number;
};

let store: StoreEntry[] = [];
let summary: string | null = null;

const ONE_HOUR = 60 * 60 * 1000;

export function addToStore(entry: StoreEntry) {
  store.push(entry);
}

export function getStore() {
  const now = Date.now();
  store = store.filter(
    (item) => now - item.createdAt < ONE_HOUR
  );
  return store;
}

export function clearStore() {
  store = [];
  summary = null;
}

export function setSummary(text: string) {
  summary = text;
}

export function getSummary() {
  return summary;
}