const STORAGE_KEY = /^[a-f0-9]{24}\/[a-f0-9-]{24,36}(?:\.cover)?\.(pdf|epub|mobi|png|jpg|webp)$/u;

export function assertPrivateStorageKey(storageKey: string) {
  if (!STORAGE_KEY.test(storageKey)) throw new Error("Invalid storage key.");
  return storageKey;
}
