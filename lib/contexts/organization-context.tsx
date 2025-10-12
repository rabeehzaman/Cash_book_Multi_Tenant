"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Organization {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

interface UserRole {
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  permissions: Record<string, any>;
}

interface OrganizationContextType {
  organization: Organization | null;
  userRole: UserRole | null;
  loading: boolean;
  error: string | null;
  refreshOrganization: () => Promise<void>;
  hasPermission: (requiredRole: 'owner' | 'admin' | 'editor' | 'viewer') => boolean;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(
  undefined
);

export function OrganizationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrganization = async () => {
    try {
      setLoading(true);
      setError(null);

      const supabase = createClient();

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setOrganization(null);
        setUserRole(null);
        return;
      }

      // Get user's active organization
      const { data: membership, error: membershipError } = await supabase
        .from("user_organizations")
        .select("organization_id, is_active, role, permissions")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .single();

      if (membershipError) {
        // If no active org, get first organization
        const { data: firstMembership } = await supabase
          .from("user_organizations")
          .select("organization_id, role, permissions")
          .eq("user_id", user.id)
          .limit(1)
          .single();

        if (!firstMembership) {
          throw new Error("No organization found for user");
        }

        // Set this org as active
        await supabase
          .from("user_organizations")
          .update({ is_active: true })
          .eq("user_id", user.id)
          .eq("organization_id", firstMembership.organization_id);

        // Get organization details
        const { data: org, error: orgError } = await supabase
          .from("organizations")
          .select("*")
          .eq("id", firstMembership.organization_id)
          .single();

        if (orgError) throw orgError;
        setOrganization(org);
        setUserRole({
          role: firstMembership.role,
          permissions: firstMembership.permissions || {},
        });
      } else {
        // Get organization details
        const { data: org, error: orgError } = await supabase
          .from("organizations")
          .select("*")
          .eq("id", membership.organization_id)
          .single();

        if (orgError) throw orgError;
        setOrganization(org);
        setUserRole({
          role: membership.role,
          permissions: membership.permissions || {},
        });
      }
    } catch (err: any) {
      console.error("Error fetching organization:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const hasPermission = (requiredRole: 'owner' | 'admin' | 'editor' | 'viewer'): boolean => {
    if (!userRole) return false;

    const roleHierarchy = {
      owner: 4,
      admin: 3,
      editor: 2,
      viewer: 1,
    };

    return roleHierarchy[userRole.role] >= roleHierarchy[requiredRole];
  };

  useEffect(() => {
    fetchOrganization();
  }, []);

  const value = {
    organization,
    userRole,
    loading,
    error,
    refreshOrganization: fetchOrganization,
    hasPermission,
  };

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error(
      "useOrganization must be used within an OrganizationProvider"
    );
  }
  return context;
}
