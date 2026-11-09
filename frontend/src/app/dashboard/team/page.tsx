"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  LoaderCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
  UserCheck,
  UserX,
  Mail,
  Phone,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const API =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

type TeamMember = {
  id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  is_active: boolean;
  roles: string[];
};

const roleStyles: Record<string, string> = {
  "Desk Executive": "bg-[#eaf0ed] text-[#47705b]",
  "Desk Head": "bg-[#eeebf8] text-[#7566a3]",
  "Treating Doctor": "bg-[#e9edf8] text-[#6579a9]",
  CFO: "bg-[#f8eae2] text-[#a96045]",
};

export default function TeamPage() {
  const { user, token, loading: authLoading, hasRole } = useAuth();

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [refresh, setRefresh] = useState(0);

  const isDeskHead = hasRole("Desk Head");

  const loadTeam = useCallback(async () => {
    if (!token || !isDeskHead) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API}/api/v1/team/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(
          body?.detail || `Unable to load team (${response.status})`
        );
      }

      const data = await response.json();
      setMembers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load team members"
      );
    } finally {
      setLoading(false);
    }
  }, [token, isDeskHead]);

  useEffect(() => {
    if (!authLoading) {
      if (token && isDeskHead) loadTeam();
      else setLoading(false);
    }
  }, [authLoading, token, isDeskHead, loadTeam, refresh]);

  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      const matchesSearch = [
        member.full_name,
        member.email,
        member.phone || "",
        ...member.roles,
      ]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchesRole =
        roleFilter === "ALL" || member.roles.includes(roleFilter);

      return matchesSearch && matchesRole;
    });
  }, [members, search, roleFilter]);

  const activeCount = members.filter((member) => member.is_active).length;
  const inactiveCount = members.length - activeCount;

  const roleCounts = [
    "Desk Executive",
    "Desk Head",
    "Treating Doctor",
    "CFO",
  ].map((role) => ({
    role,
    count: members.filter((member) => member.roles.includes(role)).length,
  }));

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f8f5]">
        <LoaderCircle className="animate-spin text-[#24483c]" size={28} />
      </div>
    );
  }

  if (!user || !isDeskHead) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f8f5] p-6">
        <div className="max-w-md rounded-2xl border border-[#e9ece7] bg-white p-8 text-center">
          <ShieldCheck className="mx-auto text-[#b66a4d]" size={30} />
          <h1 className="mt-4 text-lg font-semibold">Access restricted</h1>
          <p className="mt-2 text-sm text-[#77827b]">
            Team Management is available only to the Desk Head.
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
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-xs text-[#829087] hover:text-[#24483c]"
        >
          <ArrowLeft size={14} />
          Back to workspace
        </Link>

        <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium tracking-[0.14em] text-[#829087]">
              ADMINISTRATION
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.05em]">
              Team management
            </h1>
            <p className="mt-2 text-sm text-[#7b8780]">
              Monitor team members, assigned roles and account availability.
            </p>
          </div>

          <button
            onClick={() => setRefresh((value) => value + 1)}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#e3e8e1] bg-white px-4 text-xs font-semibold text-[#52685b] hover:bg-[#f8faf7]"
          >
            <RefreshCw size={14} />
            Refresh team
          </button>
        </div>

        {error && (
          <div className="mt-6 rounded-xl border border-[#f0d9cf] bg-[#fff8f4] p-4 text-sm text-[#a65d43]">
            {error}
          </div>
        )}

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            {
              label: "Total members",
              value: members.length,
              icon: Users,
              style: "bg-[#eaf0ed] text-[#47705b]",
            },
            {
              label: "Active accounts",
              value: activeCount,
              icon: UserCheck,
              style: "bg-[#eaf3e9] text-[#568064]",
            },
            {
              label: "Inactive accounts",
              value: inactiveCount,
              icon: UserX,
              style: "bg-[#f8eae2] text-[#b66a4d]",
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="rounded-2xl border border-[#e9ece7] bg-white p-5"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs text-[#77827b]">{item.label}</p>
                  <span className={`rounded-xl p-2.5 ${item.style}`}>
                    <Icon size={17} />
                  </span>
                </div>
                <p className="mt-5 text-3xl font-semibold tracking-[-0.05em]">
                  {item.value}
                </p>
              </div>
            );
          })}
        </div>

        <section className="mt-6 rounded-2xl border border-[#e9ece7] bg-white p-5">
          <div className="flex items-center gap-2">
            <Activity size={17} className="text-[#527765]" />
            <h2 className="text-sm font-semibold">Role distribution</h2>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {roleCounts.map(({ role, count }) => (
              <div
                key={role}
                className="rounded-xl border border-[#edf0eb] bg-[#fafbf9] p-4"
              >
                <p className="text-xs text-[#77827b]">{role}</p>
                <p className="mt-2 text-2xl font-semibold">{count}</p>
                <p className="mt-1 text-[10px] text-[#929c95]">
                  Assigned accounts
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 overflow-hidden rounded-2xl border border-[#e9ece7] bg-white">
          <div className="flex flex-col gap-4 border-b border-[#edf0eb] p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-sm font-semibold">Team directory</h2>
              <p className="mt-1 text-xs text-[#89918d]">
                User accounts and access roles registered in ClaimFlow.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex h-10 items-center gap-2 rounded-xl border border-[#e5e9e3] px-3 sm:w-64">
                <Search size={15} className="text-[#89918d]" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search team..."
                  className="w-full bg-transparent text-xs outline-none"
                />
              </div>

              <select
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value)}
                className="h-10 rounded-xl border border-[#e5e9e3] bg-white px-3 text-xs outline-none"
              >
                <option value="ALL">All roles</option>
                <option value="Desk Executive">Desk Executive</option>
                <option value="Desk Head">Desk Head</option>
                <option value="Treating Doctor">Treating Doctor</option>
                <option value="CFO">CFO</option>
              </select>
            </div>
          </div>

          {filteredMembers.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <Users className="mx-auto text-[#a0aaa2]" size={30} />
              <p className="mt-3 text-sm font-semibold">
                No team members found
              </p>
              <p className="mt-1 text-xs text-[#89918d]">
                Try another search or role filter.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#edf0eb]">
              {filteredMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#eaf0ed] text-sm font-semibold text-[#47705b]">
                      {member.full_name
                        .split(" ")
                        .map((part) => part[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase()}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {member.full_name}
                      </p>
                      <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-[#89918d]">
                        <Mail size={12} />
                        {member.email}
                      </p>
                      {member.phone && (
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-[#89918d]">
                          <Phone size={12} />
                          {member.phone}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    {member.roles.map((role) => (
                      <span
                        key={role}
                        className={`rounded-full px-3 py-1.5 text-[10px] font-medium ${
                          roleStyles[role] || "bg-[#f2f4f0] text-[#718078]"
                        }`}
                      >
                        {role}
                      </span>
                    ))}

                    <span
                      className={`ml-1 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-medium ${
                        member.is_active
                          ? "bg-[#eaf3e9] text-[#568064]"
                          : "bg-[#f8eae2] text-[#a96045]"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          member.is_active ? "bg-[#568064]" : "bg-[#b66a4d]"
                        }`}
                      />
                      {member.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="border-t border-[#edf0eb] px-5 py-3 text-[10px] text-[#929c95]">
            Showing {filteredMembers.length} of {members.length} registered accounts
          </div>
        </section>

        <p className="mt-5 text-[10px] leading-5 text-[#929c95]">
          This page currently provides a read-only team directory. Account
          creation, role changes and deactivation require dedicated audited
          backend actions and are not exposed here.
        </p>
      </div>
    </main>
  );
}