
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  LoaderCircle,
  LogOut,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  X,
} from "lucide-react";

import { apiRequest } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

interface Claim {
  id: string;
  claim_number: string;
  admission_id: string;
  insurer_id: string;
  tpa_id: string | null;
  status: string;
  requested_amount: number | string;
  approved_amount: number | string | null;
  created_at: string;
}

const PAGE_SIZE = 10;

const statusStyles: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700 border-slate-200",
  PRE_AUTH_SENT: "bg-indigo-50 text-indigo-700 border-indigo-200",
  QUERY: "bg-orange-50 text-orange-700 border-orange-200",
  APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  ENHANCEMENT: "bg-rose-50 text-rose-700 border-rose-200",
  REJECTED: "bg-red-50 text-red-700 border-red-200",
  SETTLED: "bg-teal-50 text-teal-700 border-teal-200",
};

function formatAmount(value: number | string | null) {
  if (value === null || value === undefined) return "—";

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function formatStatus(status: string) {
  return status.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (c) =>
    c.toUpperCase()
  );
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export default function AllClaimsPage() {
  const router = useRouter();
  const { user, token, loading, logout, hasRole } = useAuth();

  const [claims, setClaims] = useState<Claim[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);

  const isDeskRole =
    hasRole("Desk Executive") || hasRole("Desk Head");

  const fetchClaims = useCallback(async () => {
    if (!token) return;

    setFetching(true);
    setError("");

    try {
      const result = await apiRequest<Claim[]>(
        "/claims/?skip=0&limit=100",
        {},
        token
      );

      setClaims(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load claims."
      );
    } finally {
      setFetching(false);
    }
  }, [token]);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!loading && user && !isDeskRole) {
      router.replace("/dashboard");
    }
  }, [loading, user, isDeskRole, router]);

  useEffect(() => {
    if (token && isDeskRole) {
      fetchClaims();
    }
  }, [token, isDeskRole, fetchClaims]);

  const statuses = useMemo(
    () => [...new Set(claims.map((claim) => claim.status))].sort(),
    [claims]
  );

  const filteredClaims = useMemo(() => {
    const term = search.trim().toLowerCase();

    return claims.filter((claim) => {
      const matchesSearch =
        !term ||
        claim.claim_number.toLowerCase().includes(term) ||
        claim.admission_id.toLowerCase().includes(term) ||
        claim.insurer_id.toLowerCase().includes(term) ||
        (claim.tpa_id ?? "").toLowerCase().includes(term);

      const matchesStatus =
        statusFilter === "ALL" || claim.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [claims, search, statusFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredClaims.length / PAGE_SIZE)
  );

  const safePage = Math.min(currentPage, totalPages);

  const visibleClaims = filteredClaims.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  function handleLogout() {
    logout();
    router.replace("/");
  }

  function openClaim(claimId: string) {
    router.push(`/dashboard/claims/${claimId}`);
  }

  if (loading || !user || !isDeskRole) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f8f5]">
        <LoaderCircle className="animate-spin text-[#24483c]" size={28} />
      </div>
    );
  }

  const initials = user.full_name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <main className="min-h-screen bg-[#f7f8f5] text-[#1d3029]">
      <div className="flex min-h-screen">
        {/* Desktop sidebar */}
        <aside className="hidden w-[248px] shrink-0 border-r border-[#e9ece7] bg-white px-5 py-6 lg:flex lg:flex-col">
          <a href="/dashboard" className="flex items-center gap-3 px-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-[#203c35] text-white">
              <ShieldCheck size={21} />
            </div>
            <div>
              <p className="text-[17px] font-semibold tracking-[-0.04em]">
                ClaimFlow
              </p>
              <p className="text-[10px] tracking-[0.13em] text-[#89918d]">
                HOSPITAL WORKSPACE
              </p>
            </div>
          </a>

          <p className="mt-11 px-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#89918d]">
            Workspace
          </p>

          <nav className="mt-4 space-y-1">
            <a
              href="/dashboard"
              className="flex items-center gap-3 rounded-xl px-3 py-3 text-[13px] text-[#77827b] transition hover:bg-[#f6f8f5]"
            >
              <Activity size={17} />
              Overview
            </a>

            <a
              href="/dashboard/claims"
              className="flex items-center gap-3 rounded-xl bg-[#eaf1ed] px-3 py-3 text-[13px] font-semibold text-[#24483c]"
            >
              <FileText size={17} />
              All claims
            </a>
          </nav>

          <div className="mt-auto rounded-2xl bg-[#f3f5f0] p-4">
            <div className="flex items-center gap-2">
              <Activity size={15} className="text-[#557b68]" />
              <span className="text-xs font-semibold">Workspace status</span>
            </div>
            <p className="mt-2 text-xs leading-5 text-[#77827b]">
              Your claims workspace is connected to the live API.
            </p>
            <p className="mt-3 text-[10px] text-[#89918d]">
              ClaimFlow · Demo environment
            </p>
          </div>
        </aside>

        {/* Main workspace */}
        <section className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 flex min-h-[76px] items-center justify-between gap-3 border-b border-[#e9ece7] bg-[#f7f8f5]/95 px-4 backdrop-blur-xl sm:px-8">
            <div className="min-w-0">
              <p className="text-xs text-[#89918d]">
                Company A / Workspace
              </p>
              <p className="mt-1 text-sm font-semibold">
                Insurance operations
              </p>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#dce8e1] text-xs font-semibold text-[#365b49]">
                {initials}
              </div>

              <div className="hidden sm:block">
                <p className="text-xs font-semibold">{user.full_name}</p>
                <p className="text-[10px] text-[#89918d]">
                  {user.roles.join(" · ")}
                </p>
              </div>

              <button
                onClick={handleLogout}
                title="Sign out"
                aria-label="Sign out"
                className="rounded-xl border border-[#e5e9e3] bg-white p-2.5 text-[#64716a] transition hover:bg-[#f8eae2] hover:text-[#a96045]"
              >
                <LogOut size={17} />
              </button>
            </div>
          </header>

          <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-8 sm:py-8">
            <button
              onClick={() => router.push("/dashboard")}
              className="mb-6 inline-flex items-center gap-2 text-xs font-medium text-[#718078] transition hover:text-[#24483c]"
            >
              <ArrowLeft size={15} />
              Back to overview
            </button>

            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs font-medium text-[#829087]">
                  CLAIM MANAGEMENT
                </p>
                <h1 className="mt-2 text-[30px] font-semibold tracking-[-0.055em] sm:text-[36px]">
                  All claims
                </h1>
                <p className="mt-2 text-sm text-[#7b8780]">
                  Search, review and track insurance claims in one place.
                </p>
              </div>

              <button
                onClick={fetchClaims}
                disabled={fetching}
                className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-xl border border-[#e2e8e1] bg-white px-4 text-xs font-semibold text-[#365b49] transition hover:bg-[#f5f8f4] disabled:opacity-50 sm:self-auto"
              >
                <RefreshCw
                  size={14}
                  className={fetching ? "animate-spin" : ""}
                />
                Refresh
              </button>
            </div>

            {/* Summary */}
            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-[#e9ece7] bg-white p-4">
                <p className="text-xs text-[#89918d]">Loaded claims</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight">
                  {fetching ? "—" : claims.length}
                </p>
              </div>

              <div className="rounded-2xl border border-[#e9ece7] bg-white p-4">
                <p className="text-xs text-[#89918d]">Matching claims</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight">
                  {fetching ? "—" : filteredClaims.length}
                </p>
              </div>

              <div className="rounded-2xl border border-[#e9ece7] bg-white p-4">
                <p className="text-xs text-[#89918d]">Claim statuses</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight">
                  {fetching ? "—" : statuses.length}
                </p>
              </div>
            </div>

            {/* Search and filters */}
            <div className="mt-6 rounded-2xl border border-[#e9ece7] bg-white p-4 sm:p-5">
              <div className="flex flex-col gap-3 md:flex-row">
                <div className="flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-[#e8ece6] bg-[#fafbf9] px-3.5">
                  <Search size={17} className="shrink-0 text-[#89918d]" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search claim number, admission or insurer ID..."
                    className="h-11 min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-[#a0a8a2]"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch("")}
                      aria-label="Clear search"
                      className="text-[#89918d] hover:text-[#24483c]"
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>

                <div className="relative md:w-[220px]">
                  <SlidersHorizontal
                    size={15}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#89918d]"
                  />
                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                    className="h-11 w-full appearance-none rounded-xl border border-[#e8ece6] bg-white pl-10 pr-9 text-xs text-[#52635a] outline-none focus:border-[#9bb2a2]"
                  >
                    <option value="ALL">All statuses</option>
                    {statuses.map((status) => (
                      <option value={status} key={status}>
                        {formatStatus(status)}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={14}
                    className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[#89918d]"
                  />
                </div>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-red-800">
                    Could not load claims
                  </p>
                  <p className="mt-1 break-words text-xs text-red-700">
                    {error}
                  </p>
                </div>
                <button
                  onClick={fetchClaims}
                  className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg bg-white px-3 text-xs font-semibold text-red-700"
                >
                  <RefreshCw size={13} />
                  Try again
                </button>
              </div>
            )}

            {/* Claims table */}
            <div className="mt-6 overflow-hidden rounded-2xl border border-[#e9ece7] bg-white">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#edf0eb] px-5 py-5">
                <div>
                  <h2 className="text-sm font-semibold">Claims register</h2>
                  <p className="mt-1 text-xs text-[#89918d]">
                    Claim records retrieved from the hospital database.
                  </p>
                </div>
                <span className="rounded-full bg-[#eaf1ed] px-3 py-1 text-[10px] font-semibold text-[#527765]">
                  Live API
                </span>
              </div>

              {fetching ? (
                <div className="flex min-h-[260px] flex-col items-center justify-center gap-3">
                  <LoaderCircle
                    size={25}
                    className="animate-spin text-[#527765]"
                  />
                  <p className="text-xs text-[#89918d]">
                    Loading claims from server...
                  </p>
                </div>
              ) : !error && visibleClaims.length === 0 ? (
                <div className="flex min-h-[260px] flex-col items-center justify-center px-5 text-center">
                  <div className="rounded-2xl bg-[#f1f4ef] p-4 text-[#718b78]">
                    <FileText size={24} />
                  </div>
                  <p className="mt-4 text-sm font-semibold">
                    No claims found
                  </p>
                  <p className="mt-1 max-w-sm text-xs leading-5 text-[#89918d]">
                    Try changing your search or status filter. If this is a
                    new environment, there may not be any claim records yet.
                  </p>
                  {(search || statusFilter !== "ALL") && (
                    <button
                      onClick={() => {
                        setSearch("");
                        setStatusFilter("ALL");
                      }}
                      className="mt-4 text-xs font-semibold text-[#527765]"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {/* Desktop table */}
                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full min-w-[850px] text-left">
                      <thead>
                        <tr className="bg-[#fafbf9] text-[10px] uppercase tracking-[0.12em] text-[#929c95]">
                          <th className="px-5 py-4 font-medium">Claim</th>
                          <th className="px-4 py-4 font-medium">Admission ID</th>
                          <th className="px-4 py-4 font-medium">Insurer ID</th>
                          <th className="px-4 py-4 font-medium">Status</th>
                          <th className="px-4 py-4 text-right font-medium">
                            Requested
                          </th>
                          <th className="px-5 py-4 text-right font-medium">
                            Created
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleClaims.map((claim) => (
                          <tr
                            key={claim.id}
                            onClick={() => openClaim(claim.id)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                openClaim(claim.id);
                              }
                            }}
                            className="cursor-pointer border-t border-[#f0f2ee] transition hover:bg-[#eef4ef]"
                          >
                            <td className="px-5 py-4">
                              <p className="text-xs font-semibold text-[#294438]">
                                {claim.claim_number}
                              </p>
                              <p className="mt-1 text-[10px] text-[#929c95]">
                                Ref: {claim.id.slice(0, 8)}...
                              </p>
                            </td>
                            <td className="px-4 py-4 font-mono text-[11px] text-[#6f7c74]">
                              {claim.admission_id.slice(0, 8)}...
                            </td>
                            <td className="px-4 py-4 font-mono text-[11px] text-[#6f7c74]">
                              {claim.insurer_id.slice(0, 8)}...
                            </td>
                            <td className="px-4 py-4">
                              <span
                                className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-medium ${
                                  statusStyles[claim.status] ??
                                  "border-slate-200 bg-slate-50 text-slate-700"
                                }`}
                              >
                                {formatStatus(claim.status)}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-right text-xs font-semibold tabular-nums">
                              {formatAmount(claim.requested_amount)}
                            </td>
                            <td className="px-5 py-4 text-right text-xs text-[#77827b]">
                              {formatDate(claim.created_at)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile cards */}
                  <div className="divide-y divide-[#f0f2ee] md:hidden">
                    {visibleClaims.map((claim) => (
                      <article
                        key={claim.id}
                        onClick={() => openClaim(claim.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            openClaim(claim.id);
                          }
                        }}
                        className="cursor-pointer space-y-3 p-4 transition hover:bg-[#f5f8f4]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-[#294438]">
                              {claim.claim_number}
                            </p>
                            <p className="mt-1 text-[10px] text-[#929c95]">
                              Created {formatDate(claim.created_at)}
                            </p>
                          </div>
                          <span
                            className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-medium ${
                              statusStyles[claim.status] ??
                              "border-slate-200 bg-slate-50 text-slate-700"
                            }`}
                          >
                            {formatStatus(claim.status)}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-[10px] text-[#929c95]">
                              Requested amount
                            </p>
                            <p className="mt-1 text-xs font-semibold">
                              {formatAmount(claim.requested_amount)}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-[#929c95]">
                              Approved amount
                            </p>
                            <p className="mt-1 text-xs font-semibold">
                              {formatAmount(claim.approved_amount)}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-1.5 border-t border-[#f0f2ee] pt-3">
                          <p className="break-all text-[10px] text-[#89918d]">
                            Admission: {claim.admission_id}
                          </p>
                          <p className="break-all text-[10px] text-[#89918d]">
                            Insurer: {claim.insurer_id}
                          </p>
                        </div>
                      </article>
                    ))}
                  </div>
                </>
              )}

              {/* Pagination */}
              {!fetching && !error && filteredClaims.length > 0 && (
                <div className="flex flex-col gap-3 border-t border-[#edf0eb] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                  <p className="text-[10px] text-[#929c95]">
                    Showing{" "}
                    {(safePage - 1) * PAGE_SIZE + 1}–
                    {Math.min(safePage * PAGE_SIZE, filteredClaims.length)} of{" "}
                    {filteredClaims.length} matching claims
                  </p>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      onClick={() =>
                        setCurrentPage((page) => Math.max(1, page - 1))
                      }
                      disabled={safePage === 1}
                      aria-label="Previous page"
                      className="rounded-lg border border-[#e5e9e3] bg-white p-2 text-[#64716a] transition hover:bg-[#f5f8f4] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronLeft size={16} />
                    </button>

                    <span className="px-2 text-xs text-[#64716a]">
                      Page {safePage} of {totalPages}
                    </span>

                    <button
                      onClick={() =>
                        setCurrentPage((page) =>
                          Math.min(totalPages, page + 1)
                        )
                      }
                      disabled={safePage === totalPages}
                      aria-label="Next page"
                      className="rounded-lg border border-[#e5e9e3] bg-white p-2 text-[#64716a] transition hover:bg-[#f5f8f4] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <footer className="mt-8 flex flex-wrap items-center justify-between gap-2 border-t border-[#e6eae4] pt-5 text-[10px] text-[#929c95]">
              <span>ClaimFlow · Hospital Insurance Workspace</span>
              <span>Claim records from authenticated API</span>
            </footer>
          </div>
        </section>
      </div>
    </main>
  );
}
