
"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Upload,
  FileText,
  RefreshCw,
  Download,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
  ShieldCheck,
  FileCheck2,
  Paperclip,
  X,
  Eye,
  AlertTriangle,
  Save,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { apiRequest } from "@/lib/api";

type ChecklistItem = {
  id: string;
  claim_id: string;
  rule_id: string;
  document_id: string | null;
  status: string;
  is_verified: boolean;
  created_at: string;
  rule: {
    id: string;
    insurer_id: string;
    procedure_name: string;
    document_type: string;
    is_mandatory: boolean;
    is_active: boolean;
    created_at: string;
  };
};

type FieldEvidence = {
  snippet: string | null;
  matched: boolean;
};

type ExtractedFields = Record<string, string | number | null>;

type DocumentItem = {
  id: string;
  claim_id: string;
  uploaded_by: string;
  uploaded_by_name?: string;
  original_filename: string;
  mime_type: string;
  file_size: number;
  document_type: string | null;
  classification_status: string;
  created_at: string;
  updated_at?: string;
  extracted_fields?: ExtractedFields | null;
  extraction_evidence?: Record<string, FieldEvidence> | null;
  confirmed_fields?: ExtractedFields | null;
  extraction_review_status?: string;
};

type ChecklistSuggestion = {
  checklist_item_id: string;
  rule_id: string;
  document_type: string;
  is_mandatory: boolean;
  status: string;
  is_verified: boolean;
  already_has_document: boolean;
  suggested: boolean;
};

type ProcessResult = {
  document_id: string;
  original_filename: string;
  document_type: string | null;
  classification_status: string;
  method: string;
  ocr_confidence: number | null;
  classification_confidence: number;
  review_required: boolean;
  matched_keywords: string[];
  page_count: number;
  extracted_fields: ExtractedFields;
  field_evidence?: Record<string, FieldEvidence>;
  confirmed_fields?: ExtractedFields | null;
  extraction_review_status?: string;
  checklist_suggestions: ChecklistSuggestion[];
  extracted_text: string;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

const formatSize = (bytes: number) => {
  if (!bytes) return "0 KB";

  return bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(1)} KB`
    : `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const formatDate = (value: string) =>
  new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const formatConfidence = (value: number | null | undefined) =>
  value == null || !Number.isFinite(value)
    ? "Not available"
    : `${(value * 100).toFixed(1)}%`;

function StatusBadge({ status }: { status: string }) {
  const normalized = status?.toUpperCase() || "PENDING";

  const styles: Record<string, string> = {
    VERIFIED: "bg-emerald-50 text-emerald-700 border-emerald-200",
    UPLOADED: "bg-blue-50 text-blue-700 border-blue-200",
    MISSING: "bg-red-50 text-red-700 border-red-200",
    COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-200",
    PROCESSED: "bg-emerald-50 text-emerald-700 border-emerald-200",
    CLASSIFIED: "bg-emerald-50 text-emerald-700 border-emerald-200",
    EXTRACTED: "bg-emerald-50 text-emerald-700 border-emerald-200",
    CONFIRMED: "bg-emerald-50 text-emerald-700 border-emerald-200",
    REVIEW_REQUIRED: "bg-amber-50 text-amber-700 border-amber-200",
    PROCESSING: "bg-amber-50 text-amber-700 border-amber-200",
    PENDING: "bg-amber-50 text-amber-700 border-amber-200",
    FAILED: "bg-red-50 text-red-700 border-red-200",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
        styles[normalized] || styles.PENDING
      }`}
    >
      {normalized.replaceAll("_", " ")}
    </span>
  );
}

function Metric({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[#e8e1d7] bg-white p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-[#898176]">{label}</p>
        <span className="rounded-lg bg-[#f5f0e8] p-2 text-[#b96f4d]">
          {icon}
        </span>
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-[#292722]">
        {value}
      </p>
    </div>
  );
}

function ResultMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-[#e8e1d7] bg-white p-3">
      <p className="text-xs text-[#898176]">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-[#292722]">
        {value}
      </p>
    </div>
  );
}

function ClaimDocumentsContent() {
  const params = useParams<{ claimId: string }>();
  const router = useRouter();
  const claimId = params.claimId;

  const { token, user, loading: authLoading } = useAuth();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedType, setSelectedType] = useState("");

  const [processingResults, setProcessingResults] = useState<
    Record<string, ProcessResult>
  >({});

  const [editedFields, setEditedFields] = useState<
    Record<string, ExtractedFields>
  >({});

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [processingId, setProcessingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const canAccess =
    user?.roles?.some((role) =>
      ["Desk Executive", "Desk Head"].includes(role)
    ) ?? false;

  const loadData = useCallback(async () => {
    if (!token || !claimId) {
      setLoading(false);
      return;
    }

    setError("");

    try {
      const [docs, items] = await Promise.all([
        apiRequest<DocumentItem[]>(
          `/claims/${claimId}/documents`,
          {},
          token
        ),
        apiRequest<ChecklistItem[]>(
          `/claims/${claimId}/checklist`,
          {},
          token
        ),
      ]);

      setDocuments(docs);
      setChecklist(items);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load claim documents."
      );
    } finally {
      setLoading(false);
    }
  }, [claimId, token]);

  useEffect(() => {
    if (authLoading) return;

    if (!token || !canAccess) {
      setLoading(false);
      return;
    }

    void loadData();
  }, [authLoading, token, canAccess, loadData]);

  const mandatoryItems = useMemo(
    () => checklist.filter((item) => item.rule?.is_mandatory),
    [checklist]
  );

  const verifiedCount = useMemo(
    () => checklist.filter((item) => item.is_verified).length,
    [checklist]
  );

  const missingCount = useMemo(
    () => checklist.filter((item) => item.status === "MISSING").length,
    [checklist]
  );

  const progress = checklist.length
    ? Math.round((verifiedCount / checklist.length) * 100)
    : 0;

  const documentTypes = useMemo(
    () =>
      Array.from(
        new Set(
          checklist
            .map((item) => item.rule?.document_type)
            .filter(Boolean)
        )
      ),
    [checklist]
  );

  function getProcessResult(doc: DocumentItem): ProcessResult | undefined {
    if (processingResults[doc.id]) {
      return processingResults[doc.id];
    }

    if (!doc.extracted_fields) {
      return undefined;
    }

    return {
      document_id: doc.id,
      original_filename: doc.original_filename,
      document_type: doc.document_type,
      classification_status: doc.classification_status,
      method: "Previously processed",
      ocr_confidence: null,
      classification_confidence: 0,
      review_required: doc.classification_status === "REVIEW_REQUIRED",
      matched_keywords: [],
      page_count: 0,
      extracted_fields: doc.extracted_fields,
      field_evidence: doc.extraction_evidence ?? {},
      confirmed_fields: doc.confirmed_fields ?? null,
      extraction_review_status:
        doc.extraction_review_status ?? "PENDING",
      checklist_suggestions: [],
      extracted_text: "",
    };
  }

  async function runDocumentProcessing(documentId: string) {
    if (!token) return;

    setProcessingId(documentId);
    setError("");
    setNotice("");

    try {
      const result = await apiRequest<ProcessResult>(
        `/documents/${documentId}/process`,
        { method: "POST" },
        token
      );

      setProcessingResults((previous) => ({
        ...previous,
        [documentId]: result,
      }));

      setEditedFields((previous) => ({
        ...previous,
        [documentId]: result.extracted_fields || {},
      }));

      await loadData();

      setNotice(
        result.review_required
          ? "Document processed. Human review is required."
          : "Document classified. Review the extracted fields and checklist suggestions."
      );

      return result;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "AI document processing failed."
      );

      throw err;
    } finally {
      setProcessingId(null);
    }
  }

  async function generateChecklist() {
    if (!token) return;

    setGenerating(true);
    setError("");
    setNotice("");

    try {
      await apiRequest<ChecklistItem[]>(
        `/claims/${claimId}/checklist/generate`,
        { method: "POST" },
        token
      );

      await loadData();
      setNotice("Checklist generated successfully.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Checklist generation failed."
      );
    } finally {
      setGenerating(false);
    }
  }

  async function uploadDocument() {
    if (!token || !selectedFile) return;

    setUploading(true);
    setError("");
    setNotice("");

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      if (selectedType) {
        formData.append("document_type", selectedType);
      }

      const uploaded = await apiRequest<DocumentItem>(
        `/claims/${claimId}/documents`,
        {
          method: "POST",
          body: formData,
        },
        token
      );

      setSelectedFile(null);
      setSelectedType("");

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      await loadData();

      setNotice("Document uploaded. Starting OCR and classification...");

      try {
        await runDocumentProcessing(uploaded.id);
      } catch {
        // Uploaded document remains saved. Processing can be retried.
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Document upload failed."
      );
    } finally {
      setUploading(false);
    }
  }

  async function processDocument(documentId: string) {
    try {
      await runDocumentProcessing(documentId);
    } catch {
      // Error is already displayed.
    }
  }

  async function attachDocument(itemId: string, documentId: string) {
    if (!token || !documentId) return;

    setUpdatingId(itemId);
    setError("");
    setNotice("");

    try {
      await apiRequest(
        `/checklist-items/${itemId}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            document_id: documentId,
          }),
        },
        token
      );

      await loadData();
      setNotice("Document attached. Verify it after reviewing the file.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not attach document."
      );
    } finally {
      setUpdatingId(null);
    }
  }

  async function verifyItem(itemId: string) {
    if (!token) return;

    setUpdatingId(itemId);
    setError("");
    setNotice("");

    try {
      await apiRequest(
        `/checklist-items/${itemId}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            is_verified: true,
          }),
        },
        token
      );

      await loadData();
      setNotice("Checklist item verified successfully.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Verification failed."
      );
    } finally {
      setUpdatingId(null);
    }
  }

  async function confirmExtractions(documentId: string) {
    if (!token) return;

    const doc = documents.find((item) => item.id === documentId);
    if (!doc) return;

    const result = getProcessResult(doc);

    const fields =
      editedFields[documentId] ??
      result?.confirmed_fields ??
      result?.extracted_fields ??
      {};

    if (!Object.keys(fields).length) {
      setError("No extracted fields are available to confirm.");
      return;
    }

    setConfirmingId(documentId);
    setError("");
    setNotice("");

    try {
      await apiRequest(
        `/documents/${documentId}/extractions/confirm`,
        {
          method: "PATCH",
          body: JSON.stringify({ fields }),
        },
        token
      );

      setNotice("Extracted fields reviewed and confirmed successfully.");

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not confirm extracted fields."
      );
    } finally {
      setConfirmingId(null);
    }
  }

  async function downloadDocument(doc: DocumentItem) {
    if (!token) return;

    setDownloadingId(doc.id);
    setError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v1/documents/${doc.id}/download`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.detail || "Document download failed.");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = doc.original_filename;

      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      URL.revokeObjectURL(url);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Download failed."
      );
    } finally {
      setDownloadingId(null);
    }
  }

  const handleFileSelection = (file: File | null) => {
    setError("");
    setNotice("");

    if (!file) {
      setSelectedFile(null);
      return;
    }

    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
    ];

    if (!allowedTypes.includes(file.type)) {
      setError("Only PDF, JPG, JPEG and PNG files are supported.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("Maximum file size allowed is 10 MB.");
      return;
    }

    setSelectedFile(file);
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f0e8]">
        <Loader2 className="h-7 w-7 animate-spin text-[#b96f4d]" />
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f0e8] p-6">
        <div className="max-w-md rounded-2xl border border-[#e8e1d7] bg-white p-8 text-center">
          <ShieldCheck className="mx-auto mb-3 h-9 w-9 text-red-500" />
          <h2 className="text-lg font-semibold text-[#292722]">
            Access restricted
          </h2>
          <p className="mt-2 text-sm text-[#898176]">
            This workspace is available to Insurance Desk users only.
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="mt-5 rounded-xl bg-[#292722] px-5 py-2.5 text-sm font-semibold text-white"
          >
            Back to dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f0e8] px-4 py-6 text-[#292722] sm:px-7 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <button
          onClick={() => router.push(`/dashboard/claims/${claimId}`)}
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-[#898176] transition hover:text-[#b96f4d]"
        >
          <ArrowLeft size={16} />
          Back to claim
        </button>

        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#b96f4d]">
              <FileCheck2 size={14} />
              ClaimFlow / Documentation
            </div>

            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Documents & checklist
            </h1>

            <p className="mt-2 text-sm text-[#898176]">
              Upload, classify, review and verify claim documents.
            </p>

            <p className="mt-2 break-all font-mono text-xs text-[#a49b8f]">
              Claim ID: {claimId}
            </p>
          </div>

          <button
            onClick={() => void loadData()}
            className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-[#e4dbcf] bg-white px-4 py-2.5 text-sm font-semibold text-[#62594e] transition hover:bg-[#faf7f2] sm:self-auto"
          >
            <RefreshCw size={15} />
            Refresh
          </button>
        </div>

        {(error || notice) && (
          <div
            className={`mt-6 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
              error
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            {error ? (
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
            ) : (
              <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
            )}

            <span>{error || notice}</span>

            <button
              onClick={() => {
                setError("");
                setNotice("");
              }}
              className="ml-auto"
              aria-label="Dismiss notification"
            >
              <X size={16} />
            </button>
          </div>
        )}

        <section className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric
            label="Total documents"
            value={documents.length}
            icon={<FileText size={18} />}
          />
          <Metric
            label="Checklist items"
            value={checklist.length}
            icon={<FileCheck2 size={18} />}
          />
          <Metric
            label="Missing documents"
            value={missingCount}
            icon={<AlertCircle size={18} />}
          />
          <Metric
            label="Verified"
            value={`${verifiedCount}/${checklist.length}`}
            icon={<ShieldCheck size={18} />}
          />
        </section>

        <section className="mt-7 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-2xl border border-[#e8e1d7] bg-white p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-[#f5f0e8] p-2 text-[#b96f4d]">
                <Upload size={18} />
              </div>
              <div>
                <h2 className="font-semibold">Upload documents</h2>
                <p className="text-xs text-[#898176]">
                  PDF, JPG or PNG · Maximum 10 MB
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-xl border-2 border-dashed border-[#e4dbcf] bg-[#fcfaf7] p-6 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/jpeg,image/png"
                className="hidden"
                onChange={(event) =>
                  handleFileSelection(event.target.files?.[0] || null)
                }
              />

              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-[#f5f0e8] text-[#b96f4d]">
                <Paperclip size={20} />
              </div>

              {selectedFile ? (
                <>
                  <p className="mt-3 break-all text-sm font-semibold">
                    {selectedFile.name}
                  </p>
                  <p className="mt-1 text-xs text-[#898176]">
                    {formatSize(selectedFile.size)}
                  </p>
                  <button
                    onClick={() => {
                      setSelectedFile(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = "";
                      }
                    }}
                    className="mt-2 text-xs font-semibold text-red-600"
                  >
                    Remove file
                  </button>
                </>
              ) : (
                <>
                  <p className="mt-3 text-sm font-semibold">
                    Select a document to upload
                  </p>
                  <p className="mt-1 text-xs text-[#898176]">
                    Choose a file from your device
                  </p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-4 rounded-lg border border-[#e4dbcf] bg-white px-4 py-2 text-xs font-semibold text-[#8f583f] hover:bg-[#faf7f2]"
                  >
                    Browse files
                  </button>
                </>
              )}
            </div>

            <label className="mt-5 block text-xs font-semibold text-[#62594e]">
              Document category
            </label>

            <select
              value={selectedType}
              onChange={(event) => setSelectedType(event.target.value)}
              className="mt-2 w-full rounded-xl border border-[#e4dbcf] bg-white px-3 py-3 text-sm outline-none focus:border-[#b96f4d]"
            >
              <option value="">Let AI classify this document</option>
              {documentTypes.map((type) => (
                <option value={type} key={type}>
                  {type}
                </option>
              ))}
            </select>

            <button
              disabled={!selectedFile || uploading}
              onClick={() => void uploadDocument()}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#292722] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#454139] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {uploading ? (
                <Loader2 size={17} className="animate-spin" />
              ) : (
                <Sparkles size={17} />
              )}
              {uploading ? "Uploading & processing..." : "Upload & classify"}
            </button>

            <p className="mt-3 text-center text-[11px] leading-5 text-[#a49b8f]">
              OCR and classification run after upload. Staff must review
              the extracted information before confirmation.
            </p>
          </div>

          <div className="rounded-2xl border border-[#e8e1d7] bg-white p-5 sm:p-6">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-[#f5f0e8] p-2 text-[#b96f4d]">
                    <ShieldCheck size={18} />
                  </div>
                  <h2 className="font-semibold">Checklist readiness</h2>
                </div>
                <p className="mt-2 text-xs text-[#898176]">
                  Requirements based on insurer and procedure rules.
                </p>
              </div>

              <button
                onClick={() => void generateChecklist()}
                disabled={generating}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#e4dbcf] px-3 py-2 text-xs font-semibold text-[#8f583f] hover:bg-[#faf7f2] disabled:opacity-50"
              >
                {generating ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <RefreshCw size={14} />
                )}
                Generate checklist
              </button>
            </div>

            <div className="mt-7 flex items-end justify-between">
              <div>
                <p className="text-3xl font-semibold tracking-tight">
                  {progress}%
                </p>
                <p className="mt-1 text-xs text-[#898176]">
                  Verification progress
                </p>
              </div>
              <p className="text-xs font-medium text-[#62594e]">
                {verifiedCount} of {checklist.length} verified
              </p>
            </div>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#eee8df]">
              <div
                className="h-full rounded-full bg-[#b96f4d] transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-[#faf7f2] p-3">
                <p className="text-xl font-semibold text-[#292722]">
                  {mandatoryItems.length}
                </p>
                <p className="mt-1 text-xs text-[#898176]">
                  Mandatory items
                </p>
              </div>
              <div className="rounded-xl bg-[#fff8f0] p-3">
                <p className="text-xl font-semibold text-[#b47731]">
                  {missingCount}
                </p>
                <p className="mt-1 text-xs text-[#898176]">
                  Still missing
                </p>
              </div>
            </div>

            {!checklist.length && (
              <div className="mt-5 rounded-xl border border-dashed border-[#e4dbcf] p-5 text-center">
                <FileCheck2 className="mx-auto h-7 w-7 text-[#b96f4d]" />
                <p className="mt-2 text-sm font-semibold">
                  No checklist generated yet
                </p>
                <p className="mt-1 text-xs text-[#898176]">
                  Generate the checklist to see required documents.
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="mt-7 rounded-2xl border border-[#e8e1d7] bg-white">
          <div className="flex flex-col justify-between gap-2 border-b border-[#eee8df] px-5 py-5 sm:flex-row sm:items-center sm:px-6">
            <div>
              <h2 className="font-semibold">Required documents</h2>
              <p className="mt-1 text-xs text-[#898176]">
                Attach uploaded documents and verify each requirement.
              </p>
            </div>
            <span className="text-xs text-[#898176]">
              {checklist.length} requirements
            </span>
          </div>

          {checklist.length ? (
            <div className="divide-y divide-[#eee8df]">
              {checklist.map((item) => {
                const attachedDocument = documents.find(
                  (doc) => doc.id === item.document_id
                );

                return (
                  <div
                    key={item.id}
                    className="flex flex-col gap-4 px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <div
                        className={`mt-0.5 rounded-lg p-2 ${
                          item.is_verified
                            ? "bg-emerald-50 text-emerald-700"
                            : item.status === "MISSING"
                              ? "bg-red-50 text-red-600"
                              : "bg-[#f5f0e8] text-[#b96f4d]"
                        }`}
                      >
                        {item.is_verified ? (
                          <CheckCircle2 size={18} />
                        ) : (
                          <FileText size={18} />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-semibold">
                            {item.rule?.document_type || "Document requirement"}
                          </h3>
                          {item.rule?.is_mandatory && (
                            <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-600">
                              Mandatory
                            </span>
                          )}
                        </div>

                        <p className="mt-1 text-xs text-[#898176]">
                          {item.rule?.procedure_name || "Procedure not specified"}
                        </p>

                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <StatusBadge status={item.status} />
                          {attachedDocument && (
                            <span className="max-w-[220px] truncate text-xs text-[#62594e]">
                              {attachedDocument.original_filename}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                      <select
                        value={item.document_id || ""}
                        disabled={!!item.is_verified || updatingId === item.id}
                        onChange={(event) =>
                          void attachDocument(item.id, event.target.value)
                        }
                        className="min-w-0 max-w-full rounded-lg border border-[#e4dbcf] bg-white px-3 py-2 text-xs outline-none focus:border-[#b96f4d] sm:max-w-[230px]"
                      >
                        <option value="">Attach a document</option>
                        {documents.map((doc) => (
                          <option value={doc.id} key={doc.id}>
                            {doc.original_filename}
                          </option>
                        ))}
                      </select>

                      {!item.is_verified && item.document_id && (
                        <button
                          onClick={() => void verifyItem(item.id)}
                          disabled={updatingId === item.id}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-[#292722] px-3 py-2 text-xs font-semibold text-white hover:bg-[#454139] disabled:opacity-50"
                        >
                          {updatingId === item.id ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <CheckCircle2 size={13} />
                          )}
                          Verify
                        </button>
                      )}

                      {item.is_verified && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                          <ShieldCheck size={15} />
                          Verified
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="px-6 py-10 text-center text-sm text-[#898176]">
              Generate the checklist to see document requirements here.
            </div>
          )}
        </section>

        <section className="mt-7 rounded-2xl border border-[#e8e1d7] bg-white">
          <div className="flex items-center justify-between border-b border-[#eee8df] px-5 py-5 sm:px-6">
            <div>
              <h2 className="font-semibold">Uploaded documents</h2>
              <p className="mt-1 text-xs text-[#898176]">
                AI classification, extracted fields and review status.
              </p>
            </div>
            <span className="text-xs text-[#898176]">
              {documents.length} files
            </span>
          </div>

          {documents.length ? (
            <div className="divide-y divide-[#eee8df]">
              {documents.map((doc) => {
                const result = getProcessResult(doc);

                const suggestions =
                  result?.checklist_suggestions?.filter(
                    (suggestion) => suggestion.suggested
                  ) ?? [];

                const fields =
                  editedFields[doc.id] ??
                  result?.confirmed_fields ??
                  result?.extracted_fields ??
                  {};

                const isConfirmed =
                  doc.extraction_review_status === "CONFIRMED" ||
                  result?.extraction_review_status === "CONFIRMED";

                return (
                  <div key={doc.id} className="px-5 py-5 sm:px-6">
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="rounded-lg bg-[#f5f0e8] p-2.5 text-[#b96f4d]">
                          <FileText size={18} />
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">
                            {doc.original_filename}
                          </p>
                          <p className="mt-1 text-xs text-[#898176]">
                            {doc.document_type || "Unclassified"} ·{" "}
                            {formatSize(doc.file_size)} ·{" "}
                            {formatDate(doc.created_at)}
                          </p>
                          <div className="mt-2">
                            <StatusBadge status={doc.classification_status} />
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => void processDocument(doc.id)}
                          disabled={processingId === doc.id || uploading}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-[#e4dbcf] px-3 py-2 text-xs font-semibold text-[#8f583f] hover:bg-[#faf7f2] disabled:opacity-50"
                        >
                          {processingId === doc.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Sparkles size={14} />
                          )}
                          {processingId === doc.id ? "Processing" : "AI process"}
                        </button>

                        <button
                          onClick={() => void downloadDocument(doc)}
                          disabled={downloadingId === doc.id}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-[#e4dbcf] px-3 py-2 text-xs font-semibold text-[#62594e] hover:bg-[#faf7f2] disabled:opacity-50"
                        >
                          {downloadingId === doc.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Download size={14} />
                          )}
                          Download
                        </button>
                      </div>
                    </div>

                    {result && (
                      <div className="mt-5 space-y-5 rounded-xl border border-[#e8e1d7] bg-[#fcfaf7] p-4 sm:p-5">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <Sparkles size={17} className="text-[#b96f4d]" />
                            <h3 className="text-sm font-semibold">
                              AI processing results
                            </h3>
                          </div>
                          <StatusBadge status={result.classification_status} />
                        </div>

                        {result.review_required && (
                          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800">
                            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                            <span>
                              Manual review required. Classification or OCR
                              confidence is uncertain. Check the original
                              document before using these values.
                            </span>
                          </div>
                        )}

                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                          <ResultMetric
                            label="Detected type"
                            value={result.document_type || "Not identified"}
                          />
                          <ResultMetric
                            label="Classification confidence"
                            value={formatConfidence(result.classification_confidence)}
                          />
                          <ResultMetric
                            label="OCR confidence"
                            value={formatConfidence(result.ocr_confidence)}
                          />
                          <ResultMetric
                            label="Pages"
                            value={String(result.page_count ?? "N/A")}
                          />
                        </div>

                        <div>
                          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <h4 className="text-xs font-semibold text-[#62594e]">
                                Extracted fields & source evidence
                              </h4>
                              <p className="mt-1 text-[11px] text-[#898176]">
                                Edit the extracted values and verify their
                                source before confirming.
                              </p>
                            </div>
                            <StatusBadge
                              status={
                                result.extraction_review_status || "PENDING"
                              }
                            />
                          </div>

                          {Object.keys(result.extracted_fields || {}).length ? (
                            <div className="space-y-3">
                              {Object.entries(result.extracted_fields).map(
                                ([key, value]) => {
                                  const evidence =
                                    result.field_evidence?.[key] ??
                                    doc.extraction_evidence?.[key];

                                  const currentValue =
                                    fields[key] ?? value ?? "";

                                  return (
                                    <div
                                      key={key}
                                      className="rounded-xl border border-[#e8e1d7] bg-white p-3"
                                    >
                                      <label className="text-[11px] font-semibold capitalize text-[#62594e]">
                                        {key.replaceAll("_", " ")}
                                      </label>

                                      <input
                                        type="text"
                                        value={String(currentValue)}
                                        onChange={(event) =>
                                          setEditedFields((previous) => ({
                                            ...previous,
                                            [doc.id]: {
                                              ...(previous[doc.id] ??
                                                result.extracted_fields),
                                              [key]: event.target.value,
                                            },
                                          }))
                                        }
                                        className="mt-2 w-full rounded-lg border border-[#e4dbcf] px-3 py-2 text-sm outline-none focus:border-[#b96f4d]"
                                      />

                                      <div className="mt-2 rounded-lg bg-[#faf7f2] p-3">
                                        <p className="text-[10px] font-semibold uppercase tracking-wide text-[#898176]">
                                          Original document evidence
                                        </p>

                                        {evidence?.matched &&
                                        evidence.snippet ? (
                                          <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-[#62594e]">
                                            "{evidence.snippet}"
                                          </p>
                                        ) : (
                                          <p className="mt-1 text-xs text-amber-700">
                                            No exact source match found in OCR
                                            text. Verify this value manually
                                            against the original document.
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  );
                                }
                              )}

                              <button
                                onClick={() =>
                                  void confirmExtractions(doc.id)
                                }
                                disabled={confirmingId === doc.id}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#292722] px-4 py-3 text-sm font-semibold text-white hover:bg-[#454139] disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {confirmingId === doc.id ? (
                                  <Loader2
                                    size={16}
                                    className="animate-spin"
                                  />
                                ) : (
                                  <Save size={16} />
                                )}
                                {confirmingId === doc.id
                                  ? "Saving confirmation..."
                                  : isConfirmed
                                    ? "Save reviewed changes"
                                    : "Confirm reviewed fields"}
                              </button>

                              {isConfirmed && (
                                <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-700">
                                  <CheckCircle2 size={16} />
                                  Fields reviewed and confirmed
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="rounded-lg bg-white p-3 text-xs text-[#898176]">
                              No structured fields were extracted.
                            </p>
                          )}
                        </div>

                        <div>
                          <h4 className="mb-2 text-xs font-semibold text-[#62594e]">
                            Matched classification keywords
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {result.matched_keywords?.length ? (
                              result.matched_keywords.map((keyword, index) => (
                                <span
                                  key={`${keyword}-${index}`}
                                  className="rounded-full border border-[#e4dbcf] bg-white px-2.5 py-1 text-[11px] text-[#62594e]"
                                >
                                  {keyword}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-[#898176]">
                                No matching keywords found.
                              </span>
                            )}
                          </div>
                        </div>

                        <div>
                          <h4 className="mb-2 text-xs font-semibold text-[#62594e]">
                            AI checklist suggestions
                          </h4>

                          {suggestions.length ? (
                            <div className="space-y-2">
                              {suggestions.map((suggestion) => (
                                <div
                                  key={suggestion.checklist_item_id}
                                  className="flex flex-col justify-between gap-3 rounded-xl border border-[#e4dbcf] bg-white p-3 sm:flex-row sm:items-center"
                                >
                                  <div>
                                    <p className="text-sm font-semibold">
                                      {suggestion.document_type}
                                    </p>
                                    <p className="mt-1 text-xs text-[#898176]">
                                      {suggestion.is_mandatory
                                        ? "Mandatory"
                                        : "Optional"}
                                      {suggestion.already_has_document
                                        ? " · A document is already attached"
                                        : ""}
                                    </p>
                                  </div>

                                  <button
                                    disabled={suggestion.already_has_document || updatingId === suggestion.checklist_item_id}
                                    onClick={() =>
                                      void attachDocument(
                                        suggestion.checklist_item_id,
                                        doc.id
                                      )
                                    }
                                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#292722] px-3 py-2 text-xs font-semibold text-white hover:bg-[#454139] disabled:opacity-50"
                                  >
                                    {updatingId === suggestion.checklist_item_id ? (
                                      <Loader2 size={13} className="animate-spin" />
                                    ) : (
                                      <CheckCircle2 size={13} />
                                    )}
                                    {suggestion.already_has_document
                                      ? "Already attached"
                                      : "Confirm & attach"}
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="rounded-lg border border-dashed border-[#e4dbcf] bg-white p-3 text-xs leading-5 text-[#898176]">
                              No matching checklist slot was suggested.
                              Review the document and select the correct
                              requirement manually.
                            </p>
                          )}
                        </div>

                        <details className="rounded-xl border border-[#e8e1d7] bg-white p-3">
                          <summary className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-[#62594e]">
                            <Eye size={14} />
                            View extracted OCR text
                          </summary>
                          <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-words text-xs leading-5 text-[#62594e]">
                            {result.extracted_text || "No text extracted."}
                          </pre>
                        </details>

                        <p className="text-[11px] leading-5 text-[#898176]">
                          Processing method: {result.method || "Not specified"}.
                          Classification confidence is a heuristic score,
                          not a guaranteed probability. Staff confirmation
                          remains necessary.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="px-6 py-10 text-center">
              <FileText className="mx-auto h-8 w-8 text-[#b96f4d]" />
              <p className="mt-2 text-sm font-semibold">
                No documents uploaded
              </p>
              <p className="mt-1 text-xs text-[#898176]">
                Uploaded claim documents will appear here.
              </p>
            </div>
          )}
        </section>

        <div className="mt-6 flex items-start gap-3 rounded-xl border border-[#e8e1d7] bg-[#fcfaf7] p-4 text-xs leading-5 text-[#756b5e]">
          <Clock size={17} className="mt-0.5 shrink-0" />
          <p>
            AI classification is assistive, not final approval. Desk staff
            must review extracted information, confirm the values, attach
            the correct document and verify mandatory checklist items.
          </p>
        </div>
      </div>
    </main>
  );
}

export default function ClaimDocumentsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#f5f0e8]">
          <div className="text-sm font-medium text-[#b96f4d]">
            Loading ClaimFlow...
          </div>
        </div>
      }
    >
      <ClaimDocumentsContent />
    </Suspense>
  );
}
