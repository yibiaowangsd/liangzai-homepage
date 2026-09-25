// Entries are enabled only after their submitted source was built for wasm32
// and passed key/encapsulation or sign/verify round trips on every parameter.
export const NGCC_WASM = Object.freeze({
  'kem-01': ['ngcc-kem-01-0', 'ngcc-kem-01-1', 'ngcc-kem-01-2'],
  'kem-02': ['ngcc-kem-02-0', 'ngcc-kem-02-1', 'ngcc-kem-02-2', 'ngcc-kem-02-3', 'ngcc-kem-02-4'],
  'kem-03': ['ngcc-kem-03-0', 'ngcc-kem-03-1', 'ngcc-kem-03-2', 'ngcc-kem-03-3'],
  'kem-08': ['ngcc-kem-08-0', 'ngcc-kem-08-1', 'ngcc-kem-08-2'],
  'kem-27': ['ngcc-kem-27-0', 'ngcc-kem-27-1', 'ngcc-kem-27-2'],
  'kem-39': ['ngcc-kem-39-0', 'ngcc-kem-39-1', 'ngcc-kem-39-2'],
  'sign-01': ['ngcc-sign-01-0', 'ngcc-sign-01-1', 'ngcc-sign-01-2'],
});

export const ngccModule = (candidate, parameter) => NGCC_WASM[candidate]?.[Number(parameter)] || null;
