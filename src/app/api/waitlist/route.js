import { getAdminSupabase } from "@/lib/supabase";

// Server-only App Router handler — uses SUPABASE_SERVICE_ROLE_KEY
export async function POST(req) {
  try {
    const body = await req.json();
    let { email } = body || {};

    if (!email || typeof email !== "string") {
      return Response.json({ error: "Email required" }, { status: 400 });
    }

    email = email.toLowerCase().trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return Response.json({ error: "Invalid email" }, { status: 400 });
    }

    const admin = getAdminSupabase();

    const { error } = await admin.from("waitlist").insert([{ email }]);

    if (error) {
      // If the table enforces unique email, Supabase will return an error for duplicates.
      // Return a friendly message for duplicate signups.
      const isDuplicate = /unique|duplicate/i.test(error.message || "");
      return Response.json(
        { error: isDuplicate ? "Already signed up" : error.message },
        { status: isDuplicate ? 400 : 500 }
      );
    }

    return Response.json({ success: true }, { status: 201 });
  } catch (err) {
    console.error("/api/waitlist POST error:", err);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
