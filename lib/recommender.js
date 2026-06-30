// lib/recommender.js
// Re-exports recommend() from the canonical browser-importable location.
// Tests import from here (../lib/recommender.js) — no test changes needed for the path.
// The actual logic lives in assets/recommender.js (single source of truth).
export { recommend } from '../assets/recommender.js';
