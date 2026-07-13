import { z } from "zod";

/**
 * Llama models on Groq sometimes emit numeric fields as strings (e.g. "20"
 * instead of 20) in tool-call arguments. Groq validates tool-call arguments
 * against the declared schema server-side and hard-rejects the whole
 * response on a type mismatch, so a plain z.number() isn't enough — the
 * schema itself must accept both shapes. Optional min/max clamp instead of
 * reject, since an out-of-range value is still usable.
 *
 * Note: LangChain's withStructuredOutput() type inference for zod v4 exposes
 * the pre-transform (input) shape here rather than this function's actual
 * number output, so callers must cast the field back to `number` after
 * invoke() — the runtime value is correctly coerced regardless.
 */
export function looseNumber(min?: number, max?: number) {
  return z.union([z.number(), z.string()]).transform((v) => {
    let n = typeof v === "string" ? parseFloat(v) : v;
    if (!Number.isFinite(n)) n = 0;
    if (min != null) n = Math.max(min, n);
    if (max != null) n = Math.min(max, n);
    return n;
  });
}

/**
 * Same issue for fields that should be a plain string but the model
 * sometimes structures as an object or array instead (e.g. analyst ratings
 * broken into sub-fields). Normalizes either shape into a readable string.
 * Same TypeScript-inference caveat as looseNumber() applies.
 */
export function looseString() {
  return z
    .union([z.string(), z.record(z.string(), z.unknown()), z.array(z.unknown())])
    .transform((v) => {
      if (typeof v === "string") return v;
      if (Array.isArray(v)) {
        return v.map((x) => (typeof x === "string" ? x : JSON.stringify(x))).join("; ");
      }
      return Object.entries(v)
        .map(([k, val]) => `${k}: ${typeof val === "string" ? val : JSON.stringify(val)}`)
        .join(", ");
    });
}
