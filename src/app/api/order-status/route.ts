import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const orderId = req.nextUrl.searchParams.get("orderId");
  if (!orderId) {
    return NextResponse.json({ success: false, error: "Missing orderId" }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data: order, error } = await supabase
      .from("orders")
      .select(`
        id,
        customer_name,
        status,
        order_type,
        total_amount,
        delivery_fee,
        delivery_discount_amount,
        delivery_discount_type,
        invoice_discount_amount,
        invoice_discount_type,
        created_at,
        updated_at,
        table_number,
        estimated_time,
        scheduled_at,
        address,
        order_items (*),
        branches (*)
      `)
      .eq("id", orderId)
      .single();

    if (error) throw error;
    if (!order) return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });

    return NextResponse.json({ success: true, order });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}