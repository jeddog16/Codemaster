"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Sale = {
  id: string;
  time: string;
  rep: string;
  customer: string;
  product: string;
  amount: number;
  stage: string;
  createdDate: string;
};

type SalesApiError = {
  error?: string;
  message?: string;
};

const refreshIntervalMs = 30_000;

const demoSales: Sale[] = [
  {
    id: "demo-006-1",
    time: "10:28",
    rep: "Reilly Baker",
    customer: "Riverland Ag Storage Upgrade",
    product: "18.0m x 36.0m x 5.7m",
    amount: 101081,
    stage: "Closed Won",
    createdDate: new Date().toISOString(),
  },
  {
    id: "demo-006-2",
    time: "09:46",
    rep: "Karina Wills",
    customer: "North Coast Machinery Shed",
    product: "15.0m x 30.0m x 5.0m",
    amount: 84250,
    stage: "Closed Won",
    createdDate: new Date(Date.now() - 42 * 60 * 1000).toISOString(),
  },
  {
    id: "demo-006-3",
    time: "08:57",
    rep: "Jed Arnold",
    customer: "Western Downs Workshop",
    product: "12.0m x 24.0m x 4.8m",
    amount: 63790,
    stage: "Closed Won",
    createdDate: new Date(Date.now() - 91 * 60 * 1000).toISOString(),
  },
];

const quotes = [
  "Build trust first. The building follows.",
  "Every quote is a chance to make the hard yards easier.",
  "Strong sheds. Strong standards. Strong follow-up.",
  "Win the day one useful conversation at a time.",
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatLastUpdated(date: Date | null) {
  if (!date) {
    return "Not updated yet";
  }

  return new Intl.DateTimeFormat("en-AU", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

function isSalesArray(payload: unknown): payload is Sale[] {
  return Array.isArray(payload);
}

export default function Home() {
  const [sales, setSales] = useState<Sale[]>(demoSales);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usingDemoData, setUsingDemoData] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const quoteOfTheDay = useMemo(() => {
    const dayKey = new Date().toISOString().slice(0, 10);
    const quoteIndex = [...dayKey].reduce((total, char) => total + char.charCodeAt(0), 0) % quotes.length;
    return quotes[quoteIndex];
  }, []);

  const fetchSales = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch("/api/sales", { cache: "no-store" });
      const payload: unknown = await response.json();

      if (!response.ok) {
        const apiError = payload as SalesApiError;
        throw new Error(apiError.message || "Salesforce returned an error.");
      }

      if (!isSalesArray(payload)) {
        throw new Error("Salesforce response was not in the expected sales-feed format.");
      }

      setSales(payload);
      setUsingDemoData(false);
      setLastUpdated(new Date());
    } catch (fetchError) {
      setSales(demoSales);
      setUsingDemoData(true);
      setError(fetchError instanceof Error ? fetchError.message : "Unable to load Salesforce sales.");
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSales();
    const interval = window.setInterval(fetchSales, refreshIntervalMs);
    return () => window.clearInterval(interval);
  }, [fetchSales]);

  const todayTotal = useMemo(() => sales.reduce((total, sale) => total + sale.amount, 0), [sales]);
  const bestSale = useMemo(
    () => sales.reduce<Sale | null>((best, sale) => (!best || sale.amount > best.amount ? sale : best), null),
    [sales],
  );

  return (
    <main className="min-h-screen bg-[#f4f4f1] text-black">
      <section className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-4 px-3 py-4 sm:px-5 lg:px-6">
        <header className="overflow-hidden rounded-3xl bg-black text-white shadow-2xl shadow-black/20">
          <div className="h-2 bg-[#FF8200]" />
          <div className="space-y-5 p-5 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.32em] text-[#FF8200]">NOW BUILDINGS</p>
                <h1 className="mt-2 text-4xl font-black uppercase leading-none tracking-[-0.05em] sm:text-5xl">
                  Live Sales Wall
                </h1>
                <p className="mt-2 text-sm font-semibold uppercase tracking-[0.18em] text-white/70">
                  Salesforce side dashboard
                </p>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 px-3 py-2 text-right">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">Refresh</p>
                <p className="text-sm font-black text-[#FF8200]">30 sec</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-white/70">
              <span className="h-2 w-2 rounded-full bg-[#FF8200] shadow-[0_0_18px_#FF8200]" />
              <span>Last updated {formatLastUpdated(lastUpdated)}</span>
              {loading ? <span className="rounded-full bg-white/10 px-2 py-1 text-white">Loading live feed</span> : null}
              {usingDemoData ? <span className="rounded-full bg-[#FF8200] px-2 py-1 text-black">Demo fallback</span> : null}
            </div>
          </div>
        </header>

        {error ? (
          <div className="rounded-2xl border-2 border-[#FF8200] bg-white p-4 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#FF8200]">Salesforce connection notice</p>
            <p className="mt-2 text-sm font-semibold text-black/75">{error}</p>
            <p className="mt-1 text-xs text-black/50">Showing demo sales so the dashboard remains usable in local development.</p>
          </div>
        ) : null}

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <article className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-black/45">Today&apos;s total sales value</p>
            <p className="mt-3 text-4xl font-black tracking-[-0.05em] text-black">{formatCurrency(todayTotal)}</p>
            <div className="mt-4 h-2 rounded-full bg-black">
              <div className="h-2 w-3/4 rounded-full bg-[#FF8200]" />
            </div>
          </article>

          <article className="rounded-3xl bg-black p-5 text-white shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-white/45">Number of sales today</p>
            <p className="mt-3 text-5xl font-black tracking-[-0.06em] text-[#FF8200]">{sales.length}</p>
            <p className="mt-3 text-sm font-semibold text-white/65">Closed-won opportunities from today&apos;s Salesforce feed.</p>
          </article>
        </section>

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <article className="rounded-3xl bg-black p-5 text-white shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#FF8200]">Best sale of the day</p>
            {bestSale ? (
              <div className="mt-4 space-y-2">
                <p className="text-3xl font-black tracking-[-0.04em]">{formatCurrency(bestSale.amount)}</p>
                <p className="text-base font-black uppercase leading-tight">{bestSale.customer}</p>
                <p className="text-sm font-semibold text-white/60">{bestSale.rep}</p>
              </div>
            ) : (
              <p className="mt-4 text-sm text-white/60">No closed-won sales yet today.</p>
            )}
          </article>

          <article className="rounded-3xl border-l-8 border-[#FF8200] bg-white p-5 shadow-sm ring-1 ring-black/5">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-black/45">Quote of the day</p>
            <blockquote className="mt-4 text-2xl font-black uppercase leading-tight tracking-[-0.04em] text-black">
              “{quoteOfTheDay}”
            </blockquote>
          </article>
        </section>

        <section className="flex-1 rounded-3xl bg-white p-3 shadow-sm ring-1 ring-black/5 sm:p-4">
          <div className="mb-3 flex items-center justify-between gap-3 px-1">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#FF8200]">Live recent sales feed</p>
              <h2 className="text-2xl font-black uppercase tracking-[-0.04em]">Newest first</h2>
            </div>
            <span className="rounded-full bg-black px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-white">
              {loading ? "Syncing" : "Live"}
            </span>
          </div>

          <div className="space-y-3">
            {sales.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-black/20 bg-[#f4f4f1] p-5 text-sm font-semibold text-black/55">
                No closed-won Salesforce opportunities have been created today yet.
              </div>
            ) : null}

            {sales.map((sale) => (
              <article key={sale.id} className="rounded-2xl border border-black/10 bg-[#f4f4f1] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[#FF8200] px-2 py-1 text-xs font-black text-black">{sale.time}</span>
                      <span className="text-xs font-black uppercase tracking-[0.18em] text-black/45">{sale.stage}</span>
                    </div>
                    <h3 className="mt-3 text-lg font-black uppercase leading-tight tracking-[-0.03em]">{sale.customer}</h3>
                    {sale.product ? <p className="mt-1 text-sm font-bold text-black/60">{sale.product}</p> : null}
                    <p className="mt-2 text-xs font-black uppercase tracking-[0.16em] text-black/45">Rep: {sale.rep}</p>
                  </div>
                  <p className="shrink-0 text-right text-xl font-black tracking-[-0.04em]">{formatCurrency(sale.amount)}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
