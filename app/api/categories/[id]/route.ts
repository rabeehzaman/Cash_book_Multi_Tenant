import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(
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
    const { name, type, color, icon } = await request.json();

    if (!name || !type) {
      return NextResponse.json(
        { error: "Name and type are required" },
        { status: 400 }
      );
    }

    if (!["cash_in", "cash_out", "both"].includes(type)) {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
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

    // Check if user is editor or above
    if (!["owner", "admin", "editor"].includes(membership.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check if category is system category
    const { data: existingCategory } = await supabase
      .from("transaction_categories")
      .select("is_system")
      .eq("id", id)
      .eq("organization_id", membership.organization_id)
      .single();

    if (existingCategory?.is_system) {
      return NextResponse.json(
        { error: "Cannot edit system category" },
        { status: 400 }
      );
    }

    // Update category
    const { data: category, error } = await supabase
      .from("transaction_categories")
      .update({
        name,
        type,
        color: color || null,
        icon: icon || null,
      })
      .eq("id", id)
      .eq("organization_id", membership.organization_id)
      .eq("is_system", false)
      .select()
      .single();

    if (error) throw error;

    // Log activity
    await supabase.rpc("log_activity", {
      p_organization_id: membership.organization_id,
      p_user_id: user.id,
      p_action: "updated",
      p_entity_type: "category",
      p_entity_id: id,
      p_metadata: { name, type },
    });

    return NextResponse.json({ success: true, category });
  } catch (error: any) {
    console.error("Error updating category:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update category" },
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

    // Check if category is system category
    const { data: existingCategory } = await supabase
      .from("transaction_categories")
      .select("is_system, name")
      .eq("id", id)
      .eq("organization_id", membership.organization_id)
      .single();

    if (existingCategory?.is_system) {
      return NextResponse.json(
        { error: "Cannot delete system category" },
        { status: 400 }
      );
    }

    // Delete category
    const { error } = await supabase
      .from("transaction_categories")
      .delete()
      .eq("id", id)
      .eq("organization_id", membership.organization_id)
      .eq("is_system", false);

    if (error) throw error;

    // Log activity
    await supabase.rpc("log_activity", {
      p_organization_id: membership.organization_id,
      p_user_id: user.id,
      p_action: "deleted",
      p_entity_type: "category",
      p_entity_id: id,
      p_metadata: { name: existingCategory?.name },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting category:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete category" },
      { status: 500 }
    );
  }
}
