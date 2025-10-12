import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's active organization
    const { data: membership } = await supabase
      .from("user_organizations")
      .select("organization_id, role")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: "No active organization" },
        { status: 400 }
      );
    }

    // Check if user is admin or owner
    if (!["owner", "admin"].includes(membership.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get all invitations for the organization
    const { data: invitations, error } = await supabase
      .from("user_invitations")
      .select("*")
      .eq("organization_id", membership.organization_id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Fetch user profiles for all invited_by users
    const invitedByIds = invitations?.map((inv) => inv.invited_by) || [];
    const { data: profiles } = await supabase
      .from("user_profiles")
      .select("id, email, full_name")
      .in("id", invitedByIds);

    // Combine the data
    const invitationsWithProfiles = invitations?.map((inv) => ({
      ...inv,
      invited_by_profile: profiles?.find((p) => p.id === inv.invited_by) || null,
    }));

    return NextResponse.json({ success: true, invitations: invitationsWithProfiles });
  } catch (error: any) {
    console.error("Error fetching invitations:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch invitations" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { email, role } = await request.json();

    if (!email || !role) {
      return NextResponse.json(
        { error: "Email and role are required" },
        { status: 400 }
      );
    }

    if (!["admin", "editor", "viewer"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // Get user's active organization
    const { data: membership } = await supabase
      .from("user_organizations")
      .select("organization_id, role")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: "No active organization" },
        { status: 400 }
      );
    }

    // Check if user is admin or owner
    if (!["owner", "admin"].includes(membership.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check if invitation already exists for this email
    const { data: existingInvitation } = await supabase
      .from("user_invitations")
      .select("id")
      .eq("organization_id", membership.organization_id)
      .eq("email", email)
      .eq("status", "pending");

    if (existingInvitation && existingInvitation.length > 0) {
      return NextResponse.json(
        { error: "An invitation has already been sent to this email" },
        { status: 400 }
      );
    }

    // Create invitation using the database function
    const { data, error } = await supabase.rpc("create_invitation", {
      p_organization_id: membership.organization_id,
      p_email: email,
      p_role: role,
      p_invited_by: user.id,
    });

    if (error) throw error;

    // Get the created invitation
    const { data: invitation } = await supabase
      .from("user_invitations")
      .select("*")
      .eq("id", data)
      .single();

    return NextResponse.json({ success: true, invitation });
  } catch (error: any) {
    console.error("Error creating invitation:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create invitation" },
      { status: 500 }
    );
  }
}
