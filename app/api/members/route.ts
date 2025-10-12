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

    // Get all members of the organization
    const { data: userOrgs, error } = await supabase
      .from("user_organizations")
      .select("*")
      .eq("organization_id", membership.organization_id)
      .order("created_at", { ascending: true });

    if (error) throw error;

    // Fetch user profiles for all members
    const userIds = userOrgs?.map((org) => org.user_id) || [];
    const { data: profiles } = await supabase
      .from("user_profiles")
      .select("id, email, full_name")
      .in("id", userIds);

    // Combine the data
    const members = userOrgs?.map((org) => ({
      ...org,
      user: profiles?.find((p) => p.id === org.user_id) || null,
    }));

    return NextResponse.json({ success: true, members });
  } catch (error: any) {
    console.error("Error fetching members:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch members" },
      { status: 500 }
    );
  }
}
