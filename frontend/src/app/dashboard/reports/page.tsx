
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle, ArrowDownRight, ArrowUpRight, Clock3,
  FileWarning, IndianRupee, RefreshCw, ShieldCheck, Wallet,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { apiRequest } from "@/lib/api";

type Reason = {
  reason: string;
  claim_count: number;
  amount: number;
};

type CFOReport = {
  total_claims: number;
  pending_approvals: number;
  query_claims: number;
  settled_claims: number;
  total_claim_value: number;
  approved_value: number;
  pending_value: number;
  deduction_value: number | null;
  average_discharge_hours: number | null;
  same_day_query_rate: number | null;
  deductions_by_reason: Reason[];
};

const money = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);

function Metric({
  title, value, caption, icon: Icon,
}: {
  title: string;
  value: string;
  caption: string;
  icon: typeof Wallet;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{title}</p>
        <div className="rounded-xl bg-[#edf5ef] p-2.5 text-[#287653]">
          <Icon size={18} />
        </div>
      </div>
      <p className="mt-4 text-2xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{caption}</p>
    </div>
  );
}

export default function CFOReportsPage() {
  const router = useRouter();
  const { token, loading, hasRole } = useAuth();

  const [report, setReport] = useState<CFOReport | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState("");

  const loadReport = useCallback(async () => {
    if (!token) return;

    setLoadingData(true);
    setError("");

    try {
      const data = await apiRequest<CFOReport>("/reports/cfo/overview", {}, token);
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load financial reports.");
    } finally {
      setLoadingData(false);
    }
  }, [token]);

  useEffect(() => {
    if (!loading && !hasRole("CFO")) {
      router.replace("/dashboard");
    }
  }, [loading, hasRole, router]);

  useEffect(() => {
    if (!loading && hasRole("CFO") && token) {
      void loadReport();
    }
  }, [loading, hasRole, token, loadReport]);

  if (loading || !hasRole("CFO")) {
    return <div className="p-8 text-sm text-slate-500">Loading finance workspace...</div>;
  }

  const maxReasonAmount = Math.max(
    1,
    ...(report?.deductions_by_reason || []).map((item) => item.amount),
  );

  return (
    <main className="min-h-screen bg-[#f7f9f7] px-4 py-6 text-slate-900 sm:px-8 sm:py-9">
      <div className="mx-auto max-w-6xl space-y-7">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-[#287653]">
              <ShieldCheck size={17} /> Finance & operations
            </div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Executive overview
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Claims performance, approval exposure and deduction trends.
            </p>
          </div>
          <button
            onClick={loadReport}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium hover:bg-slate-50"
          >
            <RefreshCw size={15} /> Refresh data
          </button>
        </header>

        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle size={17} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        {loadingData ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
            Loading executive reports...
          </div>
        ) : !report ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
            No report data is available yet.
          </div>
        ) : (
          <>
            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Metric
                title="Total claims"
                value={report.total_claims.toLocaleString("en-IN")}
                caption="Claims in the reporting dataset"
                icon={FileWarning}
              />
              <Metric
                title="Pending approvals"
                value={report.pending_approvals.toLocaleString("en-IN")}
                caption={`${money(report.pending_value)} awaiting decisions`}
                icon={Clock3}
              />
              <Metric
                title="Total claim value"
                value={money(report.total_claim_value)}
                caption={`${money(report.approved_value)} approved`}
                icon={IndianRupee}
              />
              <Metric
                title="Query claims"
                value={report.query_claims.toLocaleString("en-IN")}
                caption="Claims requiring insurer response"
                icon={AlertCircle}
              />
            </section>

            <section className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="font-semibold">Financial exposure</h2>
                    <p className="mt-1 text-xs text-slate-500">
                      Current claim values in the reporting dataset
                    </p>
                  </div>
                  <Wallet className="text-[#287653]" size={20} />
                </div>

                <div className="mt-7 space-y-5">
                  <div>
                    <div className="mb-2 flex justify-between text-sm">
                      <span className="text-slate-500">Approved value</span>
                      <strong>{money(report.approved_value)}</strong>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-[#287653]"
                        style={{
                          width: `${Math.min(100, report.total_claim_value > 0
                            ? report.approved_value / report.total_claim_value * 100 : 0)}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 flex justify-between text-sm">
                      <span className="text-slate-500">Pending value</span>
                      <strong>{money(report.pending_value)}</strong>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-amber-500"
                        style={{
                          width: `${Math.min(100, report.total_claim_value > 0
                            ? report.pending_value / report.total_claim_value * 100 : 0)}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Settled claims</span>
                      <strong>{report.settled_claims.toLocaleString("en-IN")}</strong>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
                <h2 className="font-semibold">Operational indicators</h2>
                <p className="mt-1 text-xs text-slate-500">Current measured performance</p>

                <div className="mt-5 space-y-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-slate-500">Average discharge approval</p>
                      <p className="mt-1 text-2xl font-semibold">
                        {report.average_discharge_hours == null
                          ? "—" : `${report.average_discharge_hours.toFixed(1)} hrs`}
                      </p>
                    </div>
                    <ArrowDownRight className="text-amber-600" size={19} />
                  </div>
                  <div className="h-px bg-slate-100" />
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-slate-500">Queries answered same day</p>
                      <p className="mt-1 text-2xl font-semibold">
                        {report.same_day_query_rate == null
                          ? "—" : `${report.same_day_query_rate.toFixed(1)}%`}
                      </p>
                    </div>
                    <ArrowUpRight className="text-[#287653]" size={19} />
                  </div>
                  <div className="h-px bg-slate-100" />
                  <div>
                    <p className="text-sm text-slate-500">Recorded deductions</p>
                    <p className="mt-1 text-2xl font-semibold">
                      {report.deduction_value == null
                        ? "Not recorded" : money(report.deduction_value)}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold">Deductions by reason</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Recorded deduction reasons and their financial impact
                  </p>
                </div>
                <span className="rounded-full bg-[#edf5ef] px-3 py-1 text-xs font-medium text-[#287653]">
                  {report.deductions_by_reason.length} reasons
                </span>
              </div>

              {report.deductions_by_reason.length === 0 ? (
                <div className="mt-6 rounded-xl bg-slate-50 p-6 text-center">
                  <p className="text-sm font-medium text-slate-700">
                    No deduction records available
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Deduction reasons will appear here once they are recorded against claims.
                  </p>
                </div>
              ) : (
                <div className="mt-6 space-y-5">
                  {report.deductions_by_reason.map((item) => (
                    <div key={item.reason}>
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                        <div>
                          <span className="font-medium">{item.reason}</span>
                          <span className="ml-2 text-xs text-slate-400">
                            {item.claim_count} claims
                          </span>
                        </div>
                        <strong>{money(item.amount)}</strong>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-[#287653]"
                          style={{ width: `${item.amount / maxReasonAmount * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <p className="text-xs leading-5 text-slate-400">
              Reports reflect records available in ClaimStack. Missing deduction or
              turnaround records are shown as unavailable, not estimated.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
