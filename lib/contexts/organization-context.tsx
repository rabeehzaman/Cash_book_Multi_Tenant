"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from "react";
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

interface CachedOrgData {
  organization: Organization;
  userRole: UserRole;
  timestamp: number;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(
  undefined
);

// Cache TTL: 5 minutes
const CACHE_TTL = 5 * 60 * 1000;
const CACHE_KEY = 'cashbook_org_cache';

export function OrganizationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchingRef = useRef(false);

  // Load from cache
  const loadFromCache = (): CachedOrgData | null => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;

      const data: CachedOrgData = JSON.parse(cached);
      const age = Date.now() - data.timestamp;

      if (age < CACHE_TTL) {
        return data;
      }

      // Cache expired
      localStorage.removeItem(CACHE_KEY);
      return null;
    } catch (err) {
      console.error('Error loading cache:', err);
      return null;
    }
  };

  // Save to cache
  const saveToCache = (org: Organization, role: UserRole) => {
    try {
      const data: CachedOrgData = {
        organization: org,
        userRole: role,
        timestamp: Date.now(),
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch (err) {
      console.error('Error saving cache:', err);
    }
  };

  const fetchOrganization = async (skipCache = false) => {
    // Prevent multiple simultaneous fetches
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    try {
      // Try cache first if not skipping
      if (!skipCache) {
        const cached = loadFromCache();
        if (cached) {
          setOrganization(cached.organization);
          setUserRole(cached.userRole);
          setLoading(false);
          fetchingRef.current = false;
          return;
        }
      }

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
        setLoading(false);
        fetchingRef.current = false;
        return;
      }

      // Use optimized RPC function to get organization + role in one query
      const { data: orgData, error: orgError } = await supabase.rpc(
        'get_user_active_org_with_role',
        { user_uuid: user.id }
      );

      if (orgError) {
        // Fallback to old method if RPC not available yet
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

          // Set this org as active (non-blocking)
          supabase
            .from("user_organizations")
            .update({ is_active: true })
            .eq("user_id", user.id)
            .eq("organization_id", firstMembership.organization_id)
            .then(() => {})
            .catch(err => console.error('Failed to set active org:', err));

          // Get organization details
          const { data: org, error: orgFetchError } = await supabase
            .from("organizations")
            .select("*")
            .eq("id", firstMembership.organization_id)
            .single();

          if (orgFetchError) throw orgFetchError;

          const orgObj: Organization = org;
          const roleObj: UserRole = {
            role: firstMembership.role,
            permissions: firstMembership.permissions || {},
          };

          setOrganization(orgObj);
          setUserRole(roleObj);
          saveToCache(orgObj, roleObj);
        } else {
          // Get organization details
          const { data: org, error: orgFetchError } = await supabase
            .from("organizations")
            .select("*")
            .eq("id", membership.organization_id)
            .single();

          if (orgFetchError) throw orgFetchError;

          const orgObj: Organization = org;
          const roleObj: UserRole = {
            role: membership.role,
            permissions: membership.permissions || {},
          };

          setOrganization(orgObj);
          setUserRole(roleObj);
          saveToCache(orgObj, roleObj);
        }
      } else if (orgData && orgData.length > 0) {
        // Use RPC result
        const data = orgData[0];
        const orgObj: Organization = {
          id: data.organization_id,
          name: data.organization_name,
          slug: data.organization_slug,
          created_at: '', // Not needed for context
        };
        const roleObj: UserRole = {
          role: data.user_role,
          permissions: data.permissions || {},
        };

        setOrganization(orgObj);
        setUserRole(roleObj);
        saveToCache(orgObj, roleObj);
      } else {
        throw new Error("No organization found for user");
      }
    } catch (err: any) {
      console.error("Error fetching organization:", err);
      setError(err.message);
      // Clear invalid cache
      localStorage.removeItem(CACHE_KEY);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
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
    refreshOrganization: () => fetchOrganization(true), // Skip cache on manual refresh
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
