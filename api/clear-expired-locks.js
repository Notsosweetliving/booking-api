module.exports = async function handler(req, res) {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  try {
    const now = new Date().toISOString();

    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/seats?status=eq.locked&locked_until=lt.${now}`,
      {
        method: "PATCH",
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=representation"
        },
        body: JSON.stringify({
          status: "available",
          locked_until: null,
          booking_ref: null
        })
      }
    );

    const data = await response.json();

    return res.status(200).json({
      success: true,
      released: data.length,
      seats: data
    });
  } catch (err) {
    console.error("CLEAR LOCKS ERROR:", err);
    return res.status(500).json({ error: "Server error" });
  }
};
