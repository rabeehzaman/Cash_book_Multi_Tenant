import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params; // user_organizations.id
    const { role } = await request.json();

    if (!role || !["owner", "admin", "editor", "viewer"].includes(role)) {
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

    // Get target member
    const { data: targetMember } = await supabase
      .from("user_organizations")
      .select("user_id, role")
      .eq("id", id)
      .eq("organization_id", membership.organization_id)
      .single();

    if (!targetMember) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Prevent changing own role (except for owners)
    if (targetMember.user_id === user.id && membership.role !== "owner") {
      return NextResponse.json(
        { error: "Cannot change your own role" },
        { status: 400 }
      );
    }

    // Prevent non-owners from changing owner roles
    if (
      targetMember.role === "owner" &&
      membership.role !== "owner"
    ) {
      return NextResponse.json(
        { error: "Cannot change owner role" },
        { status: 403 }
      );
    }

    // Update role
    const { error } = await supabase
      .from("user_organizations")
      .update({ role })
      .eq("id", id)
      .eq("organization_id", membership.organization_id);

    if (error) throw error;

    // Log activity
    await supabase.rpc("log_activity", {
      p_organization_id: membership.organization_id,
      p_user_id: user.id,
      p_action: "updated_role",
      p_entity_type: "member",
      p_entity_id: targetMember.user_id,
      p_metadata: { old_role: targetMember.role, new_role: role },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error updating member role:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update member role" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;

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

    // Get target member
    const { data: targetMember } = await supabase
      .from("user_organizations")
      .select("user_id, role")
      .eq("id", id)
      .eq("organization_id", membership.organization_id)
      .single();

    if (!targetMember) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Prevent removing self
    if (targetMember.user_id === user.id) {
      return NextResponse.json(
        { error: "Cannot remove yourself from organization" },
        { status: 400 }
      );
    }

    // Prevent non-owners from removing owners
    if (targetMember.role === "owner" && membership.role !== "owner") {
      return NextResponse.json(
        { error: "Cannot remove owner" },
        { status: 403 }
      );
    }

    // Remove member
    const { error } = await supabase
      .from("user_organizations")
      .delete()
      .eq("id", id)
      .eq("organization_id", membership.organization_id);

    if (error) throw error;

    // Log activity
    await supabase.rpc("log_activity", {
      p_organization_id: membership.organization_id,
      p_user_id: user.id,
      p_action: "removed_member",
      p_entity_type: "member",
      p_entity_id: targetMember.user_id,
      p_metadata: { role: targetMember.role },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error removing member:", error);
    return NextResponse.json(
      { error: error.message || "Failed to remove member" },
      { status: 500 }
    );
  }
}
