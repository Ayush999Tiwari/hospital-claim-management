
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity, AlertCircle, CheckCircle2, Clock3, FileText,
  HeartPulse, RefreshCw, ShieldCheck, XCircle,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { apiRequest } from "@/lib/api";

type Approval = {
  id: string;
  claim_id: string;
  claim_number: string;
  patient_name: string;
  procedure_name: string;
  insurer_name: string;
  clinical_note: string | null;
  requested_at: string;
  due_at: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
};

export default function DoctorApprovalsPage() {
  const router = useRouter();
  const { user, token, loading, hasRole } = useAuth();

  const [items, setItems] = useState<Approval[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [activeId, setActiveId] = useState<string | null>(null);

  const loadApprovals = useCallback(async () => {
    if (!token) return;

    setLoadingData(true);
    setError("");

    try {
      const data = await apiRequest<Approval[]>("/doctor/approvals", {}, token);
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load approvals.");
    } finally {
      setLoadingData(false);
    }
  }, [token]);

  useEffect(() => {
    if (!loading && !hasRole("Treating Doctor")) {
      router.replace("/dashboard");
    }
  }, [loading, hasRole, router]);

  useEffect(() => {
    if (!loading && hasRole("Treating Doctor") && token) {
      void loadApprovals();
    }
  }, [loading, hasRole, token, loadApprovals]);

  async function submitDecision(id: string, decision: "APPROVED" | "REJECTED") {
    if (!token) return;

    const note = (notes[id] || "").trim();

    if (!note) {
      setError("Please add a clinical note before submitting your decision.");
      return;
    }

    setActiveId(id);
    setError("");

    try {
      await apiRequest(`/doctor/approvals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, note }),
      }, token);

      await loadApprovals();
      setNotes((current) => ({ ...current, [id]: "" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Decision could not be saved.");
    } finally {
      setActiveId(null);
    }
  }

  if (loading || !hasRole("Treating Doctor")) {
    return <div className="p-8 text-sm text-slate-500">Loading doctor workspace...</div>;
  }

  const pending = items.filter((item) => item.status === "PENDING");
  const completed = items.filter((item) => item.status !== "PENDING");

  return (
    <main className="min-h-screen bg-[#f7f9f7] px-4 py-6 text-slate-900 sm:px-8 sm:py-9">
      <div className="mx-auto max-w-5xl space-y-7">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-[#287653]">
              <HeartPulse size={17} /> Clinical workspace
            </div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Doctor approvals
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Review clinical requests assigned to you and record your decision.
            </p>
          </div>

          <button
            onClick={loadApprovals}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium hover:bg-slate-50"
          >
            <RefreshCw size={15} /> Refresh
          </button>
        </header>

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <Clock3 className="mb-3 text-amber-600" size={20} />
            <p className="text-2xl font-semibold">{pending.length}</p>
            <p className="mt-1 text-xs text-slate-500">Awaiting your review</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <CheckCircle2 className="mb-3 text-[#287653]" size={20} />
            <p className="text-2xl font-semibold">
              {items.filter((item) => item.status === "APPROVED").length}
            </p>
            <p className="mt-1 text-xs text-slate-500">Approved</p>
          </div>
          <div className="col-span-2 rounded-2xl border border-slate-200 bg-white p-5 sm:col-span-1">
            <ShieldCheck className="mb-3 text-slate-500" size={20} />
            <p className="text-2xl font-semibold">{completed.length}</p>
            <p className="mt-1 text-xs text-slate-500">Reviewed requests</p>
          </div>
        </section>

        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle size={17} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Pending review</h2>
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
              {pending.length} pending
            </span>
          </div>

          {loadingData ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
              Loading assigned requests...
            </div>
          ) : pending.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center">
              <CheckCircle2 className="mx-auto mb-3 text-[#287653]" size={30} />
              <p className="font-medium">You are all caught up</p>
              <p className="mt-1 text-sm text-slate-500">
                No pending clinical approvals are assigned to you.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pending.map((item) => (
                <article key={item.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 p-5">
                    <div>
                      <p className="text-xs font-semibold tracking-wide text-[#287653]">
                        {item.claim_number}
                      </p>
                      <h3 className="mt-1 text-lg font-semibold">{item.patient_name}</h3>
                      <p className="mt-1 text-sm text-slate-500">{item.procedure_name}</p>
                    </div>
                    <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700">
                      Awaiting review
                    </span>
                  </div>

                  <div className="grid gap-4 p-5 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-slate-400">Insurer / TPA</p>
                      <p className="mt-1 text-sm font-medium">{item.insurer_name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Requested on</p>
                      <p className="mt-1 text-sm font-medium">
                        {new Date(item.requested_at).toLocaleString("en-IN")}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 p-5">
                    <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                      <FileText size={16} className="text-[#287653]" />
                      Clinical note / context
                    </div>
                    <div className="rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                      {item.clinical_note || "No clinical note has been attached to this request."}
                    </div>

                    <label className="mt-5 block text-sm font-medium">
                      Your review note <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={notes[item.id] || ""}
                      onChange={(e) => setNotes((current) => ({
                        ...current, [item.id]: e.target.value,
                      }))}
                      rows={3}
                      placeholder="Enter your clinical observation and reason for this decision..."
                      className="mt-2 w-full resize-y rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none transition focus:border-[#287653] focus:ring-2 focus:ring-[#287653]/10"
                    />

                    <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
                      <button
                        disabled={activeId === item.id}
                        onClick={() => submitDecision(item.id, "REJECTED")}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-3 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                      >
                        <XCircle size={16} /> Reject
                      </button>
                      <button
                        disabled={activeId === item.id}
                        onClick={() => submitDecision(item.id, "APPROVED")}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#236b4b] px-5 py-3 text-sm font-medium text-white hover:bg-[#19583d] disabled:opacity-50"
                      >
                        <CheckCircle2 size={16} />
                        {activeId === item.id ? "Submitting..." : "Approve request"}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {completed.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Recently reviewed</h2>
            {completed.map((item) => (
              <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
                <div>
                  <p className="text-sm font-medium">{item.patient_name}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {item.claim_number} · {item.procedure_name}
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                  item.status === "APPROVED"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-red-50 text-red-700"
                }`}>
                  {item.status}
                </span>
              </div>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
