import { NextResponse } from "next/server";
import { getRecentSales, SalesforceConfigError } from "../../../lib/salesforce";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sales = await getRecentSales();
    return NextResponse.json(sales, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const isConfigError = error instanceof SalesforceConfigError;

    console.error("Salesforce sales API error", {
      name: error instanceof Error ? error.name : "UnknownError",
      message: error instanceof Error ? error.message : "Unknown Salesforce error",
    });

    return NextResponse.json(
      {
        error: isConfigError ? "SALESFORCE_NOT_CONFIGURED" : "SALESFORCE_QUERY_FAILED",
        message: isConfigError
          ? "Salesforce credentials are not configured on the server. The dashboard can use demo data in local development."
          : "Unable to load recent Salesforce sales right now. Check server logs and Salesforce API access.",
      },
      {
        status: isConfigError ? 503 : 502,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }
}
