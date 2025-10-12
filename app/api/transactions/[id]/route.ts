import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { id } = params;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: transaction, error } = await supabase
      .from("cashbook_transactions")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      throw error;
    }

    if (!transaction) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      transaction,
    });
  } catch (error) {
    console.error("Get transaction error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch transaction",
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { id } = params;

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

    // Check if user has edit permission
    if (!["owner", "admin", "editor"].includes(membership.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await request.formData();

    // Extract data from FormData
    const type = formData.get('type') as string;
    const amount = formData.get('amount') ? parseFloat(formData.get('amount') as string) : undefined;
    const transaction_date = formData.get('transaction_date') as string || undefined;
    const description = formData.get('description') as string || undefined;
    const category_id = formData.get('category_id') as string || undefined;
    const party_name = formData.get('party_name') as string || undefined;
    const receiptFile = formData.get('receipt') as File | null;

    // Upload new receipt to Supabase if present
    let receipt_url: string | undefined;
    if (receiptFile && receiptFile.size > 0) {
      const fileName = `${membership.organization_id}/${Date.now()}-${receiptFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from('cashbook_receipts')
        .upload(fileName, receiptFile);

      if (uploadError) {
        console.error('Receipt upload error:', uploadError);
        throw new Error('Failed to upload receipt');
      }

      const { data: { publicUrl } } = supabase.storage
        .from('cashbook_receipts')
        .getPublicUrl(fileName);
      receipt_url = publicUrl;
    }

    const updateData: any = {
      updated_by: user.id,
    };

    if (type !== undefined) updateData.type = type;
    if (amount !== undefined) updateData.amount = amount;
    if (transaction_date !== undefined) updateData.transaction_date = transaction_date;
    if (description !== undefined) updateData.description = description;
    if (category_id !== undefined) updateData.category_id = category_id || null;
    if (party_name !== undefined) updateData.party_name = party_name || null;
    if (receipt_url !== undefined) updateData.receipt_url = receipt_url;

    const { data: transaction, error } = await supabase
      .from("cashbook_transactions")
      .update(updateData)
      .eq("id", id)
      .eq("organization_id", membership.organization_id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Log activity
    await supabase.rpc("log_activity", {
      p_organization_id: membership.organization_id,
      p_user_id: user.id,
      p_action: "updated",
      p_entity_type: "transaction",
      p_entity_id: id,
      p_metadata: {
        fields_updated: Object.keys(updateData).filter((k) => k !== "updated_by"),
      },
    });

    return NextResponse.json({
      success: true,
      transaction,
    });
  } catch (error) {
    console.error("Update transaction error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update transaction",
      },
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
    const { id } = params;

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

    // Check if user has delete permission (admin or owner)
    if (!["owner", "admin"].includes(membership.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get transaction details before deleting for logging
    const { data: transaction } = await supabase
      .from("cashbook_transactions")
      .select("type, amount, description")
      .eq("id", id)
      .eq("organization_id", membership.organization_id)
      .single();

    const { error } = await supabase
      .from("cashbook_transactions")
      .delete()
      .eq("id", id)
      .eq("organization_id", membership.organization_id);

    if (error) {
      throw error;
    }

    // Log activity
    if (transaction) {
      await supabase.rpc("log_activity", {
        p_organization_id: membership.organization_id,
        p_user_id: user.id,
        p_action: "deleted",
        p_entity_type: "transaction",
        p_entity_id: id,
        p_metadata: {
          type: transaction.type,
          amount: transaction.amount,
          description: transaction.description,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Transaction deleted successfully",
    });
  } catch (error) {
    console.error("Delete transaction error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete transaction",
      },
      { status: 500 }
    );
  }
}
