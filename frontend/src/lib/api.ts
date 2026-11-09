

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://hospital-claim-management.onrender.com";


export type UserRole =
  | "Desk Executive"
  | "Desk Head"
  | "Treating Doctor"
  | "CFO";

export interface AuthenticatedUser {
  id: string;
  full_name: string;
  email: string;
  roles: UserRole[];
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface ClaimCreationOptions {
  admissions: {
    id: string;
    admission_number: string;
    patient_name: string;
    procedure_name: string | null;
    diagnosis: string;
  }[];
  insurers: {
    id: string;
    name: string;
  }[];
  tpas: {
    id: string;
    name: string;
  }[];
}

export interface CreateClaimPayload {
  admission_id: string;
  insurer_id: string;
  tpa_id: string | null;
  requested_amount: string;
}

export interface CreatedClaim {
  id: string;
  claim_number: string;
  admission_id: string;
  insurer_id: string;
  tpa_id: string | null;
  status: string;
  requested_amount: string;
  approved_amount: string | null;
  created_at: string;
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  token?: string
): Promise<T> {
  const headers = new Headers(options.headers);

  if (!(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}/api/v1${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(
      error?.detail || `Request failed with status ${response.status}`
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function loginUser(
  email: string,
  password: string,
  role: UserRole
): Promise<LoginResponse> {
  return apiRequest<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password, role }),
  });
}

export async function getCurrentUser(
  token: string
): Promise<AuthenticatedUser> {
  return apiRequest<AuthenticatedUser>("/auth/me", {}, token);
}

export async function getClaimCreationOptions(
  token: string
): Promise<ClaimCreationOptions> {
  return apiRequest<ClaimCreationOptions>(
    "/claims/options",
    {},
    token
  );
}

export async function createClaim(
  payload: CreateClaimPayload,
  token: string
): Promise<CreatedClaim> {
  return apiRequest<CreatedClaim>(
    "/claims/",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    token
  );
}
