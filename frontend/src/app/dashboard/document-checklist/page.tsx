"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  FileCheck2,
  FileText,
  LoaderCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const API =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

type ChecklistItem = {
  id: string;
  document_id?: string | null;
  status?: string;
  is_verified?: boolean;
  rule?: {
    document_type?: string;
    is_mandatory?: boolean;
  };
};

type Claim = {
  id: string;
  claim_number?: string;
  status?: string;
  procedure_name?: string;
  patient?: { full_name?: string; name?: string };
  admission?: { procedure_name?: string; procedure?: string };
  insurer?: { name?: string };
  insurer_name?: string;
  checklist?: ChecklistItem[];
  checklist_error?: string;
};

function getArray(value: any): any[] {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.results)) return value.results;
  return [];
}

async function request(
  path: string,
  token: string,
  options: RequestInit = {}
) {
  const response = await fetch(`${API}/api/v1${path}`, {
    ...options,
    headers: {
      ...(options.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(
      error?.detail || `Request failed (${response.status})`
    );
  }

  if (response.status === 204) return null;
  return response.json();
}

function getCounts(items: ChecklistItem[] = []) {
  const mandatory = items.filter(
    (item) => item.rule?.is_mandatory !== false
  );

  const verified = items.filter((item) => item.is_verified);
  const uploaded = items.filter(
    (item) => Boolean(item.document_id) && !item.is_verified
  );
  const missing = mandatory.filter(
    (item) => !item.document_id && !item.is_verified
  );

  return {
    total: items.length,
    verified: verified.length,
    uploaded: uploaded.length,
    missing: missing.length,
  };
}

export default function DocumentChecklistPage() {
  const { user, token, loading: authLoading, hasRole } = useAuth();

  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [refreshKey, setRefreshKey] = useState(0);
  const [generating, setGenerating] = useState<string | null>(null);

  const canAccess =
    hasRole("Desk Executive") || hasRole("Desk Head");

  const loadClaims = useCallback(async () => {
    if (!token || !canAccess) return;

    setLoading(true);
    setError("");

    try {
      const response = await request(
        "/claims/?skip=0&limit=100",
        token
      );

      const claimList = getArray(response) as Claim[];

      const enriched = await Promise.all(
        claimList.map(async (claim) => {
          try {
            const checklist = await request(
              `/claims/${claim.id}/checklist`,
              token
            );

            return {
              ...claim,
              checklist: getArray(checklist) as ChecklistItem[],
            };
          } catch (err) {
            return {
              ...claim,
              checklist: [],
              checklist_error:
                err instanceof Error ? err.message : "Unable to load checklist",
            };
          }
        })
      );

      setClaims(enriched);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load claims"
      );
    } finally {
      setLoading(false);
    }
  }, [token, canAccess]);

  useEffect(() => {
    if (!authLoading && token && canAccess) {
      loadClaims();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [authLoading, token, canAccess, loadClaims, refreshKey]);

  async function generateChecklist(claimId: string) {
    if (!token) return;

    setGenerating(claimId);
    setError("");

    try {
      await request(
        `/claims/${claimId}/checklist/generate`,
        token,
        { method: "POST" }
      );
      setRefreshKey((value) => value + 1);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not generate checklist"
      );
    } finally {
      setGenerating(null);
    }
  }

  const filteredClaims = useMemo(() => {
    return claims.filter((claim) => {
      const items = claim.checklist || [];
      const counts = getCounts(items);

      const patient =
        claim.patient?.full_name ||
        claim.patient?.name ||
        "";

      const claimNumber = claim.claim_number || "";
      const procedure =
        claim.procedure_name ||
        claim.admission?.procedure_name ||
        claim.admission?.procedure ||
        "";

      const searchMatch = [
        claimNumber,
        patient,
        procedure,
        claim.insurer_name || claim.insurer?.name || "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase());

      const filterMatch =
        filter === "ALL" ||
        (filter === "MISSING" && counts.missing > 0) ||
        (filter === "PENDING" &&
          counts.missing === 0 &&
          counts.verified < counts.total) ||
        (filter === "COMPLETE" &&
          counts.total > 0 &&
          counts.verified === counts.total);

      return searchMatch && filterMatch;
    });
  }, [claims, search, filter]);

  const totals = useMemo(() => {
    return claims.reduce(
      (acc, claim) => {
        const counts = getCounts(claim.checklist);
        acc.claims += 1;
        acc.missing += counts.missing;
        acc.uploaded += counts.uploaded;
        acc.verified += counts.verified;
        return acc;
      },
      { claims: 0, missing: 0, uploaded: 0, verified: 0 }
    );
  }, [claims]);

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f8f5]">
        <LoaderCircle className="animate-spin text-[#24483c]" size={28} />
      </div>
    );
  }

  if (!user || !canAccess) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f8f5] p-6">
        <div className="max-w-md rounded-2xl border border-[#e9ece7] bg-white p-8 text-center">
          <ShieldCheck className="mx-auto text-[#b66a4d]" size={30} />
          <h1 className="mt-4 text-lg font-semibold text-[#1d3029]">
            Access restricted
          </h1>
          <p className="mt-2 text-sm text-[#77827b]">
            This workspace is available to Desk Executives and Desk Heads.
          </p>
          <Link
            href="/dashboard"
            className="mt-5 inline-flex rounded-xl bg-[#24483c] px-4 py-2.5 text-sm font-semibold text-white"
          >
            Back to dashboard
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f8f5] px-5 py-8 text-[#1d3029] sm:px-8">
      <div className="mx-auto max-w-[1440px]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Link
              href="/dashboard"
              className="text-xs text-[#829087] hover:text-[#24483c]"
            >
              Workspace / Dashboard
            </Link>
            <p className="mt-5 text-xs font-medium tracking-[0.14em] text-[#829087]">
              DOCUMENT OPERATIONS
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.05em]">
              Document checklist
            </h1>
            <p className="mt-2 max-w-xl text-sm text-[#7b8780]">
              Review missing, uploaded and verified documents across claims
              before they are submitted to insurers.
            </p>
          </div>

          <button
            onClick={() => setRefreshKey((value) => value + 1)}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#e3e8e1] bg-white px-4 text-xs font-semibold text-[#52685b] hover:bg-[#f8faf7]"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>

        {error && (
          <div className="mt-6 flex items-start gap-3 rounded-xl border border-[#f0d9cf] bg-[#fff8f4] p-4 text-sm text-[#a65d43]">
            <AlertCircle className="mt-0.5 shrink-0" size={17} />
            <span>{error}</span>
          </div>
        )}

        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Claims reviewed",
              value: totals.claims,
              icon: FileText,
              color: "bg-[#eaf0ed] text-[#47705b]",
            },
            {
              label: "Missing mandatory documents",
              value: totals.missing,
              icon: AlertCircle,
              color: "bg-[#f8eae2] text-[#b66a4d]",
            },
            {
              label: "Uploaded · awaiting verification",
              value: totals.uploaded,
              icon: Upload,
              color: "bg-[#e9edf8] text-[#6579a9]",
            },
            {
              label: "Verified documents",
              value: totals.verified,
              icon: CheckCircle2,
              color: "bg-[#eaf3e9] text-[#568064]",
            },
          ].map((metric) => {
            const Icon = metric.icon;
            return (
              <div
                key={metric.label}
                className="rounded-2xl border border-[#e9ece7] bg-white p-5"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-[#77827b]">{metric.label}</p>
                  <span className={`rounded-xl p-2.5 ${metric.color}`}>
                    <Icon size={17} />
                  </span>
                </div>
                <p className="mt-5 text-3xl font-semibold tracking-[-0.05em]">
                  {metric.value}
                </p>
              </div>
            );
          })}
        </div>

        <section className="mt-7 overflow-hidden rounded-2xl border border-[#e9ece7] bg-white">
          <div className="flex flex-col gap-4 border-b border-[#edf0eb] p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-sm font-semibold">Claim document status</h2>
              <p className="mt-1 text-xs text-[#89918d]">
                Checklist rules are evaluated for each claim.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex h-10 items-center gap-2 rounded-xl border border-[#e5e9e3] px-3 sm:w-64">
                <Search size={15} className="text-[#89918d]" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search claim or patient..."
                  className="w-full bg-transparent text-xs outline-none placeholder:text-[#a0a8a2]"
                />
              </div>

              <select
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                className="h-10 rounded-xl border border-[#e5e9e3] bg-white px-3 text-xs text-[#52685b] outline-none"
              >
                <option value="ALL">All claims</option>
                <option value="MISSING">Missing documents</option>
                <option value="PENDING">Awaiting verification</option>
                <option value="COMPLETE">Checklist complete</option>
              </select>
            </div>
          </div>

          {filteredClaims.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <ClipboardList className="mx-auto text-[#a0aaa2]" size={30} />
              <p className="mt-3 text-sm font-semibold">
                No matching claims found
              </p>
              <p className="mt-1 text-xs text-[#89918d]">
                Try changing the search or filter.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#edf0eb]">
              {filteredClaims.map((claim) => {
                const items = claim.checklist || [];
                const counts = getCounts(items);
                const patient =
                  claim.patient?.full_name ||
                  claim.patient?.name ||
                  "Patient details unavailable";
                const procedure =
                  claim.procedure_name ||
                  claim.admission?.procedure_name ||
                  claim.admission?.procedure ||
                  "Procedure not specified";
                const insurer =
                  claim.insurer_name ||
                  claim.insurer?.name ||
                  "Insurer not specified";

                const complete =
                  counts.total > 0 &&
                  counts.verified === counts.total;

                return (
                  <div key={claim.id} className="p-5">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-semibold">
                            {claim.claim_number || claim.id}
                          </span>
                          <span className="rounded-full bg-[#f2f4f0] px-2.5 py-1 text-[10px] text-[#718078]">
                            {claim.status || "Status unavailable"}
                          </span>
                          {complete && (
                            <span className="rounded-full bg-[#eaf3e9] px-2.5 py-1 text-[10px] font-medium text-[#568064]">
                              Checklist complete
                            </span>
                          )}
                          {counts.missing > 0 && (
                            <span className="rounded-full bg-[#fdf0e9] px-2.5 py-1 text-[10px] font-medium text-[#b66a4d]">
                              {counts.missing} missing
                            </span>
                          )}
                        </div>

                        <h3 className="mt-2 text-sm font-semibold">{patient}</h3>
                        <p className="mt-1 text-xs text-[#89918d]">
                          {procedure} · {insurer}
                        </p>

                        {claim.checklist_error ? (
                          <p className="mt-3 text-xs text-[#b66a4d]">
                            Checklist could not be loaded: {claim.checklist_error}
                          </p>
                        ) : items.length === 0 ? (
                          <div className="mt-4 rounded-xl border border-dashed border-[#e1e6df] bg-[#fafbf9] p-4">
                            <p className="text-xs text-[#77827b]">
                              No checklist generated for this claim yet.
                            </p>
                            <button
                              onClick={() => generateChecklist(claim.id)}
                              disabled={generating === claim.id}
                              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#24483c] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                            >
                              {generating === claim.id ? (
                                <LoaderCircle className="animate-spin" size={14} />
                              ) : (
                                <ClipboardList size={14} />
                              )}
                              Generate checklist
                            </button>
                          </div>
                        ) : (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {items.map((item) => {
                              const missing =
                                item.rule?.is_mandatory !== false &&
                                !item.document_id &&
                                !item.is_verified;

                              const statusText = item.is_verified
                                ? "Verified"
                                : item.document_id
                                  ? "Uploaded"
                                  : missing
                                    ? "Missing"
                                    : "Optional";

                              return (
                                <span
                                  key={item.id}
                                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[10px] ${
                                    item.is_verified
                                      ? "border-[#dce9dc] bg-[#f1f7f0] text-[#568064]"
                                      : missing
                                        ? "border-[#f0dfd5] bg-[#fff8f4] text-[#b66a4d]"
                                        : "border-[#e5e9e3] bg-[#fafbf9] text-[#718078]"
                                  }`}
                                >
                                  {item.is_verified ? (
                                    <CheckCircle2 size={12} />
                                  ) : missing ? (
                                    <AlertCircle size={12} />
                                  ) : (
                                    <FileCheck2 size={12} />
                                  )}
                                  {item.rule?.document_type || "Document"} · {statusText}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      <div className="flex shrink-0 flex-wrap items-center gap-3 xl:justify-end">
                        <div className="text-right">
                          <p className="text-xs font-semibold">
                            {counts.verified}/{counts.total}
                          </p>
                          <p className="mt-1 text-[10px] text-[#89918d]">
                            Verified
                          </p>
                        </div>
                        <Link
                          href={`/dashboard/claims/${claim.id}/documents`}
                          className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#e2e8e1] px-3 text-xs font-semibold text-[#42634f] transition hover:bg-[#f5f8f4]"
                        >
                          Open claim
                          <ChevronRight size={14} />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#edf0eb] px-5 py-3">
            <p className="text-[10px] text-[#929c95]">
              Showing {filteredClaims.length} of {claims.length} claims
            </p>
            <p className="text-[10px] text-[#929c95]">
              Data loaded from the claims and checklist APIs
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}