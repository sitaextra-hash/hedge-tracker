import { XMLParser } from "fast-xml-parser";

const EDGAR_BASE = "https://data.sec.gov";
const EDGAR_ARCHIVES = "https://www.sec.gov/Archives/edgar/data";
const USER_AGENT = "hedge-tracker sitaextra@gmail.com";
const HEADERS = { "User-Agent": USER_AGENT, "Accept-Encoding": "gzip, deflate" };

export type Filing13F = {
  fund: string;
  cik: string;
  filedDate: string;
  periodOfReport: string;
  accessionNumber: string;
  holdings: HoldingRow[];
};

export type HoldingRow = {
  issuer: string;
  ticker?: string;
  cusip: string;
  valueThousands: number;
  shares: number;
  investmentDiscretion: string;
  putCall?: string;
};

export type FundActivity = {
  fund: string;
  cik: string;
  filedDate: string;
  periodOfReport: string;
  ticker: string;
  issuer: string;
  action: "new" | "add" | "trim" | "exit" | "hold";
  changePct: number;
  currentShares: number;
  previousShares: number;
  valueThousands: number;
};

function padCik(cik: string): string {
  return cik.replace(/^0+/, "").padStart(10, "0");
}

async function edgarFetch(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: HEADERS,
      next: { revalidate: 86400 }, // cache 24h — filings are quarterly
    });
    if (!res.ok) return null;
    return res.text();
  } catch {
    return null;
  }
}

type FilingEntry = { accession: string; date: string; period: string };

async function getRecentFilings(cik: string, count = 2): Promise<FilingEntry[]> {
  const paddedCik = padCik(cik);
  const url = `${EDGAR_BASE}/submissions/CIK${paddedCik}.json`;
  const text = await edgarFetch(url);
  if (!text) return [];

  const data = JSON.parse(text);
  const recent = data.filings?.recent;
  if (!recent) return [];

  const forms: string[] = recent.form ?? [];
  const accessions: string[] = recent.accessionNumber ?? [];
  const dates: string[] = recent.filingDate ?? [];
  const periods: string[] = recent.reportDate ?? [];

  const results: FilingEntry[] = [];
  for (let i = 0; i < forms.length && results.length < count; i++) {
    if (forms[i] === "13F-HR") {
      results.push({ accession: accessions[i], date: dates[i], period: periods[i] });
    }
  }
  return results;
}

async function getFilingDocumentUrl(cik: string, accession: string): Promise<string | null> {
  const numericCik = padCik(cik).replace(/^0+/, "");
  const accNoDashes = accession.replace(/-/g, "");
  const indexUrl = `${EDGAR_ARCHIVES}/${numericCik}/${accNoDashes}/${accession}-index.htm`;
  const html = await edgarFetch(indexUrl);
  if (!html) return null;

  // Extract all href="/Archives/edgar/data/..." links that end in .xml
  const xmlPattern = /href="(\/Archives\/edgar\/data\/[^"]+\.xml)"/g;
  const matches: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = xmlPattern.exec(html)) !== null) {
    matches.push(m[1]);
  }

  if (matches.length === 0) return null;

  // The info table XML is NOT primary_doc.xml and NOT inside the xslForm13F subfolder
  const infoTable = matches.find(
    (u) => !u.includes("primary_doc") && !u.includes("xslForm13F")
  );
  if (infoTable) return `https://www.sec.gov${infoTable}`;

  // Fall back to any non-xsl xml
  const fallback = matches.find((u) => !u.includes("xslForm13F"));
  if (fallback) return `https://www.sec.gov${fallback}`;

  return null;
}

function parseInfoTable(xml: string): HoldingRow[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    parseTagValue: true,
    trimValues: true,
  });
  const doc = parser.parse(xml);

  // The XML may be wrapped in informationTable or be a standalone infoTable list
  const root =
    doc?.informationTable ??
    doc?.["ns1:informationTable"] ??
    doc?.["com:informationTable"] ??
    doc;

  const rawEntries =
    root?.infoTable ??
    root?.["ns1:infoTable"] ??
    root?.["com:infoTable"] ??
    [];

  const entries = Array.isArray(rawEntries) ? rawEntries : [rawEntries];

  return entries
    .filter(Boolean)
    .map((e: Record<string, unknown>) => {
      const shrsOrPrn =
        (e?.shrsOrPrnAmt as Record<string, unknown>) ??
        (e?.["ns1:shrsOrPrnAmt"] as Record<string, unknown>) ?? {};
      const shares =
        Number(shrsOrPrn?.sshPrnamt ?? shrsOrPrn?.["ns1:sshPrnamt"] ?? 0);
      const value = Number(e?.value ?? e?.["ns1:value"] ?? 0);
      const issuer = String(e?.nameOfIssuer ?? e?.["ns1:nameOfIssuer"] ?? "");
      const cusip = String(e?.cusip ?? e?.["ns1:cusip"] ?? "");
      const discretion = String(
        e?.investmentDiscretion ?? e?.["ns1:investmentDiscretion"] ?? "SOLE"
      );
      const putCall = e?.putCall ? String(e.putCall) : undefined;

      return { issuer, cusip, valueThousands: value, shares, investmentDiscretion: discretion, putCall } as HoldingRow;
    })
    .filter((h) => h.valueThousands > 0);
}

export async function fetchFund13F(
  fund: string,
  cik: string
): Promise<{ current: Filing13F | null; previous: Filing13F | null }> {
  const filings = await getRecentFilings(cik, 2);
  if (filings.length === 0) return { current: null, previous: null };

  async function parseFiling(entry: FilingEntry): Promise<Filing13F | null> {
    const docUrl = await getFilingDocumentUrl(cik, entry.accession);
    if (!docUrl) return null;
    const xml = await edgarFetch(docUrl);
    if (!xml) return null;
    const holdings = parseInfoTable(xml);
    return {
      fund,
      cik,
      filedDate: entry.date,
      periodOfReport: entry.period,
      accessionNumber: entry.accession,
      holdings,
    };
  }

  const [current, previous] = await Promise.all([
    parseFiling(filings[0]),
    filings[1] ? parseFiling(filings[1]) : Promise.resolve(null),
  ]);

  return { current, previous };
}

function aggregateByCusip(holdings: HoldingRow[]): Map<string, HoldingRow> {
  const map = new Map<string, HoldingRow>();
  for (const h of holdings) {
    const existing = map.get(h.cusip);
    if (existing) {
      existing.shares += h.shares;
      existing.valueThousands += h.valueThousands;
    } else {
      map.set(h.cusip, { ...h });
    }
  }
  return map;
}

export function diffFilings(
  fund: string,
  cik: string,
  current: Filing13F,
  previous: Filing13F | null
): FundActivity[] {
  // Aggregate multiple manager rows per CUSIP into one position
  const currentMap = aggregateByCusip(current.holdings);
  const prevMap = new Map<string, number>();
  if (previous) {
    aggregateByCusip(previous.holdings).forEach((h, cusip) =>
      prevMap.set(cusip, h.shares)
    );
  }

  const activities: FundActivity[] = [];

  // Check for new / added / trimmed positions
  for (const [, h] of currentMap) {
    const prevShares = prevMap.get(h.cusip) ?? null;
    let action: FundActivity["action"];
    let changePct = 0;

    if (prevShares === null) {
      action = "new";
      changePct = 100;
    } else if (h.shares > prevShares * 1.05) {
      action = "add";
      changePct = prevShares > 0 ? ((h.shares - prevShares) / prevShares) * 100 : 100;
    } else if (h.shares < prevShares * 0.95) {
      action = "trim";
      changePct = prevShares > 0 ? ((h.shares - prevShares) / prevShares) * 100 : -100;
    } else {
      action = "hold";
      changePct = 0;
    }

    activities.push({
      fund,
      cik,
      filedDate: current.filedDate,
      periodOfReport: current.periodOfReport,
      ticker: h.cusip, // will be resolved to ticker via CUSIP lookup if possible
      issuer: h.issuer,
      action,
      changePct: Math.round(changePct),
      currentShares: h.shares,
      previousShares: prevShares ?? 0,
      valueThousands: h.valueThousands,
    });
  }

  // Check for exits
  previous?.holdings.forEach((h) => {
    if (!currentMap.has(h.cusip)) {
      activities.push({
        fund,
        cik,
        filedDate: current.filedDate,
        periodOfReport: current.periodOfReport,
        ticker: h.cusip,
        issuer: h.issuer,
        action: "exit",
        changePct: -100,
        currentShares: 0,
        previousShares: h.shares,
        valueThousands: 0,
      });
    }
  });

  return activities;
}
