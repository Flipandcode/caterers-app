"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Customer } from "@/types/domain";

function mapRow(row: any): Customer {
  return {
    id: row.id,
    businessId: row.business_id,
    name: row.name,
    phone: row.phone,
    whatsappNumber: row.whatsapp_number,
    email: row.email,
    address: row.address,
    notes: row.notes,
  };
}

const searchSchema = z.object({
  businessId: z.string().uuid(),
  query: z.string().trim().min(2),
});

/** Matches by phone or name — used to avoid creating duplicate customers. */
export async function searchCustomersAction(input: z.infer<typeof searchSchema>): Promise<Customer[]> {
  const parsed = searchSchema.parse(input);
  const supabase = createServerSupabaseClient();

  // Comma and parentheses are syntactically meaningful in PostgREST's .or()
  // filter string — strip them so a search containing either doesn't break
  // the query or match unintended rows.
  const safeQuery = parsed.query.replace(/[,()]/g, "").trim();
  if (!safeQuery) return [];

  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("business_id", parsed.businessId)
    .or(`phone.ilike.%${safeQuery}%,name.ilike.%${safeQuery}%`)
    .order("name")
    .limit(10);

  if (error) throw new Error("We couldn't search customers right now.");
  return (data ?? []).map(mapRow);
}

const createSchema = z.object({
  businessId: z.string().uuid(),
  name: z.string().trim().min(1, "Name is required").max(120),
  phone: z.string().trim().min(6, "Enter a valid phone number").max(20),
  whatsappNumber: z.string().trim().max(20).nullable(),
  email: z.string().trim().email().nullable().or(z.literal("")),
});

export async function createCustomerAction(input: z.infer<typeof createSchema>): Promise<Customer> {
  const parsed = createSchema.parse(input);
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from("customers")
    .insert({
      business_id: parsed.businessId,
      name: parsed.name,
      phone: parsed.phone,
      whatsapp_number: parsed.whatsappNumber || null,
      email: parsed.email || null,
    })
    .select()
    .single();

  if (error) throw new Error("We couldn't save this customer. Please try again.");

  revalidatePath("/customers");
  return mapRow(data);
}
