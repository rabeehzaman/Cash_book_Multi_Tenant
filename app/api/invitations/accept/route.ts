import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { error: "Invitation token is required" },
        { status: 400 }
      );
    }

    // Fetch invitation details
    const { data: invitation, error } = await supabase
      .from("user_invitations")
      .select("*")
      .eq("token", token)
      .eq("status", "pending")
      .single();

    if (error || !invitation) {
      return NextResponse.json(
        { error: "Invalid or expired invitation" },
        { status: 404 }
      );
    }

    // Get organization details
    const { data: organization } = await supabase
      .from("organizations")
      .select("name")
      .eq("id", invitation.organization_id)
      .single();

    // Get inviter details
    const { data: invited_by_profile } = await supabase
      .from("user_profiles")
      .select("full_name, email")
      .eq("id", invitation.invited_by)
      .single();

    // Check if invitation has expired
    const expiresAt = new Date(invitation.expires_at);
    if (expiresAt < new Date()) {
      // Update status to expired
      await supabase
        .from("user_invitations")
        .update({ status: "expired" })
        .eq("id", invitation.id);

      return NextResponse.json(
        { error: "This invitation has expired" },
        { status: 410 }
      );
    }

    return NextResponse.json({
      success: true,
      invitation: {
        ...invitation,
        organization,
        invited_by_profile,
      },
    });
  } catch (error: any) {
    console.error("Error fetching invitation:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch invitation" },
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

    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: "Invitation token is required" },
        { status: 400 }
      );
    }

    // Use the database function to accept the invitation
    const { data, error } = await supabase.rpc("accept_invitation", {
      p_token: token,
      p_user_id: user.id,
    });

    if (error) {
      console.error("Error accepting invitation:", error);
      return NextResponse.json(
        { error: error.message || "Failed to accept invitation" },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Invalid or expired invitation" },
        { status: 404 }
      );
    }

    // Fetch the updated user organizations to set the new one as active
    const { data: organizations } = await supabase
      .from("user_organizations")
      .select("organization_id")
      .eq("user_id", user.id);

    return NextResponse.json({
      success: true,
      message: "Invitation accepted successfully",
    });
  } catch (error: any) {
    console.error("Error accepting invitation:", error);
    return NextResponse.json(
      { error: error.message || "Failed to accept invitation" },
      { status: 500 }
    );
  }
}
