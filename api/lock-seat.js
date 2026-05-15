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
    // 1. Get flight
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

    // 2. Get seat
    const seatRes = await fetch(
      `${SUPABASE_URL}/rest/v1/seats?flight_id=eq.${flightId}&seat_number=eq.${encodeURIComponent(seatNumber)}&select=*`,
      {
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
        }
      }
    );

    const seats = await seatRes.json();

    if (!seats.length) {
      return res.status(404).json({ error: "Seat not found" });
    }

    const seat = seats[0];

    const now = new Date();
    const lockedUntil = seat.locked_until ? new Date(seat.locked_until) : null;

    const isLockedStillValid =
      seat.status === "locked" && lockedUntil && lockedUntil > now;

    if (seat.status === "booked" || isLockedStillValid) {
      return res.status(409).json({
        error: "Seat is no longer available"
      });
    }

    // 3. Lock seat for 10 minutes
    const newLockedUntil = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const updateRes = await fetch(
      `${SUPABASE_URL}/rest/v1/seats?id=eq.${seat.id}`,
      {
        method: "PATCH",
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=representation"
        },
        body: JSON.stringify({
          status: "locked",
          locked_until: newLockedUntil,
          booking_ref: bookingRef
        })
      }
    );

    const updatedSeat = await updateRes.json();

    return res.status(200).json({
      success: true,
      seat: updatedSeat[0]
    });

  } catch (err) {
    console.error("LOCK SEAT ERROR:", err);
    return res.status(500).json({ error: "Server error" });
  }
};
