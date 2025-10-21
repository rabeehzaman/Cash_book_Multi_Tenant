import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { resend, EMAIL_FROM, APP_URL, getInvitationEmailHTML, getInvitationEmailText } from "@/lib/email";

export async function POST(
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

    // Get the invitation
    const { data: invitation, error: invitationError } = await supabase
      .from("user_invitations")
      .select("*")
      .eq("id", id)
      .eq("organization_id", membership.organization_id)
      .eq("status", "pending")
      .single();

    if (invitationError || !invitation) {
      return NextResponse.json(
        { error: "Invitation not found or already used" },
        { status: 404 }
      );
    }

    // Get organization details
    const { data: org } = await supabase
      .from("organizations")
      .select("name")
      .eq("id", invitation.organization_id)
      .single();

    // Get inviter details (use current user as the "resender")
    const { data: inviterProfile } = await supabase
      .from("user_profiles")
      .select("full_name, email")
      .eq("id", user.id)
      .single();

    // Send invitation email
    try {
      const inviteLink = `${APP_URL}/invite/${invitation.token}`;
      const invitedByName = inviterProfile?.full_name || inviterProfile?.email || "A team member";
      const organizationName = org?.name || "the organization";

      console.log("📧 Resending invitation email...");
      console.log("- To:", invitation.email);
      console.log("- From:", EMAIL_FROM);
      console.log("- Resend API Key configured:", !!process.env.RESEND_API_KEY);

      // Check if Resend is configured
      if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== "your_resend_api_key_here") {
        console.log("Sending email via Resend...");
        const result = await resend.emails.send({
          from: EMAIL_FROM,
          to: invitation.email,
          subject: `You're invited to join ${organizationName}`,
          html: getInvitationEmailHTML({
            organizationName,
            invitedByName,
            role: invitation.role,
            inviteLink,
            expiresAt: invitation.expires_at,
          }),
          text: getInvitationEmailText({
            organizationName,
            invitedByName,
            role: invitation.role,
            inviteLink,
            expiresAt: invitation.expires_at,
          }),
        });
        console.log("✅ Email sent successfully!", result);
      } else {
        console.warn("⚠️ Resend API key not configured. Invitation link available but email not sent.");
        console.log(`📋 Invitation link: ${inviteLink}`);
      }

      return NextResponse.json({
        success: true,
        message: "Invitation resent successfully",
        inviteLink,
      });
    } catch (emailError: any) {
      console.error("❌ Failed to send invitation email:", emailError);
      console.error("Error details:", emailError.message || emailError);

      // Return success even if email fails - the invitation link is still valid
      return NextResponse.json({
        success: true,
        message: "Invitation link is ready (email sending failed)",
        inviteLink: `${APP_URL}/invite/${invitation.token}`,
        emailError: emailError.message,
      });
    }
  } catch (error: any) {
    console.error("Error resending invitation:", error);
    return NextResponse.json(
      { error: error.message || "Failed to resend invitation" },
      { status: 500 }
    );
  }
}
