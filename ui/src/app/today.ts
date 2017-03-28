export function today(): string {
  return new Date().toISOString().substring(0, 10);
}
