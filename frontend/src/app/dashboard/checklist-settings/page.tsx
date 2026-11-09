
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ClipboardList,
  LoaderCircle,
  Plus,
  RefreshCw,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  FileText,
  Power,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

type ChecklistRule = {
  id: string;
  insurer_id: string;
  procedure_name: string;
  document_type: string;
  is_mandatory: boolean;
  is_active: boolean;
  created_at: string;
};

async function apiRequest<T>(
  endpoint: string,
  token: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API}/api/v1${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.detail || `Request failed (${response.status})`);
  }

  return response.json();
}

export default function ChecklistSettingsPage() {
  const router = useRouter();
  const { user, token, loading, hasRole } = useAuth();

  const isDeskHead = hasRole("Desk Head");

  const [rules, setRules] = useState<ChecklistRule[]>([]);
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingRuleId, setUpdatingRuleId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [insurerId, setInsurerId] = useState("");
  const [procedureName, setProcedureName] = useState("");
  const [documentType, setDocumentType] = useState("");
  const [isMandatory, setIsMandatory] = useState(true);

  const loadRules = useCallback(async () => {
    if (!token) return;

    setFetching(true);
    setError("");

    try {
      const data = await apiRequest<ChecklistRule[]>(
        "/checklist-rules/",
        token
      );
      setRules(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load checklist rules."
      );
    } finally {
      setFetching(false);
    }
  }, [token]);

  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [loading, user, router]);

  useEffect(() => {
    if (!loading && user && token) loadRules();
  }, [loading, user, token, loadRules]);

  async function handleCreateRule(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await apiRequest<ChecklistRule>("/checklist-rules/", token, {
        method: "POST",
        body: JSON.stringify({
          insurer_id: insurerId.trim(),
          procedure_name: procedureName.trim(),
          document_type: documentType.trim(),
          is_mandatory: isMandatory,
        }),
      });

      setSuccess("Checklist rule created successfully.");
      setInsurerId("");
      setProcedureName("");
      setDocumentType("");
      setIsMandatory(true);

      await loadRules();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to create checklist rule."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleRule(rule: ChecklistRule) {
    if (!token || updatingRuleId) return;

    setUpdatingRuleId(rule.id);
    setError("");
    setSuccess("");

    try {
      const updated = await apiRequest<ChecklistRule>(
        `/checklist-rules/${rule.id}/status`,
        token,
        {
          method: "PATCH",
          body: JSON.stringify({
            is_active: !rule.is_active,
          }),
        }
      );

      setRules((current) =>
        current.map((item) => (item.id === rule.id ? updated : item))
      );

      setSuccess(
        updated.is_active
          ? "Checklist rule activated successfully."
          : "Checklist rule deactivated successfully."
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to update checklist rule."
      );
    } finally {
      setUpdatingRuleId(null);
    }
  }

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f8f5]">
        <LoaderCircle className="animate-spin text-[#24483c]" size={28} />
      </div>
    );
  }

  if (!isDeskHead) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f8f5] p-6">
        <div className="max-w-md rounded-2xl border border-[#e9ece7] bg-white p-8 text-center">
          <ShieldCheck className="mx-auto text-[#b66a4d]" size={32} />
          <h1 className="mt-4 text-lg font-semibold text-[#1d3029]">
            Access restricted
          </h1>
          <p className="mt-2 text-sm text-[#77827b]">
            Only the Desk Head can manage checklist rules.
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="mt-6 rounded-xl bg-[#24483c] px-5 py-3 text-sm font-semibold text-white"
          >
            Back to dashboard
          </button>
        </div>
      </main>
    );
  }

  const activeRules = rules.filter((rule) => rule.is_active);
  const mandatoryRules = activeRules.filter((rule) => rule.is_mandatory);

  return (
    <main className="min-h-screen bg-[#f7f8f5] px-5 py-7 text-[#1d3029] sm:px-8">
      <div className="mx-auto max-w-[1200px]">
        <button
          onClick={() => router.push("/dashboard")}
          className="mb-6 inline-flex items-center gap-2 text-sm text-[#77827b] transition hover:text-[#24483c]"
        >
          <ArrowLeft size={16} />
          Back to dashboard
        </button>

        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-semibold tracking-[0.14em] text-[#829087]">
              ADMINISTRATION
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.05em]">
              Checklist settings
            </h1>
            <p className="mt-2 text-sm text-[#7b8780]">
              Configure required documents for each insurer and procedure.
            </p>
          </div>

          <button
            onClick={loadRules}
            disabled={fetching}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#e5e9e3] bg-white px-4 py-3 text-sm font-medium text-[#52665a] hover:bg-[#f9faf8] disabled:opacity-50"
          >
            <RefreshCw size={15} className={fetching ? "animate-spin" : ""} />
            Refresh rules
          </button>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-[#e9ece7] bg-white p-5">
            <p className="text-xs text-[#89918d]">Total rules</p>
            <p className="mt-3 text-3xl font-semibold">{rules.length}</p>
          </div>
          <div className="rounded-2xl border border-[#e9ece7] bg-white p-5">
            <p className="text-xs text-[#89918d]">Active rules</p>
            <p className="mt-3 text-3xl font-semibold text-[#47765b]">
              {activeRules.length}
            </p>
          </div>
          <div className="rounded-2xl border border-[#e9ece7] bg-white p-5">
            <p className="text-xs text-[#89918d]">Mandatory documents</p>
            <p className="mt-3 text-3xl font-semibold text-[#b66a4d]">
              {mandatoryRules.length}
            </p>
          </div>
        </div>

        {(error || success) && (
          <div
            className={`mt-5 flex items-start gap-2 rounded-xl border p-3 text-xs ${
              error
                ? "border-red-100 bg-red-50 text-red-700"
                : "border-green-100 bg-green-50 text-green-700"
            }`}
          >
            {error ? (
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
            ) : (
              <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
            )}
            {error || success}
          </div>
        )}

        <div className="mt-7 grid items-start gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)]">
          <section className="rounded-2xl border border-[#e9ece7] bg-white p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-[#eaf0ed] p-3 text-[#47705b]">
                <Plus size={19} />
              </div>
              <div>
                <h2 className="text-base font-semibold">Add a checklist rule</h2>
                <p className="mt-1 text-xs text-[#89918d]">
                  Define a document requirement.
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateRule} className="mt-6 space-y-5">
              <div>
                <label className="mb-2 block text-xs font-semibold">
                  Insurer ID
                </label>
                <input
                  required
                  value={insurerId}
                  onChange={(e) => setInsurerId(e.target.value)}
                  placeholder="Paste insurer UUID"
                  className="w-full rounded-xl border border-[#e5e9e3] bg-[#fcfdfb] px-4 py-3 text-sm outline-none transition focus:border-[#789b83] focus:ring-2 focus:ring-[#eaf0ed]"
                />
                <p className="mt-2 text-[11px] text-[#929c95]">
                  Use the insurer UUID from your database.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold">
                  Procedure name
                </label>
                <input
                  required
                  minLength={2}
                  maxLength={255}
                  value={procedureName}
                  onChange={(e) => setProcedureName(e.target.value)}
                  placeholder="e.g. Total knee replacement"
                  className="w-full rounded-xl border border-[#e5e9e3] bg-[#fcfdfb] px-4 py-3 text-sm outline-none transition focus:border-[#789b83] focus:ring-2 focus:ring-[#eaf0ed]"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold">
                  Required document
                </label>
                <input
                  required
                  minLength={2}
                  maxLength={80}
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  placeholder="e.g. Ultrasound report"
                  className="w-full rounded-xl border border-[#e5e9e3] bg-[#fcfdfb] px-4 py-3 text-sm outline-none transition focus:border-[#789b83] focus:ring-2 focus:ring-[#eaf0ed]"
                />
              </div>

              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#e9ece7] bg-[#fafbf9] p-4">
                <input
                  type="checkbox"
                  checked={isMandatory}
                  onChange={(e) => setIsMandatory(e.target.checked)}
                  className="h-4 w-4 accent-[#47765b]"
                />
                <span>
                  <span className="block text-sm font-semibold">
                    Mandatory document
                  </span>
                  <span className="mt-1 block text-xs text-[#89918d]">
                    Claim cannot be considered document-complete without it.
                  </span>
                </span>
              </label>

              <button
                type="submit"
                disabled={saving}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#24483c] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#19392f] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <LoaderCircle size={17} className="animate-spin" />
                ) : (
                  <Plus size={17} />
                )}
                {saving ? "Creating rule..." : "Create checklist rule"}
              </button>
            </form>
          </section>

          <section className="rounded-2xl border border-[#e9ece7] bg-white">
            <div className="flex items-center justify-between border-b border-[#edf0eb] px-5 py-5">
              <div>
                <h2 className="text-base font-semibold">Existing rules</h2>
                <p className="mt-1 text-xs text-[#89918d]">
                  Requirements configured for insurers and procedures.
                </p>
              </div>
              <ClipboardList size={20} className="text-[#789b83]" />
            </div>

            {fetching ? (
              <div className="flex items-center justify-center gap-2 p-12 text-sm text-[#89918d]">
                <LoaderCircle size={18} className="animate-spin" />
                Loading rules...
              </div>
            ) : rules.length === 0 ? (
              <div className="px-6 py-14 text-center">
                <FileText size={28} className="mx-auto text-[#a0aaa2]" />
                <p className="mt-3 text-sm font-semibold">
                  No checklist rules found
                </p>
                <p className="mt-2 text-xs text-[#89918d]">
                  Add your first rule using the form.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#edf0eb]">
                {rules.map((rule) => {
                  const isUpdating = updatingRuleId === rule.id;

                  return (
                    <div key={rule.id} className="px-5 py-5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="rounded-lg bg-[#f1f4f0] px-2.5 py-1 text-[10px] font-semibold text-[#61766a]">
                          {rule.procedure_name}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                            rule.is_active
                              ? "bg-green-50 text-green-700"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {rule.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>

                      <div className="mt-4 flex items-start gap-3">
                        <div className="rounded-lg bg-[#eaf0ed] p-2 text-[#47705b]">
                          <FileText size={17} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold">
                            {rule.document_type}
                          </p>
                          <p className="mt-1 break-all text-[10px] text-[#929c95]">
                            Insurer: {rule.insurer_id}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-3">
                        <div>
                          <p
                            className={`text-[11px] font-medium ${
                              rule.is_mandatory
                                ? "text-[#b66a4d]"
                                : "text-[#77827b]"
                            }`}
                          >
                            {rule.is_mandatory ? "Mandatory" : "Optional"}
                          </p>
                          <p className="mt-1 text-[10px] text-[#a0a8a2]">
                            {new Date(rule.created_at).toLocaleDateString()}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleToggleRule(rule)}
                          disabled={!!updatingRuleId}
                          className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                            rule.is_active
                              ? "border border-red-100 bg-red-50 text-red-700 hover:bg-red-100"
                              : "border border-green-100 bg-green-50 text-green-700 hover:bg-green-100"
                          }`}
                        >
                          {isUpdating ? (
                            <LoaderCircle size={14} className="animate-spin" />
                          ) : (
                            <Power size={14} />
                          )}
                          {isUpdating
                            ? "Updating..."
                            : rule.is_active
                              ? "Deactivate"
                              : "Activate"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <p className="mt-6 text-[11px] leading-5 text-[#929c95]">
          Checklist rules can be created, activated and deactivated by the Desk
          Head. Existing claim checklist records are preserved when a rule is
          deactivated.
        </p>
      </div>
    </main>
  );
}
