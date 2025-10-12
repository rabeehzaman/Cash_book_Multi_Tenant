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
      .select("organization_id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: "No active organization" },
        { status: 400 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type"); // 'cash_in', 'cash_out', or null for all

    let query = supabase
      .from("transaction_categories")
      .select("*")
      .eq("organization_id", membership.organization_id)
      .order("name");

    if (type && ["cash_in", "cash_out"].includes(type)) {
      query = query.or(`type.eq.${type},type.eq.both`);
    }

    const { data: categories, error } = await query;

    if (error) throw error;

    return NextResponse.json({ success: true, categories });
  } catch (error: any) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch categories" },
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

    // Create category
    const { data: category, error } = await supabase
      .from("transaction_categories")
      .insert({
        organization_id: membership.organization_id,
        name,
        type,
        color: color || null,
        icon: icon || null,
        created_by: user.id,
        is_system: false,
      })
      .select()
      .single();

    if (error) throw error;

    // Log activity
    await supabase.rpc("log_activity", {
      p_organization_id: membership.organization_id,
      p_user_id: user.id,
      p_action: "created",
      p_entity_type: "category",
      p_entity_id: category.id,
      p_metadata: { name, type },
    });

    return NextResponse.json({ success: true, category });
  } catch (error: any) {
    console.error("Error creating category:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create category" },
      { status: 500 }
    );
  }
}
