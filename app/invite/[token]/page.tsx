"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle, XCircle, Mail } from "lucide-react";
import Link from "next/link";

interface InvitationData {
  id: string;
  email: string;
  role: string;
  organization_id: string;
  status: string;
  expires_at: string;
  organization: {
    name: string;
  };
  invited_by_profile: {
    full_name?: string;
    email: string;
  };
}

export default function AcceptInvitationPage() {
  const router = useRouter();
  const params = useParams();
  const token = params?.token as string;

  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    if (token) {
      checkInvitation();
    }
  }, [token]);

  const checkInvitation = async () => {
    try {
      setLoading(true);
      setError(null);

      const supabase = createClient();

      // Check if user is logged in
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);

      // Fetch invitation details
      const response = await fetch(`/api/invitations/accept?token=${token}`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error || "Invalid or expired invitation");
        return;
      }

      setInvitation(data.invitation);
    } catch (err: any) {
      console.error("Error checking invitation:", err);
      setError("Failed to load invitation details");
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvitation = async () => {
    try {
      setAccepting(true);
      setError(null);

      const supabase = createClient();

      // Check if user is logged in
      const { data: { user: currentUser } } = await supabase.auth.getUser();

      if (!currentUser) {
        // Redirect to signup with invitation token
        router.push(`/signup?invite=${token}`);
        return;
      }

      // Accept the invitation
      const response = await fetch("/api/invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error || "Failed to accept invitation");
        return;
      }

      setSuccess(true);

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push("/");
      }, 2000);
    } catch (err: any) {
      console.error("Error accepting invitation:", err);
      setError("Failed to accept invitation");
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-50">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
              <p className="text-muted-foreground">Loading invitation...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-50">
        <Card className="w-full max-w-md mx-4">
          <CardHeader>
            <div className="flex items-center gap-2 text-red-600">
              <XCircle className="h-6 w-6" />
              <CardTitle>Invalid Invitation</CardTitle>
            </div>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This invitation may have expired or been cancelled. Please contact the person who invited you.
              </p>
              <div className="flex gap-2">
                <Link href="/login" className="flex-1">
                  <Button variant="outline" className="w-full">
                    Go to Login
                  </Button>
                </Link>
                <Link href="/signup" className="flex-1">
                  <Button className="w-full bg-emerald-600 hover:bg-emerald-700">
                    Sign Up
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-50">
        <Card className="w-full max-w-md mx-4">
          <CardHeader>
            <div className="flex items-center gap-2 text-emerald-600">
              <CheckCircle className="h-6 w-6" />
              <CardTitle>Invitation Accepted!</CardTitle>
            </div>
            <CardDescription>
              You've successfully joined {invitation?.organization?.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Redirecting you to the dashboard...
            </p>
            <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="h-6 w-6 text-emerald-600" />
            <CardTitle>You're Invited!</CardTitle>
          </div>
          <CardDescription>
            Join {invitation?.organization?.name} as a team member
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Invitation Details */}
          <div className="space-y-4 p-4 bg-slate-50 rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Organization</p>
              <p className="font-semibold">{invitation?.organization?.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Your Role</p>
              <p className="font-semibold capitalize">{invitation?.role}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Invited By</p>
              <p className="font-semibold">
                {invitation?.invited_by_profile?.full_name || invitation?.invited_by_profile?.email}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-semibold">{invitation?.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Expires</p>
              <p className="font-semibold">
                {new Date(invitation?.expires_at || "").toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {user ? (
              <Button
                onClick={handleAcceptInvitation}
                disabled={accepting}
                className="w-full bg-emerald-600 hover:bg-emerald-700"
              >
                {accepting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Accepting...
                  </>
                ) : (
                  "Accept Invitation"
                )}
              </Button>
            ) : (
              <>
                <p className="text-sm text-center text-muted-foreground">
                  You need to be logged in to accept this invitation
                </p>
                <Link href={`/signup?invite=${token}`} className="block">
                  <Button className="w-full bg-emerald-600 hover:bg-emerald-700">
                    Sign Up & Accept
                  </Button>
                </Link>
                <Link href={`/login?invite=${token}`} className="block">
                  <Button variant="outline" className="w-full">
                    Login & Accept
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Footer */}
          <p className="text-xs text-center text-muted-foreground">
            By accepting, you agree to join {invitation?.organization?.name} and will be able to
            access their cash book transactions.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
