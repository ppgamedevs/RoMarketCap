/**
 * PROMPT 61: CUI normalization and validation
 * 
 * Re-exports from cuiValidation for consistency.
 */

import { normalizeCUI, isValidCUI } from "../cuiValidation";

export { normalizeCUI, isValidCUI };

/**
 * Validate CUI (strict check)
 */
export function validateCui(cui: string | null | undefined): boolean {
  return isValidCUI(cui);
}

