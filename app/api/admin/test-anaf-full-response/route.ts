/**
 * Test endpoint to see ALL fields returned by ANAF API
 * Used to check if ANAF returns founding date or registration date
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";
import { verifyCompanyANAF } from "@/src/lib/verification/anaf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Recursively extract all keys from an object
 */
function extractAllKeys(obj: unknown, prefix = ""): { keys: string[]; data: Record<string, unknown> } {
  const keys: string[] = [];
  const data: Record<string, unknown> = {};

  if (obj && typeof obj === "object" && !Array.isArray(obj)) {
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      keys.push(fullKey);
      data[fullKey] = value;

      // Recursively process nested objects
      if (value && typeof value === "object" && !Array.isArray(value)) {
        const nested = extractAllKeys(value, fullKey);
        keys.push(...nested.keys);
        Object.assign(data, nested.data);
      }
    }
  }

  return { keys, data };
}

export async function GET(req: NextRequest) {
  try {
    await requireAdminSession();

    const url = new URL(req.url);
    const cui = url.searchParams.get("cui");

    if (!cui) {
      return NextResponse.json({
        ok: false,
        error: "Missing cui parameter. Use ?cui=12345678",
        example: "/api/admin/test-anaf-full-response?cui=5022670",
      }, { status: 400 });
    }

    // Fetch ANAF data with force=true to bypass cache
    const result = await verifyCompanyANAF(cui, { force: true });

    // Extract all keys from rawResponse
    const { keys: allKeys, data: allData } = extractAllKeys(result.rawResponse);

    // Find potential date fields (search for keywords related to dates/founding)
    const potentialDateFields = allKeys.filter(key => {
      const lowerKey = key.toLowerCase();
      return (
        lowerKey.includes("data") ||
        lowerKey.includes("date") ||
        lowerKey.includes("infiintare") ||
        lowerKey.includes("inregistrare") ||
        lowerKey.includes("constituire") ||
        lowerKey.includes("founded") ||
        lowerKey.includes("registration") ||
        lowerKey.includes("inceput") ||
        lowerKey.includes("activitate")
      );
    });

    // Extract values for potential date fields
    const dateFieldValues: Record<string, unknown> = {};
    for (const key of potentialDateFields) {
      dateFieldValues[key] = allData[key];
    }

    return NextResponse.json({
      ok: true,
      cui,
      verificationStatus: result.verificationStatus,
      endpointUsed: result.endpointUsed,
      note: result.verificationStatus === "ERROR"
        ? "ANAF API returned an error. Check errorMessage for details."
        : "Successfully fetched ANAF response. Check potentialDateFields to see if founding date is available.",
      // All keys found in response (sorted)
      allKeys: allKeys.sort(),
      // Potential date-related fields
      potentialDateFields: potentialDateFields.sort(),
      // Values of potential date fields
      dateFieldValues,
      // Parsed result (what we currently extract)
      parsedResult: {
        companyName: result.companyName,
        address: result.address,
        caen: result.caen,
        registrationNumber: result.registrationNumber,
        phone: result.phone,
        iban: result.iban,
        registrationStatus: result.registrationStatus,
        fiscalAuthority: result.fiscalAuthority,
        isActive: result.isActive,
        isVatRegistered: result.isVatRegistered,
        lastReportedYear: result.lastReportedYear,
      },
      // Full raw response (for deep inspection)
      fullRawResponse: result.rawResponse,
      errorMessage: result.errorMessage,
    });
  } catch (error) {
    console.error("[admin/test-anaf-full-response] Error:", error);
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}
