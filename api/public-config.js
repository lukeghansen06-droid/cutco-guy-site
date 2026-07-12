// Public, non-secret runtime configuration. This lets a static site read the
// GA4 measurement ID from Vercel without baking credentials into source.
export default function handler(req, res) {
  const raw = process.env.GA4_MEASUREMENT_ID || "";
  const ga4MeasurementId = /^G-[A-Z0-9]{6,20}$/i.test(raw) ? raw.toUpperCase() : "";
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({ ga4MeasurementId });
}
