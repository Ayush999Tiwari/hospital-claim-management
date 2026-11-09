
"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  RefreshCw,
  LogOut,
  FileText,
  CheckCircle2,
  CircleAlert,
  Clock3,
  UserRound,
  Building2,
  CalendarDays,
  IndianRupee,
  ClipboardCheck,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { apiRequest } from "@/lib/api";

type ChecklistItem = {
  id: string;
  document_type: string;
  procedure_name: string;
  is_mandatory: boolean;
  status: string;
  is_verified: boolean;
  document_id: string | null;
};

type ClaimDetail = {
  id: string;
  claim_number: string;
  status: string;
  requested_amount: number | string;
  approved_amount: number | string | null;
  created_at: string;
  insurer_name: string;
  tpa_name: string | null;
  patient: {
    id: string;
    patient_number: string;
    full_name: string;
  };
  admission: {
    id: string;
    admission_number: string;
    primary_diagnosis: string;
    procedure_name: string;
    admitted_at: string;
    discharged_at: string | null;
    status: string;
  };
  checklist: ChecklistItem[];
};

const stages = [
  "DRAFT",
  "PRE_AUTH_SENT",
  "QUERY",
  "APPROVED",
  "SETTLED",
];

const formatStatus = (value: string) =>
  value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (c) =>
    c.toUpperCase()
  );

const formatDate = (value?: string | null) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "Not available";

const formatMoney = (value?: number | string | null) =>
  value == null
    ? "—"
    : `₹${Number(value).toLocaleString("en-IN", {
        maximumFractionDigits: 2,
      })}`;

function ClaimDetailContent() {
  const params = useParams();
  const router = useRouter();
  const claimId = params.claimId as string;

  const { user, token, loading, logout, hasRole } = useAuth();

  const [claim, setClaim] = useState<ClaimDetail | null>(null);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");

  const isDeskRole =
    hasRole("Desk Executive") || hasRole("Desk Head");

  const fetchClaim = useCallback(async () => {
    if (!token || !claimId) return;

    setFetching(true);
    setError("");

    try {
      const result = await apiRequest<ClaimDetail>(
        `/claims/${claimId}/detail`,
        {},
        token
      );
      setClaim(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load claim details."
      );
    } finally {
      setFetching(false);
    }
  }, [token, claimId]);

  useEffect(() => {
    if (!loading && !user) router.replace("/");
    if (!loading && user && !isDeskRole) router.replace("/dashboard");
  }, [loading, user, isDeskRole, router]);

  useEffect(() => {
    if (!loading && user && isDeskRole) fetchClaim();
  }, [loading, user, isDeskRole, fetchClaim]);

  if (loading || !user || !isDeskRole) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#f7f8f5]">
        <div className="text-sm text-[#527765]">
          Loading workspace...
        </div>
      </div>
    );
  }

  const checklist = claim?.checklist ?? [];

  const verifiedCount = checklist.filter(
    (item) => item.is_verified
  ).length;

  const missingCount = checklist.filter(
    (item) => item.is_mandatory && !item.document_id
  ).length;

  const progress =
    checklist.length > 0
      ? Math.round((verifiedCount / checklist.length) * 100)
      : 0;

  const currentStage = stages.indexOf(claim?.status ?? "");

  const stageIndex =
    currentStage >= 0
      ? currentStage
      : claim?.status === "ENHANCEMENT"
        ? 2
        : claim?.status === "REJECTED"
          ? 3
          : -1;

  return (
    <main className="min-h-screen bg-[#f7f8f5] text-[#233b32]">
      <header className="sticky top-0 z-20 border-b border-[#e5eae5] bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1450px] items-center justify-between px-5 py-4 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/dashboard/claims")}
              className="rounded-xl border border-[#e4e9e4] p-2 hover:bg-[#f3f6f2]"
            >
              <ArrowLeft size={18} />
            </button>

            <div>
              <div className="text-sm font-bold tracking-tight">
                ClaimStack
              </div>
              <div className="text-xs text-[#829087]">
                Claim file management
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <div className="text-sm font-semibold">
                {user.full_name}
              </div>
              <div className="text-xs text-[#829087]">
                {user.roles.join(", ")}
              </div>
            </div>

            <button
              onClick={fetchClaim}
              disabled={fetching}
              className="rounded-xl border border-[#e4e9e4] p-2.5 hover:bg-[#f3f6f2]"
              title="Refresh"
            >
              <RefreshCw
                size={17}
                className={fetching ? "animate-spin" : ""}
              />
            </button>

            <button
              onClick={logout}
              className="rounded-xl border border-[#e4e9e4] p-2.5 hover:bg-[#f3f6f2]"
              title="Logout"
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1450px] space-y-6 px-5 py-7 lg:px-8">
        {fetching && (
          <div className="rounded-2xl border border-[#e5eae5] bg-white p-10 text-center text-sm text-[#829087]">
            Loading claim file...
          </div>
        )}

        {error && !fetching && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
            <div className="flex items-center gap-2 font-semibold text-red-700">
              <CircleAlert size={18} />
              Unable to load claim
            </div>

            <p className="mt-2 text-sm text-red-600">
              {error}
            </p>

            <button
              onClick={fetchClaim}
              className="mt-4 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white"
            >
              Try again
            </button>
          </div>
        )}

        {claim && !fetching && (
          <>
            {/* Claim header and Documents navigation */}
            <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#829087]">
                  Claims / Claim file
                </div>

                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  {claim.claim_number}
                </h1>

                <p className="mt-1 text-sm text-[#829087]">
                  Created {formatDate(claim.created_at)}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() =>
                    router.push(
                      `/dashboard/claims/${claimId}/documents`
                    )
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-[#47765b] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#38664d]"
                >
                  <ClipboardCheck size={17} />
                  Documents & Checklist
                </button>

                <span className="w-fit rounded-full bg-[#e9f2ec] px-4 py-2.5 text-xs font-bold text-[#38664d]">
                  {formatStatus(claim.status)}
                </span>
              </div>
            </section>

            {/* Claim timeline */}
            <section className="rounded-2xl border border-[#e5eae5] bg-white p-5 sm:p-7">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="font-bold">Claim journey</h2>
                  <p className="mt-1 text-xs text-[#829087]">
                    Current processing stage
                  </p>
                </div>

                <Clock3 size={20} className="text-[#829087]" />
              </div>

              <div className="grid grid-cols-5 gap-2">
                {stages.map((stage, index) => {
                  const completed = stageIndex >= index;
                  const active = stageIndex === index;

                  return (
                    <div key={stage} className="min-w-0">
                      <div
                        className={`mb-3 h-1.5 rounded-full ${
                          completed ? "bg-[#47765b]" : "bg-[#e8ede8]"
                        }`}
                      />

                      <div
                        className={`text-[10px] font-bold sm:text-xs ${
                          active ? "text-[#38664d]" : "text-[#829087]"
                        }`}
                      >
                        {formatStatus(stage)}
                      </div>
                    </div>
                  );
                })}
              </div>

              {claim.status === "REJECTED" && (
                <p className="mt-4 text-sm font-medium text-red-600">
                  This claim has been rejected.
                </p>
              )}
            </section>

            {/* Summary cards */}
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryCard
                icon={<IndianRupee size={18} />}
                label="Requested amount"
                value={formatMoney(claim.requested_amount)}
              />

              <SummaryCard
                icon={<CheckCircle2 size={18} />}
                label="Approved amount"
                value={formatMoney(claim.approved_amount)}
              />

              <SummaryCard
                icon={<ClipboardCheck size={18} />}
                label="Checklist verified"
                value={`${verifiedCount}/${checklist.length}`}
              />

              <SummaryCard
                icon={<CircleAlert size={18} />}
                label="Mandatory documents missing"
                value={String(missingCount)}
                warning={missingCount > 0}
              />
            </section>

            {/* Patient and admission */}
            <section className="grid gap-5 xl:grid-cols-2">
              <div className="rounded-2xl border border-[#e5eae5] bg-white p-5 sm:p-6">
                <div className="mb-5 flex items-center gap-3">
                  <div className="rounded-xl bg-[#edf3ee] p-2.5 text-[#47765b]">
                    <UserRound size={19} />
                  </div>

                  <div>
                    <h2 className="font-bold">Patient information</h2>
                    <p className="text-xs text-[#829087]">
                      Registered patient details
                    </p>
                  </div>
                </div>

                <InfoRow
                  label="Patient name"
                  value={claim.patient.full_name}
                />

                <InfoRow
                  label="Patient number"
                  value={claim.patient.patient_number}
                />

                <InfoRow
                  label="Patient ID"
                  value={claim.patient.id}
                  small
                />
              </div>

              <div className="rounded-2xl border border-[#e5eae5] bg-white p-5 sm:p-6">
                <div className="mb-5 flex items-center gap-3">
                  <div className="rounded-xl bg-[#edf3ee] p-2.5 text-[#47765b]">
                    <Building2 size={19} />
                  </div>

                  <div>
                    <h2 className="font-bold">Admission information</h2>
                    <p className="text-xs text-[#829087]">
                      Treatment and hospital details
                    </p>
                  </div>
                </div>

                <InfoRow
                  label="Admission number"
                  value={claim.admission.admission_number}
                />

                <InfoRow
                  label="Diagnosis"
                  value={claim.admission.primary_diagnosis}
                />

                <InfoRow
                  label="Procedure"
                  value={claim.admission.procedure_name}
                />

                <InfoRow
                  label="Admission date"
                  value={formatDate(claim.admission.admitted_at)}
                />

                <InfoRow
                  label="Discharge date"
                  value={formatDate(claim.admission.discharged_at)}
                />
              </div>
            </section>

            {/* Insurer */}
            <section className="rounded-2xl border border-[#e5eae5] bg-white p-5 sm:p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="rounded-xl bg-[#edf3ee] p-2.5 text-[#47765b]">
                  <Building2 size={19} />
                </div>

                <h2 className="font-bold">Insurance information</h2>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <InfoRow
                  label="Insurer"
                  value={claim.insurer_name}
                />

                <InfoRow
                  label="TPA"
                  value={claim.tpa_name || "Not assigned"}
                />
              </div>
            </section>

            {/* Checklist */}
            <section className="overflow-hidden rounded-2xl border border-[#e5eae5] bg-white">
              <div className="flex flex-col justify-between gap-3 border-b border-[#edf0ed] p-5 sm:flex-row sm:items-center sm:p-6">
                <div>
                  <h2 className="font-bold">Document checklist</h2>
                  <p className="mt-1 text-xs text-[#829087]">
                    Required documents for this claim
                  </p>
                </div>

                <div className="text-sm font-semibold text-[#47765b]">
                  {progress}% verified
                </div>
              </div>

              <div className="h-1.5 bg-[#edf1ed]">
                <div
                  className="h-full rounded-r-full bg-[#47765b] transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>

              {checklist.length === 0 ? (
                <div className="p-10 text-center">
                  <FileText
                    className="mx-auto mb-3 text-[#a1ada4]"
                    size={28}
                  />

                  <p className="text-sm font-semibold">
                    No checklist items generated
                  </p>

                  <p className="mt-1 text-xs text-[#829087]">
                    Generate the checklist for this claim to track documents.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-[#edf0ed]">
                  {checklist.map((item) => {
                    const received = Boolean(item.document_id);
                    const verified = item.is_verified;

                    return (
                      <div
                        key={item.id}
                        className="flex flex-col justify-between gap-3 px-5 py-4 sm:flex-row sm:items-center sm:px-6"
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`mt-0.5 rounded-lg p-2 ${
                              verified
                                ? "bg-[#e9f2ec] text-[#47765b]"
                                : received
                                  ? "bg-blue-50 text-blue-600"
                                  : "bg-red-50 text-red-500"
                            }`}
                          >
                            {verified ? (
                              <CheckCircle2 size={17} />
                            ) : (
                              <FileText size={17} />
                            )}
                          </div>

                          <div>
                            <p className="text-sm font-semibold">
                              {formatStatus(item.document_type)}
                            </p>

                            <p className="mt-1 text-xs text-[#829087]">
                              {item.procedure_name}
                              {item.is_mandatory
                                ? " · Mandatory"
                                : " · Optional"}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`w-fit rounded-full px-3 py-1.5 text-[11px] font-bold ${
                            verified
                              ? "bg-[#e9f2ec] text-[#38664d]"
                              : received
                                ? "bg-blue-50 text-blue-700"
                                : "bg-red-50 text-red-600"
                          }`}
                        >
                          {verified
                            ? "Verified"
                            : received
                              ? "Uploaded · Pending verification"
                              : "Missing"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <div className="flex items-center gap-2 pb-5 text-xs text-[#829087]">
              <CalendarDays size={14} />
              Claim file data is loaded from the hospital claims API.
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  warning = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  warning?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-[#e5eae5] bg-white p-5">
      <div
        className={`mb-4 w-fit rounded-xl p-2 ${
          warning
            ? "bg-red-50 text-red-600"
            : "bg-[#edf3ee] text-[#47765b]"
        }`}
      >
        {icon}
      </div>

      <p className="text-xs text-[#829087]">{label}</p>

      <p
        className={`mt-1 text-xl font-bold ${
          warning ? "text-red-600" : "text-[#233b32]"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function InfoRow({
  label,
  value,
  small = false,
}: {
  label: string;
  value: string;
  small?: boolean;
}) {
  return (
    <div className="flex flex-col justify-between gap-1 border-b border-[#f0f2f0] py-3 last:border-0 sm:flex-row sm:gap-4">
      <span className="text-xs text-[#829087]">{label}</span>

      <span
        className={`break-all text-sm font-semibold sm:text-right ${
          small ? "text-xs text-[#829087]" : "text-[#344c40]"
        }`}
      >
        {value || "—"}
      </span>
    </div>
  );
}

export default function ClaimDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen grid place-items-center bg-[#f7f8f5]">
          <div className="text-sm text-[#527765]">
            Loading claim details...
          </div>
        </div>
      }
    >
      <ClaimDetailContent />
    </Suspense>
  );
}
