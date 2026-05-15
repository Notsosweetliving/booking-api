module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { flightNumber, seatNumber, bookingRef } = req.body || {};

  if (!flightNumber || !seatNumber || !bookingRef) {
    return res.status(400).json({
      error: "Missing flightNumber, seatNumber, or bookingRef"
    });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  try {
    const flightRes = await fetch(
      `${SUPABASE_URL}/rest/v1/flights?flight_number=eq.${encodeURIComponent(flightNumber)}&select=id`,
      {
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
        }
      }
    );

    const flights = await flightRes.json();

    if (!flights.length) {
      return res.status(404).json({ error: "Flight not found" });
    }

    const flightId = flights[0].id;

    const releaseRes = await fetch(
      `${SUPABASE_URL}/rest/v1/seats?flight_id=eq.${flightId}&seat_number=eq.${encodeURIComponent(seatNumber)}&booking_ref=eq.${encodeURIComponent(bookingRef)}&status=eq.locked`,
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

    const released = await releaseRes.json();

    return res.status(200).json({
      success: true,
      released
    });

  } catch (err) {
    console.error("RELEASE SEAT ERROR:", err);
    return res.status(500).json({ error: "Server error" });
  }
};


