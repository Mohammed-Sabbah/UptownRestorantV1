import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const supabase = getSupabaseAdmin();

        const { data, error } = await supabase
            .from("orders")
            .select(`
                *,
                order_items (*),
                branch:branches (
                    id,
                    name_ar,
                    name_en,
                    phone,
                    whatsapp
                )
            `)
            .eq("id", id)
            .single();

        if (error) {
            console.error("[orders/id] Supabase error:", JSON.stringify(error));
            return NextResponse.json({ error: error.message, details: error }, { status: 500 });
        }

        return NextResponse.json({ order: data });
    } catch (err: any) {
        console.error("[orders/id] Caught error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const supabase = getSupabaseAdmin();
        const { error } = await supabase
            .from("orders")
            .delete()
            .eq("id", id);
        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}