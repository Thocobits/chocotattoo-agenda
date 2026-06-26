"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/utils";

interface ReportData {
  period: string;
  totalTattoos: number;
  totalRevenue: number;
  artistEarnings: number;
  studioEarnings: number;
  byArtist?: Array<{
    name: string;
    count: number;
    artistEarning: number;
    studioEarning: number;
  }>;
}

export function ReportsClient({
  initialData,
  isAdmin,
}: {
  initialData: ReportData;
  isAdmin: boolean;
}) {
  const [period, setPeriod] = useState<"week" | "month">("month");
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);

  async function loadReport(p: "week" | "month") {
    setPeriod(p);
    setLoading(true);
    const res = await fetch(`/api/reports?period=${p}`);
    const report = await res.json();
    setData(report);
    setLoading(false);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Relatórios</h1>
          <p className="text-[var(--muted)]">
            {isAdmin ? "Ganhos do estúdio" : "Seus ganhos e tatuagens"}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => loadReport("week")}
            className={period === "week" ? "btn-primary" : "btn-secondary"}
            disabled={loading}
          >
            Semanal
          </button>
          <button
            onClick={() => loadReport("month")}
            className={period === "month" ? "btn-primary" : "btn-secondary"}
            disabled={loading}
          >
            Mensal
          </button>
        </div>
      </div>

      <p className="text-sm text-[var(--muted)] mb-4">{data.period}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="card">
          <p className="text-sm text-[var(--muted)]">Tatuagens</p>
          <p className="text-2xl font-bold">{data.totalTattoos}</p>
        </div>
        <div className="card">
          <p className="text-sm text-[var(--muted)]">Faturamento Total</p>
          <p className="text-2xl font-bold">{formatCurrency(data.totalRevenue)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-[var(--muted)]">
            {isAdmin ? "Ganhos Tatuadores" : "Seus Ganhos"}
          </p>
          <p className="text-2xl font-bold text-green-400">
            {formatCurrency(data.artistEarnings)}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-[var(--muted)]">Ganhos Studio</p>
          <p className="text-2xl font-bold text-amber-400">
            {formatCurrency(data.studioEarnings)}
          </p>
        </div>
      </div>

      {isAdmin && data.byArtist && data.byArtist.length > 0 && (
        <div className="card overflow-hidden p-0">
          <div className="p-4 border-b border-[var(--card-border)]">
            <h2 className="font-semibold">Por Tatuador</h2>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--card-border)] text-left text-sm text-[var(--muted)]">
                <th className="p-4">Tatuador</th>
                <th className="p-4">Tatuagens</th>
                <th className="p-4">Ganho Tatuador</th>
                <th className="p-4">Ganho Studio</th>
              </tr>
            </thead>
            <tbody>
              {data.byArtist.map((a) => (
                <tr
                  key={a.name}
                  className="border-b border-[var(--card-border)]"
                >
                  <td className="p-4 font-medium">{a.name}</td>
                  <td className="p-4">{a.count}</td>
                  <td className="p-4 text-green-400">
                    {formatCurrency(a.artistEarning)}
                  </td>
                  <td className="p-4 text-amber-400">
                    {formatCurrency(a.studioEarning)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
