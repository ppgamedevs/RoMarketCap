/**
 * ROMC AI Chat API Endpoint
 * 
 * Handles AI conversations with context-aware responses
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { getCompanyBySlugOrThrow } from "@/src/lib/company";
import { buildSystemPrompt, buildContextPrompt } from "@/src/lib/ai/prompts";
import { kv } from "@vercel/kv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RATE_LIMIT = 10; // 10 requests per minute per IP

type ChatRequest = {
  message: string;
  context?: {
    page?: string;
    companySlug?: string;
    companyName?: string;
    industrySlug?: string;
    countySlug?: string;
  };
  lang?: "ro" | "en";
  history?: Array<{ role: string; content: string }>;
};

async function checkRateLimit(ip: string): Promise<boolean> {
  const key = `ai-chat:rate:${ip}`;
  try {
    const current = await kv.get<{ count: number; resetAt: number }>(key);
    const now = Date.now();
    const windowMs = 60_000; // 1 minute

    if (!current || now >= current.resetAt) {
      await kv.set(key, { count: 1, resetAt: now + windowMs }, { ex: 60 });
      return true;
    }

    if (current.count >= RATE_LIMIT) {
      return false;
    }

    const updated = { count: current.count + 1, resetAt: current.resetAt };
    await kv.set(key, updated, { ex: Math.ceil((current.resetAt - now) / 1000) });
    return true;
  } catch (error) {
    console.error("[api/ai/chat] Rate limit error:", error);
    return true; // Fail open
  }
}

export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
    
    const allowed = await checkRateLimit(ip);
    if (!allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        { status: 429 }
      );
    }

    const body: ChatRequest = await req.json();
    const { message, context, lang = "ro", history = [] } = body;

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    if (message.length > 1000) {
      return NextResponse.json({ error: "Message too long (max 1000 characters)" }, { status: 400 });
    }

    // Build context data
    let contextData: any = {};
    if (context?.companySlug) {
      try {
        const company = await getCompanyBySlugOrThrow(context.companySlug);
        contextData.company = {
          name: company.name,
          cui: company.cui,
          romcScore: company.romcScore,
          revenueLatest: company.revenueLatest ? Number(company.revenueLatest) : null,
          employees: company.employees,
          industry: company.industry,
          county: company.county,
          marketCap: company.marketCap ? Number(company.marketCap) : null,
          dataConfidence: company.dataConfidence,
        };
      } catch {
        // Company not found, ignore
      }
    }

    if (context?.industrySlug) {
      const industryStats = await prisma.company.aggregate({
        where: {
          industrySlug: context.industrySlug,
          isPublic: true,
          visibilityStatus: "PUBLIC",
        },
        _count: true,
        _avg: { romcScore: true },
      });
      contextData.industry = {
        slug: context.industrySlug,
        totalCompanies: industryStats._count,
        avgScore: industryStats._avg.romcScore,
      };
    }

    // Build prompts
    const systemPrompt = buildSystemPrompt(lang, context?.page);
    const contextPrompt = buildContextPrompt(contextData, lang);
    
    // For now, use a simple template-based response
    // TODO: Integrate with OpenAI API when ready
    const response = await generateResponse(message, systemPrompt, contextPrompt, history, lang, contextData);

    return NextResponse.json({ response });
  } catch (error) {
    console.error("[api/ai/chat] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Generate AI response (template-based for now, will be replaced with OpenAI)
 */
async function generateResponse(
  message: string,
  systemPrompt: string,
  contextPrompt: string,
  history: Array<{ role: string; content: string }>,
  lang: "ro" | "en",
  contextData: any
): Promise<string> {
  const lowerMessage = message.toLowerCase();

  // Site explanations
  if (lowerMessage.includes("romc") || lowerMessage.includes("scor")) {
    return lang === "ro"
      ? `Scorul ROMC (Romanian Market Cap) este un indicator care măsoară valoarea și sănătatea financiară a unei companii pe o scală de 0-100. Se calculează pe baza mai multor factori:

• Venituri (0-18 puncte)
• Profitabilitate (marjă de profit: -8 până la +8 puncte)
• Număr de angajați (0-12 puncte)
• Vârsta companiei (0-10 puncte)
• Prezență online (website: +6 puncte)
• Completitudine date (descriere, locație: 0-8 puncte)

Scorul ROMC este o estimare și doar informațională, nu reprezintă consultanță financiară.`
      : `ROMC Score (Romanian Market Cap) is an indicator that measures a company's value and financial health on a scale of 0-100. It's calculated based on multiple factors:

• Revenue (0-18 points)
• Profitability (profit margin: -8 to +8 points)
• Number of employees (0-12 points)
• Company age (0-10 points)
• Online presence (website: +6 points)
• Data completeness (description, location: 0-8 points)

ROMC Score is an estimate and informational only, not financial advice.`;
  }

  if (lowerMessage.includes("market cap") || lowerMessage.includes("capitalizare")) {
    return lang === "ro"
      ? `Market Cap (capitalizare de piață) reprezintă valoarea totală a unei companii calculată prin înmulțirea numărului de acțiuni cu prețul acțiunii.

Pentru companiile listate la BVB (Bursa de Valori București), folosim date reale de la bursă.

Pentru companiile private, estimăm market cap pe baza:
• Multiplii de venituri (0.7-1.4x pentru companii profitabile)
• Multiplii bazate pe numărul de angajați
• Comparații cu companii similare din industrie

Aceste estimări sunt orientative și doar informaționale.`
      : `Market Cap (market capitalization) represents the total value of a company calculated by multiplying the number of shares by the share price.

For companies listed on BVB (Bucharest Stock Exchange), we use real market data.

For private companies, we estimate market cap based on:
• Revenue multiples (0.7-1.4x for profitable companies)
• Multiples based on number of employees
• Comparisons with similar companies in the industry

These estimates are indicative and informational only.`;
  }

  if (lowerMessage.includes("confidență") || lowerMessage.includes("confidence")) {
    return lang === "ro"
      ? `Confidența datelor (Data Confidence) măsoară cât de de încredere sunt datele disponibile pentru o companie, pe o scală de 0-100.

Se calculează pe baza:
• Completitudine câmpuri (website, venituri, angajați, etc.)
• Număr de metrici disponibile
• Recența datelor

O confidență ridicată (>70%) indică date complete și actualizate, în timp ce o confidență scăzută (<50%) indică date incomplete sau vechi.`
      : `Data Confidence measures how reliable the available data is for a company, on a scale of 0-100.

It's calculated based on:
• Field completeness (website, revenue, employees, etc.)
• Number of available metrics
• Data recency

High confidence (>70%) indicates complete and up-to-date data, while low confidence (<50%) indicates incomplete or old data.`;
  }

  // Company-specific questions
  if (contextData.company) {
    const company = contextData.company;
    if (lowerMessage.includes("ce este") || lowerMessage.includes("what is")) {
      return lang === "ro"
        ? `${company.name} este o companie din ${company.industry || "România"}${company.county ? `, județul ${company.county}` : ""}. 

${company.romcScore !== null ? `Are un scor ROMC de ${company.romcScore}/100.` : ""}
${company.revenueLatest ? `Venituri raportate: ${new Intl.NumberFormat("ro-RO", { style: "currency", currency: "RON", maximumFractionDigits: 0 }).format(company.revenueLatest)}.` : ""}
${company.employees ? `Echipă de ${company.employees} angajați.` : ""}

Pentru mai multe detalii, consultă pagina completă a companiei.`
        : `${company.name} is a company in ${company.industry || "Romania"}${company.county ? `, ${company.county} county` : ""}.

${company.romcScore !== null ? `Has a ROMC score of ${company.romcScore}/100.` : ""}
${company.revenueLatest ? `Reported revenue: ${new Intl.NumberFormat("en-US", { style: "currency", currency: "RON", maximumFractionDigits: 0 }).format(company.revenueLatest)}.` : ""}
${company.employees ? `Team of ${company.employees} employees.` : ""}

For more details, see the company's full page.`;
    }

    if (lowerMessage.includes("de ce") || lowerMessage.includes("why")) {
      return lang === "ro"
        ? `Scorul ROMC pentru ${company.name} este influențat de:
${company.revenueLatest ? `• Venituri: ${new Intl.NumberFormat("ro-RO", { style: "currency", currency: "RON", maximumFractionDigits: 0 }).format(company.revenueLatest)}` : "• Venituri: N/A"}
${company.employees ? `• Angajați: ${company.employees}` : "• Angajați: N/A"}
• Confidență date: ${company.dataConfidence || "N/A"}/100

Pentru o analiză detaliată, consultă pagina companiei.`
        : `ROMC Score for ${company.name} is influenced by:
${company.revenueLatest ? `• Revenue: ${new Intl.NumberFormat("en-US", { style: "currency", currency: "RON", maximumFractionDigits: 0 }).format(company.revenueLatest)}` : "• Revenue: N/A"}
${company.employees ? `• Employees: ${company.employees}` : "• Employees: N/A"}
• Data Confidence: ${company.dataConfidence || "N/A"}/100

For detailed analysis, see the company page.`;
    }
  }

  // Industry questions
  if (contextData.industry) {
    const industry = contextData.industry;
    if (lowerMessage.includes("top") || lowerMessage.includes("companii")) {
      return lang === "ro"
        ? `Industria ${industry.slug} cuprinde ${industry.totalCompanies} companii publice, cu un scor ROMC mediu de ${Math.round(industry.avgScore || 0)}/100.

Pentru a vedea top companiile, consultă pagina industriei sau folosește filtrele de pe pagina principală.`
        : `The ${industry.slug} industry includes ${industry.totalCompanies} public companies, with an average ROMC score of ${Math.round(industry.avgScore || 0)}/100.

To see top companies, check the industry page or use filters on the main page.`;
    }
  }

  // Default response
  return lang === "ro"
    ? `Bună! Sunt ROMC AI, asistentul tău pentru a înțelege site-ul RoMarketCap și companiile românești.

Pot să te ajut cu:
• Explicații despre scorul ROMC și metodologie
• Informații despre companii și industrii
• Explicații despre metrici (market cap, confidență, etc.)
• Comparații între companii

Întreabă-mă orice!`
    : `Hi! I'm ROMC AI, your assistant to understand the RoMarketCap site and Romanian companies.

I can help you with:
• Explanations about ROMC score and methodology
• Information about companies and industries
• Explanations about metrics (market cap, confidence, etc.)
• Comparisons between companies

Ask me anything!`;
}
