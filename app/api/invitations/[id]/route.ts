import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

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

    // Delete the invitation
    const { error } = await supabase
      .from("user_invitations")
      .delete()
      .eq("id", id)
      .eq("organization_id", membership.organization_id)
      .eq("status", "pending");

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error cancelling invitation:", error);
    return NextResponse.json(
      { error: error.message || "Failed to cancel invitation" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { role } = await request.json();

    if (!role || !["admin", "editor", "viewer"].includes(role)) {
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

    // Update invitation role
    const { error } = await supabase
      .from("user_invitations")
      .update({ role })
      .eq("id", id)
      .eq("organization_id", membership.organization_id)
      .eq("status", "pending");

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error updating invitation:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update invitation" },
      { status: 500 }
    );
  }
}
