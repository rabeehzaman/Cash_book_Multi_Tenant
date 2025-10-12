"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useOrganization } from "@/lib/hooks/use-organization";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, UserPlus, Mail, Users, Activity, Tag, Trash2, Edit2, Check, X } from "lucide-react";
import Link from "next/link";

interface Member {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  user: {
    id: string;
    email: string;
    full_name?: string;
  };
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
  expires_at: string;
}

interface Category {
  id: string;
  name: string;
  type: string;
  color?: string;
  is_system: boolean;
}

interface ActivityLog {
  id: string;
  action: string;
  entity_type: string;
  metadata: any;
  created_at: string;
  user?: {
    full_name?: string;
    email: string;
  };
}

export default function SettingsPage() {
  const router = useRouter();
  const { organization, userRole, hasPermission, loading: orgLoading } = useOrganization();

  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<string>("viewer");
  const [categoryName, setCategoryName] = useState("");
  const [categoryType, setCategoryType] = useState<string>("both");
  const [categoryColor, setCategoryColor] = useState("#10b981");

  useEffect(() => {
    if (!orgLoading && organization) {
      if (!hasPermission("viewer")) {
        router.push("/");
        return;
      }
      fetchData();
    }
  }, [orgLoading, organization]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch members
      const membersRes = await fetch("/api/members");
      const membersData = await membersRes.json();
      if (membersData.success) setMembers(membersData.members);

      // Fetch invitations (admin only)
      if (hasPermission("admin")) {
        const invitationsRes = await fetch("/api/invitations");
        const invitationsData = await invitationsRes.json();
        if (invitationsData.success) setInvitations(invitationsData.invitations);
      }

      // Fetch categories
      const categoriesRes = await fetch("/api/categories");
      const categoriesData = await categoriesRes.json();
      if (categoriesData.success) setCategories(categoriesData.categories);

      // Fetch activity logs
      const logsRes = await fetch("/api/activity-logs?limit=50");
      const logsData = await logsRes.json();
      if (logsData.success) setActivityLogs(logsData.logs);

    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success("Invitation sent successfully");
        setInviteEmail("");
        setInviteRole("viewer");
        fetchData();
      } else {
        toast.error(data.error || "Failed to send invitation");
      }
    } catch (error) {
      toast.error("Failed to send invitation");
    }
  };

  const handleCancelInvitation = async (id: string) => {
    try {
      const res = await fetch(`/api/invitations/${id}`, { method: "DELETE" });
      const data = await res.json();

      if (data.success) {
        toast.success("Invitation cancelled");
        fetchData();
      } else {
        toast.error(data.error || "Failed to cancel invitation");
      }
    } catch (error) {
      toast.error("Failed to cancel invitation");
    }
  };

  const handleUpdateMemberRole = async (memberId: string, newRole: string) => {
    try {
      const res = await fetch(`/api/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success("Member role updated");
        fetchData();
      } else {
        toast.error(data.error || "Failed to update role");
      }
    } catch (error) {
      toast.error("Failed to update role");
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm("Are you sure you want to remove this member?")) return;

    try {
      const res = await fetch(`/api/members/${memberId}`, { method: "DELETE" });
      const data = await res.json();

      if (data.success) {
        toast.success("Member removed");
        fetchData();
      } else {
        toast.error(data.error || "Failed to remove member");
      }
    } catch (error) {
      toast.error("Failed to remove member");
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: categoryName,
          type: categoryType,
          color: categoryColor,
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success("Category created");
        setCategoryName("");
        setCategoryType("both");
        setCategoryColor("#10b981");
        fetchData();
      } else {
        toast.error(data.error || "Failed to create category");
      }
    } catch (error) {
      toast.error("Failed to create category");
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("Are you sure you want to delete this category?")) return;

    try {
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      const data = await res.json();

      if (data.success) {
        toast.success("Category deleted");
        fetchData();
      } else {
        toast.error(data.error || "Failed to delete category");
      }
    } catch (error) {
      toast.error("Failed to delete category");
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "owner": return "bg-purple-500";
      case "admin": return "bg-blue-500";
      case "editor": return "bg-green-500";
      case "viewer": return "bg-gray-500";
      default: return "bg-gray-500";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (orgLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-emerald-500 to-blue-500 rounded-2xl animate-pulse" />
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 pb-20">
      <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Settings</h1>
            <p className="text-sm md:text-base text-muted-foreground">
              Manage your organization and preferences
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="members" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="members">
              <Users className="h-4 w-4 mr-2" />
              Members
            </TabsTrigger>
            {hasPermission("admin") && (
              <TabsTrigger value="invitations">
                <Mail className="h-4 w-4 mr-2" />
                Invitations
              </TabsTrigger>
            )}
            <TabsTrigger value="categories">
              <Tag className="h-4 w-4 mr-2" />
              Categories
            </TabsTrigger>
            <TabsTrigger value="activity">
              <Activity className="h-4 w-4 mr-2" />
              Activity
            </TabsTrigger>
          </TabsList>

          {/* Members Tab */}
          <TabsContent value="members" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Team Members</CardTitle>
                <CardDescription>
                  Manage your organization members and their roles
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-white"
                  >
                    <div className="flex-1">
                      <p className="font-medium">
                        {member.user.full_name || member.user.email}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {member.user.email}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {hasPermission("admin") ? (
                        <Select
                          value={member.role}
                          onValueChange={(value) =>
                            handleUpdateMemberRole(member.id, value)
                          }
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="viewer">Viewer</SelectItem>
                            <SelectItem value="editor">Editor</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                            {hasPermission("owner") && (
                              <SelectItem value="owner">Owner</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge className={getRoleBadgeColor(member.role)}>
                          {member.role}
                        </Badge>
                      )}
                      {hasPermission("admin") && member.role !== "owner" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveMember(member.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Invitations Tab */}
          {hasPermission("admin") && (
            <TabsContent value="invitations" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Invite New Member</CardTitle>
                  <CardDescription>
                    Send an invitation to join your organization
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleInviteUser} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="user@example.com"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="role">Role</Label>
                        <Select value={inviteRole} onValueChange={setInviteRole}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="viewer">Viewer</SelectItem>
                            <SelectItem value="editor">Editor</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Button type="submit">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Send Invitation
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Pending Invitations</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {invitations.filter((i) => i.status === "pending").length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No pending invitations
                    </p>
                  ) : (
                    invitations
                      .filter((i) => i.status === "pending")
                      .map((invitation) => (
                        <div
                          key={invitation.id}
                          className="flex items-center justify-between p-4 rounded-lg border bg-white"
                        >
                          <div className="flex-1">
                            <p className="font-medium">{invitation.email}</p>
                            <p className="text-sm text-muted-foreground">
                              Expires: {formatDate(invitation.expires_at)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={getRoleBadgeColor(invitation.role)}>
                              {invitation.role}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleCancelInvitation(invitation.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Categories Tab */}
          <TabsContent value="categories" className="space-y-4">
            {hasPermission("editor") && (
              <Card>
                <CardHeader>
                  <CardTitle>Create Category</CardTitle>
                  <CardDescription>
                    Add a custom category for transactions (optional)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateCategory} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="categoryName">Name</Label>
                        <Input
                          id="categoryName"
                          placeholder="e.g., Marketing"
                          value={categoryName}
                          onChange={(e) => setCategoryName(e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="categoryType">Type</Label>
                        <Select value={categoryType} onValueChange={setCategoryType}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="both">Both</SelectItem>
                            <SelectItem value="cash_in">Cash In Only</SelectItem>
                            <SelectItem value="cash_out">Cash Out Only</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="categoryColor">Color</Label>
                        <Input
                          id="categoryColor"
                          type="color"
                          value={categoryColor}
                          onChange={(e) => setCategoryColor(e.target.value)}
                        />
                      </div>
                    </div>
                    <Button type="submit">
                      <Tag className="h-4 w-4 mr-2" />
                      Create Category
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>All Categories</CardTitle>
                <CardDescription>
                  Manage transaction categories
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {categories.map((category) => (
                    <div
                      key={category.id}
                      className="flex items-center justify-between p-4 rounded-lg border bg-white"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: category.color || "#gray" }}
                        />
                        <div>
                          <p className="font-medium">{category.name}</p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {category.type === "both" ? "All" : category.type.replace("_", " ")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {category.is_system ? (
                          <Badge variant="outline">System</Badge>
                        ) : (
                          hasPermission("admin") && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteCategory(category.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          )
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Activity Log</CardTitle>
                <CardDescription>
                  Recent actions in your organization
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {activityLogs.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No activity yet
                    </p>
                  ) : (
                    activityLogs.map((log) => (
                      <div
                        key={log.id}
                        className="flex items-start gap-4 p-4 rounded-lg border bg-white"
                      >
                        <div className="flex-1">
                          <p className="font-medium">
                            {log.user?.full_name || log.user?.email || "System"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {log.action} {log.entity_type}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDate(log.created_at)}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
