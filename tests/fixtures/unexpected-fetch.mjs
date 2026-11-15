// A missing test fixture must never fall through to the real fetch transport.
// Keep the record as well: application error handling may catch the rejection.
export function createUnexpectedFetchGuard() {
  const attempts = [];
  const fetch = async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    const method = init?.method ?? (input instanceof Request ? input.method : 'GET');
    const target = `${method} ${url.origin}${url.pathname}`;
    attempts.push(target);
    throw new Error(`Unmocked fetch in test: ${target}`);
  };
  return { fetch, attempts };
}
