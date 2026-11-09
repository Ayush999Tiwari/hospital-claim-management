
"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  FileCheck2,
  FileText,
  LayoutDashboard,
  ListChecks,
  LoaderCircle,
  LogOut,
  MessageSquareText,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import {
  createClaim,
  getClaimCreationOptions,
  type ClaimCreationOptions,
} from "@/lib/api";

const claims = [
  {
    id: "CLM-3381",
    patient: "Rajendra Pawar",
    initials: "RP",
    insurer: "Company B · TPA",
    procedure: "Gall bladder removal",
    status: "Query",
    statusStyle: "bg-[#F9E8DE] text-[#A85E42] border-[#EED4C5]",
    missing: "Ultrasound report",
    priority: "High",
  },
  {
    id: "CLM-3382",
    patient: "Sunita Deshmukh",
    initials: "SD",
    insurer: "Company C · Insurer",
    procedure: "Total knee replacement",
    status: "Pre-auth sent",
    statusStyle: "bg-[#EEEAE2] text-[#766C5B] border-[#E2D9CA]",
    missing: "None",
    priority: "Normal",
  },
  {
    id: "CLM-3385",
    patient: "Imran Shaikh",
    initials: "IS",
    insurer: "Company D · TPA",
    procedure: "Dengue with low platelets",
    status: "Enhancement",
    statusStyle: "bg-[#F5E4E0] text-[#A44D43] border-[#EBD0CA]",
    missing: "Latest platelet count",
    priority: "High",
  },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-[0.19em] text-[#938B80]">
      {children}
    </p>
  );
}

function MetricCard({
  label,
  value,
  note,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  note: string;
  icon: React.ElementType;
  accent: string;
}) {
  return (
    <div className="group rounded-2xl border border-[#E7DFD4] bg-white p-5 transition-all duration-300 hover:-translate-y-1 hover:border-[#D7C8B7] hover:shadow-[0_16px_40px_rgba(45,37,28,0.06)]">
      <div className="flex items-start justify-between">
        <p className="text-[13px] font-medium text-[#817B71]">{label}</p>
        <div className={`rounded-xl p-2.5 ${accent}`}>
          <Icon size={18} strokeWidth={1.8} />
        </div>
      </div>

      <p className="mt-6 text-[34px] font-semibold tracking-[-0.07em] text-[#20201E]">
        {value}
      </p>

      <p className="mt-1 text-[11px] leading-5 text-[#938B80]">{note}</p>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, token, loading, logout, hasRole } = useAuth();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [options, setOptions] = useState<ClaimCreationOptions | null>(null);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const [admissionId, setAdmissionId] = useState("");
  const [insurerId, setInsurerId] = useState("");
  const [tpaId, setTpaId] = useState("");
  const [requestedAmount, setRequestedAmount] = useState("");

  const isDeskHead = hasRole("Desk Head");
  const isDeskExecutive = hasRole("Desk Executive");
  const isDoctor = hasRole("Treating Doctor");
  const isCFO = hasRole("CFO");
  const isDeskRole = isDeskHead || isDeskExecutive;

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/");
    }
  }, [loading, user, router]);

  function handleLogout() {
    logout();
    router.replace("/");
  }

  async function openCreateModal() {
    if (!token) return;

    setShowCreateModal(true);
    setFormError("");
    setOptionsLoading(true);

    try {
      const data = await getClaimCreationOptions(token);
      setOptions(data);
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Unable to load claim creation options."
      );
    } finally {
      setOptionsLoading(false);
    }
  }

  function closeCreateModal() {
    if (submitting) return;

    setShowCreateModal(false);
    setFormError("");
    setAdmissionId("");
    setInsurerId("");
    setTpaId("");
    setRequestedAmount("");
  }

  async function handleCreateClaim(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token) {
      setFormError("Your session has expired. Please log in again.");
      return;
    }

    if (!admissionId || !insurerId || !requestedAmount) {
      setFormError("Please complete all required fields.");
      return;
    }

    const amount = Number(requestedAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setFormError("Enter a valid requested amount greater than zero.");
      return;
    }

    setSubmitting(true);
    setFormError("");

    try {
      const createdClaim = await createClaim(
        {
          admission_id: admissionId,
          insurer_id: insurerId,
          tpa_id: tpaId || null,
          requested_amount: amount.toFixed(2),
        },
        token
      );

      setShowCreateModal(false);

      router.push(`/dashboard/claims/${createdClaim.id}`);
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Unable to create claim. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F0E8]">
        <LoaderCircle className="animate-spin text-[#D87950]" size={28} />
      </div>
    );
  }

  const greetingName = user.full_name.split(" ")[0];

  const navigation = [
    {
      label: "Overview",
      icon: LayoutDashboard,
      active: true,
      visible: true,
    },
    {
      label: "All claims",
      icon: FileText,
      active: false,
      visible: isDeskRole,
    },
    {
      label: "Document checklist",
      icon: ListChecks,
      active: false,
      visible: isDeskRole,
    },
    {
      label: "Query inbox",
      icon: MessageSquareText,
      active: false,
      visible: isDeskRole,
    },
    {
      label: "Team",
      icon: Users,
      active: false,
      visible: isDeskHead,
    },
  ];

  const roleDescription = isDeskHead
    ? "Here's what needs your attention across insurance operations."
    : isDeskExecutive
      ? "Here's your claims and documentation workspace."
      : isDoctor
        ? "Review your assigned clinical requests and approvals."
        : "View financial and operational reporting for the hospital.";

  return (
    <main className="min-h-screen bg-[#F5F0E8] text-[#20201E]">
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="hidden w-[258px] shrink-0 border-r border-[#E7DFD4] bg-[#FBF9F5] px-6 py-7 lg:flex lg:flex-col">
          <a href="/dashboard" className="flex items-center gap-3 px-1">
            <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#20201E] text-[#F5F0E8] shadow-sm">
              <ShieldCheck size={22} strokeWidth={1.8} />
            </div>

            <div>
              <p className="text-[18px] font-semibold tracking-[-0.055em]">
                ClaimFlow
              </p>
              <p className="mt-0.5 text-[9px] tracking-[0.17em] text-[#938B80]">
                HOSPITAL OPERATIONS
              </p>
            </div>
          </a>

          <div className="mt-12">
            <SectionLabel>Workspace</SectionLabel>

            <nav className="mt-5 space-y-1.5">
              {navigation
                .filter((item) => item.visible)
                .map(({ label, icon: Icon, active }) => (
                  <a
                    key={label}
                    href={
                      label === "Overview"
                        ? "/dashboard"
                        : label === "All claims"
                          ? "/dashboard/claims"
                          : label === "Document checklist"
                            ? "/dashboard/document-checklist"
                            : label === "Query inbox"
                              ? "/dashboard/queries"
                              : label === "Team"
                                ? "/dashboard/team"
                                : "#"
                    }
                    className={`group flex items-center gap-3 rounded-xl px-3 py-3.5 text-[13px] transition-all duration-200 ${
                      active
                        ? "bg-[#282723] font-semibold text-white shadow-sm"
                        : "text-[#817B71] hover:bg-[#F0EAE0] hover:text-[#20201E]"
                    }`}
                  >
                    <Icon
                      size={17}
                      strokeWidth={1.8}
                      className={
                        active
                          ? "text-[#E6A17F]"
                          : "text-[#A49B8F] group-hover:text-[#D87950]"
                      }
                    />

                    {label}

                    {label === "Query inbox" && (
                      <span className="ml-auto rounded-full bg-[#F5E3D9] px-2 py-0.5 text-[10px] font-semibold text-[#A85E42]">
                        1
                      </span>
                    )}
                  </a>
                ))}
            </nav>
          </div>

          {isDeskHead && (
            <div className="mt-11">
              <SectionLabel>Administration</SectionLabel>

              <a
                href="/dashboard/checklist-settings"
                className="mt-5 flex items-center gap-3 rounded-xl px-3 py-3 text-[13px] text-[#817B71] transition hover:bg-[#F0EAE0] hover:text-[#20201E]"
              >
                <Settings2 size={17} className="text-[#A49B8F]" />
                Checklist settings
              </a>
            </div>
          )}

          <div className="mt-auto overflow-hidden rounded-2xl bg-[#20201E] p-5 text-[#F5F0E8]">
            <div className="flex items-center gap-2">
              <Activity size={15} className="text-[#E49A76]" />
              <span className="text-xs font-semibold">Workspace status</span>
            </div>

            <p className="mt-3 text-[11px] leading-6 text-white/60">
              {isDoctor
                ? "Your clinical approval workspace is ready."
                : isCFO
                  ? "Your financial reporting workspace is ready."
                  : "Your claims workspace is ready. Keep documents and approvals moving from one place."}
            </p>

            <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/15">
              <div className="h-full w-full rounded-full bg-[#D87950]" />
            </div>

            <p className="mt-3 text-[9px] uppercase tracking-[0.16em] text-white/40">
              Demo environment
            </p>
          </div>
        </aside>

        {/* Main content */}
        <section className="min-w-0 flex-1">
          {/* Topbar */}
          <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-[#E7DFD4] bg-[#F5F0E8]/95 px-5 backdrop-blur-xl sm:px-8">
            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-[#938B80]">
                Company A / Workspace
              </p>
              <p className="mt-1 text-sm font-semibold tracking-tight text-[#20201E]">
                Insurance operations
              </p>
            </div>

            <div className="flex items-center gap-3">
              {isDeskRole && (
                <div className="hidden items-center gap-2 rounded-xl border border-[#E5DDD2] bg-white px-3 py-2.5 md:flex">
                  <Search size={15} className="text-[#A49B8F]" />
                  <input
                    placeholder="Search claims..."
                    className="w-36 bg-transparent text-xs text-[#20201E] outline-none placeholder:text-[#A49B8F]"
                  />
                  <kbd className="rounded border border-[#E7DFD4] px-1.5 py-0.5 text-[10px] text-[#938B80]">
                    /
                  </kbd>
                </div>
              )}

              <div className="border-l border-[#DED5C9] pl-4">
                <p className="text-xs font-semibold text-[#20201E]">
                  {user.full_name}
                </p>
                <p className="mt-0.5 text-[10px] text-[#938B80]">
                  {user.roles.join(" · ")}
                </p>
              </div>

              <button
                onClick={handleLogout}
                title="Sign out"
                aria-label="Sign out"
                className="rounded-xl border border-[#E5DDD2] bg-white p-2.5 text-[#817B71] transition hover:border-[#E5B9A5] hover:bg-[#F9E8DE] hover:text-[#A85E42]"
              >
                <LogOut size={17} />
              </button>
            </div>
          </header>

          <div className="mx-auto max-w-[1440px] px-5 py-9 sm:px-8">
            {/* Page heading */}
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
              <div>
                <p className="text-[10px] font-semibold tracking-[0.2em] text-[#D87950]">
                  CLAIMFLOW / OVERVIEW
                </p>

                <h1 className="mt-3 text-[32px] font-semibold tracking-[-0.065em] text-[#20201E] sm:text-[40px]">
                  Good morning, {greetingName}.
                </h1>

                <p className="mt-2 text-[13px] text-[#817B71]">
                  {roleDescription}
                </p>
              </div>

              {isDeskRole && (
                <button
                  onClick={openCreateModal}
                  className="group inline-flex h-12 items-center justify-center gap-3 rounded-xl bg-[#20201E] px-5 text-xs font-semibold text-white shadow-md shadow-[#20201E]/10 transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#393832]"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#D87950] text-white transition-transform group-hover:rotate-90">
                    <Plus size={16} />
                  </span>
                  New claim
                  <ArrowUpRight size={15} className="ml-1 text-white/60" />
                </button>
              )}
            </div>

            {/* Desk Executive and Desk Head workspace */}
            {isDeskRole ? (
              <>
                {/* Metrics */}
                <div className="mt-9 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <MetricCard
                    label="Sample claims"
                    value="03"
                    note="Claims in the demonstration dataset"
                    icon={FileText}
                    accent="bg-[#F0EAE0] text-[#756B5B]"
                  />

                  <MetricCard
                    label="Document gaps"
                    value="02"
                    note="Missing documents across sample claims"
                    icon={AlertCircle}
                    accent="bg-[#F9E8DE] text-[#B66A4D]"
                  />

                  <MetricCard
                    label="Open queries"
                    value="01"
                    note="Requires desk team attention"
                    icon={MessageSquareText}
                    accent="bg-[#F1E7DF] text-[#9B674D]"
                  />

                  <MetricCard
                    label="Pre-auth sent"
                    value="01"
                    note="Awaiting insurer response in sample data"
                    icon={Clock3}
                    accent="bg-[#ECE9E2] text-[#756B5B]"
                  />
                </div>

                {/* Main grid */}
                <div className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,0.8fr)]">
                  {/* Claims table */}
                  <div className="min-w-0 overflow-hidden rounded-2xl border border-[#E7DFD4] bg-white">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EEE8DF] px-5 py-5">
                      <div>
                        <h2 className="text-sm font-semibold tracking-tight">
                          Recent claims
                        </h2>
                        <p className="mt-1 text-xs text-[#938B80]">
                          Track progress and identify missing documents.
                        </p>
                      </div>

                      <button
                        onClick={() => router.push("/dashboard/claims")}
                        className="text-xs font-semibold text-[#A85E42] transition hover:text-[#20201E]"
                      >
                        View all claims{" "}
                        <ArrowUpRight size={13} className="ml-1 inline" />
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[690px] text-left">
                        <thead>
                          <tr className="bg-[#FAF8F4] text-[10px] uppercase tracking-[0.12em] text-[#938B80]">
                            <th className="px-5 py-3 font-medium">
                              Claim / Patient
                            </th>
                            <th className="px-4 py-3 font-medium">Insurer</th>
                            <th className="px-4 py-3 font-medium">Status</th>
                            <th className="px-4 py-3 font-medium">
                              Document gap
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          {claims.map((claim) => (
                            <tr
                              key={claim.id}
                              className="border-t border-[#F0EBE3] transition hover:bg-[#FCFAF7]"
                            >
                              <td className="px-5 py-4">
                                <p className="text-xs font-semibold text-[#20201E]">
                                  {claim.id}
                                </p>

                                <div className="mt-2 flex items-center gap-2">
                                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F0EAE0] text-[10px] font-semibold text-[#806B57]">
                                    {claim.initials}
                                  </div>

                                  <div>
                                    <p className="text-xs font-medium">
                                      {claim.patient}
                                    </p>
                                    <p className="mt-0.5 text-[10px] text-[#938B80]">
                                      {claim.procedure}
                                    </p>
                                  </div>
                                </div>
                              </td>

                              <td className="px-4 py-4 text-xs text-[#817B71]">
                                {claim.insurer}
                              </td>

                              <td className="px-4 py-4">
                                <span
                                  className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-medium ${claim.statusStyle}`}
                                >
                                  {claim.status}
                                </span>
                              </td>

                              <td className="px-4 py-4">
                                {claim.missing === "None" ? (
                                  <span className="inline-flex items-center gap-1.5 text-[11px] text-[#817B71]">
                                    <CheckCircle2 size={14} />
                                    No gap
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 text-[11px] text-[#B66A4D]">
                                    <AlertCircle size={14} />
                                    {claim.missing}
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex items-center justify-between border-t border-[#EEE8DF] px-5 py-3">
                      <p className="text-[10px] text-[#938B80]">
                        Showing 3 seeded demonstration claims
                      </p>
                      <span className="text-[10px] text-[#938B80]">
                        Demo dataset
                      </span>
                    </div>
                  </div>

                  {/* Attention panel */}
                  <div className="rounded-2xl border border-[#E7DFD4] bg-white p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-sm font-semibold tracking-tight">
                          Needs attention
                        </h2>
                        <p className="mt-1 text-xs text-[#938B80]">
                          Documents and queries to review.
                        </p>
                      </div>

                      <span className="rounded-full bg-[#F9E8DE] px-2.5 py-1 text-[10px] font-semibold text-[#A85E42]">
                        3 items
                      </span>
                    </div>

                    <div className="mt-5 space-y-4">
                      <div className="rounded-xl border border-[#EEDDD1] bg-[#FCF8F4] p-4">
                        <div className="flex items-center gap-2">
                          <div className="rounded-lg bg-[#F5E3D9] p-2 text-[#B66A4D]">
                            <MessageSquareText size={16} />
                          </div>
                          <span className="text-xs font-semibold">
                            TPA query received
                          </span>
                        </div>

                        <p className="mt-3 text-xs font-medium">
                          CLM-3381 · Rajendra Pawar
                        </p>
                        <p className="mt-1 text-[11px] leading-5 text-[#817B71]">
                          Ultrasound report requested by Company B TPA.
                        </p>
                        <p className="mt-3 text-[10px] font-semibold text-[#B66A4D]">
                          Review query and reply deadline
                        </p>
                      </div>

                      <div className="rounded-xl border border-[#E9E1D5] bg-[#FCFAF6] p-4">
                        <div className="flex items-center gap-2">
                          <div className="rounded-lg bg-[#F0EAE0] p-2 text-[#9B7854]">
                            <FileCheck2 size={16} />
                          </div>
                          <span className="text-xs font-semibold">
                            Document missing
                          </span>
                        </div>

                        <p className="mt-3 text-xs font-medium">
                          CLM-3385 · Imran Shaikh
                        </p>
                        <p className="mt-1 text-[11px] leading-5 text-[#817B71]">
                          Latest platelet count is required for the
                          enhancement.
                        </p>
                      </div>

                      <div className="rounded-xl border border-[#E7DFD4] bg-[#FAF8F4] p-4">
                        <div className="flex items-center gap-2">
                          <div className="rounded-lg bg-[#EEEAE2] p-2 text-[#827766]">
                            <Clock3 size={16} />
                          </div>
                          <span className="text-xs font-semibold">
                            Insurer response pending
                          </span>
                        </div>

                        <p className="mt-3 text-xs font-medium">
                          CLM-3382 · Sunita Deshmukh
                        </p>
                        <p className="mt-1 text-[11px] leading-5 text-[#817B71]">
                          Pre-authorisation has been sent to Company C.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom section */}
                <div className="mt-6 grid gap-6 lg:grid-cols-2">
                  <div className="rounded-2xl border border-[#E7DFD4] bg-white p-5">
                    <div className="flex items-center gap-2">
                      <div className="rounded-lg bg-[#F0EAE0] p-2 text-[#806B57]">
                        <ListChecks size={17} />
                      </div>
                      <div>
                        <h2 className="text-sm font-semibold">
                          Document readiness
                        </h2>
                        <p className="mt-1 text-xs text-[#938B80]">
                          Based on the supplied sample claims.
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 flex items-center justify-between text-xs">
                      <span className="text-[#817B71]">
                        Claims without identified gaps
                      </span>
                      <span className="font-semibold">1 of 3</span>
                    </div>

                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#F0EAE0]">
                      <div className="h-full w-1/3 rounded-full bg-[#D87950]" />
                    </div>

                    <p className="mt-3 text-[10px] leading-5 text-[#938B80]">
                      This is a sample-data indicator, not a live
                      hospital-wide readiness metric.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[#E7DFD4] bg-white p-5">
                    <div className="flex items-center gap-2">
                      <div className="rounded-lg bg-[#F0EAE0] p-2 text-[#806B57]">
                        <Activity size={17} />
                      </div>
                      <div>
                        <h2 className="text-sm font-semibold">
                          Deductions overview
                        </h2>
                        <p className="mt-1 text-xs text-[#938B80]">
                          Track avoidable deductions by reason.
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 rounded-xl border border-dashed border-[#E4DCCE] bg-[#FAF8F4] px-4 py-5 text-center">
                      <ArrowDownRight
                        className="mx-auto text-[#938B80]"
                        size={20}
                      />
                      <p className="mt-2 text-xs font-semibold">
                        Awaiting claim-level data
                      </p>
                      <p className="mx-auto mt-1 max-w-sm text-[11px] leading-5 text-[#938B80]">
                        The deductions chart will use recorded deduction
                        amounts and reasons. We won't invent financial
                        figures.
                      </p>
                    </div>
                  </div>
                </div>
              </>
            ) : null}

            {/* Treating Doctor workspace */}
            {isDoctor && (
              <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.8fr)]">
                <div className="rounded-2xl border border-[#E7DFD4] bg-white p-6">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-[#F0EAE0] p-3 text-[#806B57]">
                      <FileCheck2 size={20} />
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold">
                        Clinical approvals
                      </h2>
                      <p className="mt-1 text-xs text-[#938B80]">
                        Requests assigned to you for clinical review.
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 rounded-xl border border-dashed border-[#E4DCCE] bg-[#FAF8F4] px-5 py-10 text-center">
                    <FileText size={25} className="mx-auto text-[#938B80]" />
                    <p className="mt-3 text-sm font-semibold">
                      No assigned requests available
                    </p>
                    <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-[#938B80]">
                      Assigned clinical requests will appear here when they
                      are linked to your account.
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#E7DFD4] bg-white p-6">
                  <div className="flex items-center gap-2">
                    <Clock3 size={18} className="text-[#D87950]" />
                    <h2 className="text-sm font-semibold">
                      Pending approvals
                    </h2>
                  </div>

                  <p className="mt-4 text-[34px] font-semibold tracking-[-0.06em]">
                    00
                  </p>
                  <p className="mt-1 text-xs text-[#938B80]">
                    No pending approvals in this demo account.
                  </p>
                </div>
              </div>
            )}

            {/* CFO workspace */}
            {isCFO && (
              <div className="mt-8 space-y-6">
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  <MetricCard
                    label="Claims reporting"
                    value="—"
                    note="Awaiting verified claim data"
                    icon={FileText}
                    accent="bg-[#F0EAE0] text-[#806B57]"
                  />

                  <MetricCard
                    label="Deductions"
                    value="—"
                    note="Awaiting recorded deduction data"
                    icon={ArrowDownRight}
                    accent="bg-[#F9E8DE] text-[#B66A4D]"
                  />

                  <MetricCard
                    label="Settlement status"
                    value="—"
                    note="Awaiting settlement records"
                    icon={CheckCircle2}
                    accent="bg-[#EEEAE2] text-[#827766]"
                  />
                </div>

                <div className="rounded-2xl border border-[#E7DFD4] bg-white p-6">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-[#F0EAE0] p-3 text-[#806B57]">
                      <Activity size={20} />
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold">
                        Financial and operational reports
                      </h2>
                      <p className="mt-1 text-xs text-[#938B80]">
                        Aggregated claim performance and deduction insights.
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 rounded-xl border border-dashed border-[#E4DCCE] bg-[#FAF8F4] px-5 py-10 text-center">
                    <ArrowDownRight
                      size={25}
                      className="mx-auto text-[#938B80]"
                    />
                    <p className="mt-3 text-sm font-semibold">
                      Report data is not available yet
                    </p>
                    <p className="mx-auto mt-2 max-w-lg text-xs leading-5 text-[#938B80]">
                      Financial reports will be populated from verified claim,
                      deduction, and settlement records. No financial figures
                      are fabricated for this demo.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <footer className="mt-9 flex flex-wrap items-center justify-between gap-2 border-t border-[#E3DACE] pt-5 text-[10px] text-[#938B80]">
              <span>ClaimFlow · Hospital Insurance Workspace</span>
              <span>Demo interface · Synthetic patient data</span>
            </footer>
          </div>
        </section>
      </div>

      {/* Create Claim Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#20201E]/55 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeCreateModal();
            }
          }}
        >
          <div className="my-auto w-full max-w-[560px] overflow-hidden rounded-2xl border border-[#E7DFD4] bg-[#FBF9F5] shadow-2xl">
            <div className="flex items-start justify-between border-b border-[#E7DFD4] px-6 py-5">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#D87950]">
                  ClaimFlow / New record
                </p>
                <h2 className="mt-2 text-xl font-semibold tracking-tight text-[#20201E]">
                  Create new claim
                </h2>
                <p className="mt-1 text-xs text-[#817B71]">
                  Link an existing admission to an insurer.
                </p>
              </div>

              <button
                type="button"
                onClick={closeCreateModal}
                disabled={submitting}
                className="rounded-lg border border-[#E7DFD4] bg-white p-2 text-[#817B71] transition hover:bg-[#F9E8DE] hover:text-[#A85E42] disabled:opacity-50"
                aria-label="Close modal"
              >
                <X size={17} />
              </button>
            </div>

            <form onSubmit={handleCreateClaim} className="space-y-5 p-6">
              {optionsLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <LoaderCircle
                    size={26}
                    className="animate-spin text-[#D87950]"
                  />
                  <p className="mt-3 text-xs text-[#817B71]">
                    Loading admissions and insurers...
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <label
                      htmlFor="admission"
                      className="mb-2 block text-xs font-semibold text-[#4C4942]"
                    >
                      Admission <span className="text-[#B66A4D]">*</span>
                    </label>

                    <select
                      id="admission"
                      required
                      value={admissionId}
                      onChange={(event) => setAdmissionId(event.target.value)}
                      className="w-full rounded-xl border border-[#E2D9CD] bg-white px-4 py-3 text-sm text-[#20201E] outline-none transition focus:border-[#D87950] focus:ring-2 focus:ring-[#D87950]/10"
                    >
                      <option value="">Select an admission</option>
                      {options?.admissions.map((admission) => (
                        <option key={admission.id} value={admission.id}>
                          {admission.admission_number} · {admission.patient_name}
                          {admission.procedure_name
                            ? ` · ${admission.procedure_name}`
                            : ""}
                        </option>
                      ))}
                    </select>

                    {options && options.admissions.length === 0 && (
                      <p className="mt-2 text-[11px] text-[#A85E42]">
                        No admissions found. Add an admission before creating a claim.
                      </p>
                    )}
                  </div>

                  {admissionId && (
                    <div className="rounded-xl border border-[#E7DFD4] bg-white px-4 py-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#938B80]">
                        Selected admission
                      </p>
                      {(() => {
                        const selected = options?.admissions.find(
                          (item) => item.id === admissionId
                        );

                        return selected ? (
                          <>
                            <p className="mt-2 text-sm font-semibold text-[#20201E]">
                              {selected.patient_name}
                            </p>
                            <p className="mt-1 text-xs text-[#817B71]">
                              {selected.diagnosis}
                            </p>
                            {selected.procedure_name && (
                              <p className="mt-1 text-xs text-[#817B71]">
                                Procedure: {selected.procedure_name}
                              </p>
                            )}
                          </>
                        ) : null;
                      })()}
                    </div>
                  )}

                  <div>
                    <label
                      htmlFor="insurer"
                      className="mb-2 block text-xs font-semibold text-[#4C4942]"
                    >
                      Insurer <span className="text-[#B66A4D]">*</span>
                    </label>

                    <select
                      id="insurer"
                      required
                      value={insurerId}
                      onChange={(event) => setInsurerId(event.target.value)}
                      className="w-full rounded-xl border border-[#E2D9CD] bg-white px-4 py-3 text-sm text-[#20201E] outline-none transition focus:border-[#D87950] focus:ring-2 focus:ring-[#D87950]/10"
                    >
                      <option value="">Select an insurer</option>
                      {options?.insurers.map((insurer) => (
                        <option key={insurer.id} value={insurer.id}>
                          {insurer.name}
                        </option>
                      ))}
                    </select>

                    {options && options.insurers.length === 0 && (
                      <p className="mt-2 text-[11px] text-[#A85E42]">
                        No active insurers found.
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="tpa"
                      className="mb-2 block text-xs font-semibold text-[#4C4942]"
                    >
                      TPA <span className="font-normal text-[#938B80]">(Optional)</span>
                    </label>

                    <select
                      id="tpa"
                      value={tpaId}
                      onChange={(event) => setTpaId(event.target.value)}
                      className="w-full rounded-xl border border-[#E2D9CD] bg-white px-4 py-3 text-sm text-[#20201E] outline-none transition focus:border-[#D87950] focus:ring-2 focus:ring-[#D87950]/10"
                    >
                      <option value="">No TPA / Direct insurer</option>
                      {options?.tpas.map((tpa) => (
                        <option key={tpa.id} value={tpa.id}>
                          {tpa.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="requestedAmount"
                      className="mb-2 block text-xs font-semibold text-[#4C4942]"
                    >
                      Requested amount (₹){" "}
                      <span className="text-[#B66A4D]">*</span>
                    </label>

                    <div className="flex items-center overflow-hidden rounded-xl border border-[#E2D9CD] bg-white focus-within:border-[#D87950] focus-within:ring-2 focus-within:ring-[#D87950]/10">
                      <span className="border-r border-[#E7DFD4] px-4 py-3 text-sm text-[#817B71]">
                        ₹
                      </span>
                      <input
                        id="requestedAmount"
                        type="number"
                        min="0.01"
                        step="0.01"
                        required
                        value={requestedAmount}
                        onChange={(event) =>
                          setRequestedAmount(event.target.value)
                        }
                        placeholder="85000.00"
                        className="w-full bg-transparent px-4 py-3 text-sm text-[#20201E] outline-none placeholder:text-[#B8B0A5]"
                      />
                    </div>
                  </div>
                </>
              )}

              {formError && (
                <div className="flex items-start gap-2 rounded-xl border border-[#EED4C5] bg-[#F9E8DE] px-4 py-3 text-xs leading-5 text-[#A85E42]">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  <p>{formError}</p>
                </div>
              )}

              {!optionsLoading && (
                <div className="flex flex-col-reverse gap-3 border-t border-[#E7DFD4] pt-5 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={closeCreateModal}
                    disabled={submitting}
                    className="rounded-xl border border-[#E2D9CD] bg-white px-5 py-3 text-xs font-semibold text-[#817B71] transition hover:bg-[#F5F0E8] disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={
                      submitting ||
                      !options?.admissions.length ||
                      !options?.insurers.length
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#20201E] px-6 py-3 text-xs font-semibold text-white transition hover:bg-[#393832] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <LoaderCircle size={15} className="animate-spin" />
                        Creating claim...
                      </>
                    ) : (
                      <>
                        <Plus size={15} />
                        Create claim
                      </>
                    )}
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
