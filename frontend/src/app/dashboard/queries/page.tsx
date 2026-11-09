"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  RefreshCw,
  MessageSquareText,
  Clock3,
  CheckCircle2,
  AlertCircle,
  FileText,
  ExternalLink,
  Filter,
  ArrowLeft,
  X,
  ChevronRight,
  IndianRupee,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

type RequestStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "QUERY"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED";

type ClaimRequest = {
  id: string;
  claim_id: string;
  claim_number: string;
  request_type: string;
  sequence_number: number;
  status: RequestStatus;
  requested_amount: number;
  approved_amount: number | null;
  insurer_reference: string | null;
  submitted_at: string | null;
  responded_at: string | null;
  created_at: string;
  updated_at: string;
};

const filters = [
  "ALL",
  "QUERY",
  "SUBMITTED",
  "APPROVED",
  "REJECTED",
  "DRAFT",
] as const;

function formatDate(value: string | null) {
  if (!value) return "Not available";

  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatMoney(value: number | null) {
  if (value === null || value === undefined) return "—";

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function statusStyle(status: string) {
  switch (status) {
    case "QUERY":
      return "border-[#e9c68d] bg-[#fff5e5] text-[#9a641d]";
    case "APPROVED":
      return "border-[#b8c9b8] bg-[#edf3eb] text-[#45634a]";
    case "REJECTED":
      return "border-[#e8b7ac] bg-[#fff0ec] text-[#a64d3d]";
    case "SUBMITTED":
      return "border-[#c9c2b7] bg-[#f2eee8] text-[#625c52]";
    case "CANCELLED":
      return "border-[#dedbd5] bg-[#f1efeb] text-[#77716a]";
    default:
      return "border-[#dedbd5] bg-[#f6f3ee] text-[#77716a]";
  }
}

function getErrorMessage(message: string) {
  try {
    const parsed = JSON.parse(message);
    return parsed.detail || message;
  } catch {
    return message;
  }
}

function StatCard({
  label,
  value,
  icon: Icon,
  description,
}: {
  label: string;
  value: number;
  icon: typeof FileText;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-[#e8e0d5] bg-white p-5 shadow-[0_3px_12px_rgba(40,32,24,0.025)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-[#81796f]">{label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-[#25231f]">
            {value}
          </p>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f5eee5] text-[#b96845]">
          <Icon size={19} />
        </div>
      </div>

      <p className="mt-3 text-xs text-[#999087]">{description}</p>
    </div>
  );
}

export default function QueryInboxPage() {
  const router = useRouter();
  const { token, user } = useAuth();

  const [requests, setRequests] = useState<ClaimRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] =
    useState<(typeof filters)[number]>("ALL");
  const [selected, setSelected] = useState<ClaimRequest | null>(null);
  const [updating, setUpdating] = useState(false);
  const [reference, setReference] = useState("");

  const canManage =
    user?.roles?.some((role: string) =>
      ["Desk Executive", "Desk Head"].includes(role)
    ) ?? false;

  const loadRequests = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API}/api/v1/claim-requests?limit=200`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        }
      );

      if (!response.ok) {
        const message = await response.text();
        throw new Error(getErrorMessage(message));
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        throw new Error("Unexpected response received from the server.");
      }

      setRequests(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load requests."
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const filtered = useMemo(() => {
    return requests.filter((item) => {
      const matchesStatus =
        activeFilter === "ALL" || item.status === activeFilter;

      const query = search.trim().toLowerCase();

      const matchesSearch =
        !query ||
        item.claim_number.toLowerCase().includes(query) ||
        item.request_type.toLowerCase().includes(query) ||
        (item.insurer_reference || "").toLowerCase().includes(query);

      return matchesStatus && matchesSearch;
    });
  }, [requests, activeFilter, search]);

  const counts = useMemo(
    () => ({
      total: requests.length,
      query: requests.filter((r) => r.status === "QUERY").length,
      submitted: requests.filter((r) => r.status === "SUBMITTED").length,
      approved: requests.filter((r) => r.status === "APPROVED").length,
    }),
    [requests]
  );

  async function updateStatus(status: RequestStatus) {
    if (!selected || !token || !canManage) return;

    setUpdating(true);
    setError("");

    try {
      const response = await fetch(
        `${API}/api/v1/claim-requests/${selected.id}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status,
            ...(reference.trim()
              ? { insurer_reference: reference.trim() }
              : {}),
          }),
        }
      );

      if (!response.ok) {
        const message = await response.text();
        throw new Error(getErrorMessage(message));
      }

      setSelected(null);
      setReference("");
      await loadRequests();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to update request."
      );
    } finally {
      setUpdating(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f5f0e8] text-[#25231f]">
      <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-7 sm:py-9 lg:px-10">

        {/* Header */}
        <header className="mb-8">
          <button
            onClick={() => router.push("/dashboard")}
            className="mb-7 inline-flex items-center gap-2 rounded-lg text-sm font-medium text-[#766d62] transition hover:text-[#b96845]"
          >
            <ArrowLeft size={17} />
            Back to Dashboard
          </button>

          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#b96845]">
                <MessageSquareText size={15} />
                ClaimFlow / Insurance Operations
              </div>

              <h1 className="text-3xl font-semibold tracking-tight text-[#25231f] sm:text-4xl">
                Query Inbox
              </h1>

              <p className="mt-2 max-w-xl text-sm leading-6 text-[#81796f]">
                Track insurer requests, monitor claim responses and manage
                request status from one workspace.
              </p>
            </div>

            <button
              onClick={loadRequests}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-[#ded5c9] bg-white px-4 py-3 text-sm font-semibold text-[#39352f] shadow-sm transition hover:border-[#c17a59] hover:bg-[#fffaf4] disabled:cursor-not-allowed disabled:opacity-50 sm:self-auto"
            >
              <RefreshCw
                size={16}
                className={loading ? "animate-spin" : ""}
              />
              Refresh requests
            </button>
          </div>
        </header>

        {/* Statistics */}
        <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total requests"
            value={counts.total}
            icon={FileText}
            description="All recorded claim requests"
          />

          <StatCard
            label="Queries raised"
            value={counts.query}
            icon={AlertCircle}
            description="Requests requiring attention"
          />

          <StatCard
            label="Awaiting response"
            value={counts.submitted}
            icon={Clock3}
            description="Submitted to insurer or TPA"
          />

          <StatCard
            label="Approved"
            value={counts.approved}
            icon={CheckCircle2}
            description="Requests approved by insurer"
          />
        </section>

        {/* Error */}
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-[#e7b9ac] bg-[#fff0ec] p-4 text-sm text-[#a64d3d]">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <div className="flex-1">{error}</div>
            <button
              onClick={() => setError("")}
              className="rounded-md p-1 hover:bg-[#f9dfd8]"
              aria-label="Dismiss error"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Main table */}
        <section className="overflow-hidden rounded-2xl border border-[#e8e0d5] bg-white shadow-[0_5px_20px_rgba(40,32,24,0.035)]">

          {/* Table heading */}
          <div className="border-b border-[#eee8df] px-5 py-5 sm:px-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-[#292620]">
                  All claim requests
                </h2>
                <p className="mt-1 text-xs text-[#968e84]">
                  Review and manage requests received from insurers and TPAs.
                </p>
              </div>

              <span className="rounded-lg bg-[#f5f0e8] px-3 py-1.5 text-xs font-semibold text-[#766d62]">
                {filtered.length} records
              </span>
            </div>

            {/* Search and filters */}
            <div className="mt-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="relative w-full xl:max-w-sm">
                <Search
                  size={17}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#a39a8e]"
                />

                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search claim, request type or reference..."
                  className="w-full rounded-xl border border-[#e6ded3] bg-[#fcfaf7] py-3 pl-10 pr-4 text-sm text-[#302c26] outline-none transition placeholder:text-[#aaa196] focus:border-[#c17a59] focus:ring-2 focus:ring-[#c17a59]/10"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {filters.map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setActiveFilter(filter)}
                    className={`rounded-lg px-3.5 py-2.5 text-xs font-semibold transition ${
                      activeFilter === filter
                        ? "bg-[#292722] text-[#fffaf2]"
                        : "border border-[#e8e0d5] bg-[#faf8f4] text-[#766e63] hover:border-[#c17a59] hover:text-[#a65d3d]"
                    }`}
                  >
                    {filter === "ALL" ? "All" : filter.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Loading */}
          {loading ? (
            <div className="flex flex-col items-center justify-center px-6 py-20">
              <RefreshCw size={25} className="animate-spin text-[#b96845]" />
              <p className="mt-4 text-sm font-medium text-[#655e54]">
                Loading claim requests...
              </p>
              <p className="mt-1 text-xs text-[#a39a8e]">
                Fetching records from the hospital database
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f5f0e8] text-[#b96845]">
                <Filter size={24} />
              </div>

              <h3 className="mt-4 font-semibold text-[#302c26]">
                No matching requests
              </h3>

              <p className="mt-1 max-w-sm text-sm leading-6 text-[#938a7f]">
                No requests match your current search or status filter.
                Try changing your filters.
              </p>

              <button
                onClick={() => {
                  setSearch("");
                  setActiveFilter("ALL");
                }}
                className="mt-5 text-sm font-semibold text-[#b96845] hover:text-[#925137]"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="border-b border-[#eee8df] bg-[#faf8f4] text-[11px] font-semibold uppercase tracking-[0.12em] text-[#938a7f]">
                  <tr>
                    <th className="px-6 py-4">Claim</th>
                    <th className="px-6 py-4">Request type</th>
                    <th className="px-6 py-4">Requested amount</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Last updated</th>
                    <th className="px-6 py-4 text-right">Details</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#f0ebe4]">
                  {filtered.map((item) => (
                    <tr
                      key={item.id}
                      className="transition hover:bg-[#fdfbf8]"
                    >
                      <td className="px-6 py-5">
                        <p className="font-semibold text-[#302c26]">
                          {item.claim_number}
                        </p>
                        <p className="mt-1 text-xs text-[#a39a8e]">
                          Request #{item.sequence_number}
                        </p>
                      </td>

                      <td className="px-6 py-5">
                        <span className="font-medium capitalize text-[#655e54]">
                          {item.request_type
                            .replaceAll("_", " ")
                            .toLowerCase()}
                        </span>
                      </td>

                      <td className="px-6 py-5 font-semibold tabular-nums text-[#302c26]">
                        {formatMoney(item.requested_amount)}
                      </td>

                      <td className="px-6 py-5">
                        <span
                          className={`inline-flex items-center rounded-full border px-3 py-1.5 text-[11px] font-semibold tracking-wide ${statusStyle(item.status)}`}
                        >
                          {item.status}
                        </span>
                      </td>

                      <td className="px-6 py-5 text-xs text-[#81796f]">
                        {formatDate(item.updated_at)}
                      </td>

                      <td className="px-6 py-5 text-right">
                        <button
                          onClick={() => {
                            setSelected(item);
                            setReference(item.insurer_reference || "");
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-[#a85e40] transition hover:bg-[#f8eee7]"
                        >
                          View details
                          <ChevronRight size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <p className="mt-5 text-xs leading-5 text-[#a39a8e]">
          Request records are loaded from the hospital claims database.
          Response deadlines and original insurer messages are not yet stored.
        </p>
      </div>

      {/* Request details modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#171511]/55 p-4 backdrop-blur-[3px]"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !updating) {
              setSelected(null);
            }
          }}
        >
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-[#e9e0d4] bg-[#fffdf9] shadow-2xl">

            {/* Modal header */}
            <div className="flex items-start justify-between border-b border-[#eee8df] px-6 py-5 sm:px-7">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#b96845]">
                  Request details
                </p>

                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#292620]">
                  {selected.claim_number}
                </h2>

                <p className="mt-1 text-xs text-[#968e84]">
                  Request #{selected.sequence_number}
                </p>
              </div>

              <button
                onClick={() => setSelected(null)}
                disabled={updating}
                className="rounded-xl border border-[#e9e0d4] p-2 text-[#81796f] transition hover:bg-[#f5f0e8] disabled:opacity-40"
                aria-label="Close details"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-5 px-6 py-6 sm:px-7">

              {/* Request type */}
              <div className="rounded-xl border border-[#eee6da] bg-[#f8f4ed] p-4">
                <p className="text-xs font-medium text-[#938a7f]">
                  Request type
                </p>
                <p className="mt-1.5 font-semibold capitalize text-[#302c26]">
                  {selected.request_type
                    .replaceAll("_", " ")
                    .toLowerCase()}
                </p>
              </div>

              {/* Amounts */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-[#eae2d7] bg-white p-4">
                  <p className="text-xs text-[#938a7f]">
                    Requested amount
                  </p>
                  <p className="mt-2 text-lg font-semibold text-[#302c26]">
                    {formatMoney(selected.requested_amount)}
                  </p>
                </div>

                <div className="rounded-xl border border-[#eae2d7] bg-white p-4">
                  <p className="text-xs text-[#938a7f]">
                    Approved amount
                  </p>
                  <p className="mt-2 text-lg font-semibold text-[#302c26]">
                    {formatMoney(selected.approved_amount)}
                  </p>
                </div>
              </div>

              {/* Timeline details */}
              <div>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#938a7f]">
                  Request timeline
                </h3>

                <div className="space-y-3 rounded-xl border border-[#eae2d7] bg-white p-4">
                  {[
                    ["Current status", selected.status],
                    ["Submitted", formatDate(selected.submitted_at)],
                    ["Responded", formatDate(selected.responded_at)],
                    ["Created", formatDate(selected.created_at)],
                    ["Last updated", formatDate(selected.updated_at)],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="flex flex-wrap justify-between gap-2 text-sm"
                    >
                      <span className="text-[#938a7f]">{label}</span>
                      <span className="font-medium text-[#302c26]">
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Insurer reference */}
              <div>
                <label className="mb-2 block text-xs font-semibold text-[#655e54]">
                  Insurer reference number
                </label>

                <input
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  disabled={!canManage || updating}
                  maxLength={100}
                  placeholder="Enter insurer reference number"
                  className="w-full rounded-xl border border-[#e5ddd2] bg-white px-4 py-3 text-sm text-[#302c26] outline-none transition placeholder:text-[#b1a99e] focus:border-[#bd7958] focus:ring-2 focus:ring-[#bd7958]/10 disabled:bg-[#f7f4ef]"
                />
              </div>

              {/* Status controls */}
              {canManage && (
                <div className="border-t border-[#eee8df] pt-5">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-[#938a7f]">
                    Update request status
                  </h3>

                  <p className="mt-1 text-xs text-[#a39a8e]">
                    Select the latest status received from the insurer or TPA.
                  </p>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {(
                      [
                        "QUERY",
                        "APPROVED",
                        "REJECTED",
                        "SUBMITTED",
                      ] as RequestStatus[]
                    ).map((status) => (
                      <button
                        key={status}
                        disabled={updating || selected.status === status}
                        onClick={() => updateStatus(status)}
                        className={`rounded-xl border px-3 py-3 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                          selected.status === status
                            ? "border-[#c17a59] bg-[#f8eee7] text-[#a85e40]"
                            : "border-[#e6ded3] bg-white text-[#655e54] hover:border-[#c17a59] hover:bg-[#fcf7f1]"
                        }`}
                      >
                        {updating ? "Saving..." : status}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Full claim file */}
              <button
                onClick={() =>
                  router.push(`/dashboard/claims/${selected.claim_id}`)
                }
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#292722] px-4 py-3.5 text-sm font-semibold text-[#fffaf2] transition hover:bg-[#403b33]"
              >
                <FileText size={17} />
                Open full claim file
                <ExternalLink size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}