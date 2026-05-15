module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { flightNumber, bookingRef, seats } = req.body || {};

  if (!flightNumber || !bookingRef || !Array.isArray(seats) || !seats.length) {
    return res.status(400).json({ error: "Missing flightNumber, bookingRef, or seats" });
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
    const now = new Date();

    for (const seatNumber of seats) {
      const seatRes = await fetch(
        `${SUPABASE_URL}/rest/v1/seats?flight_id=eq.${flightId}&seat_number=eq.${encodeURIComponent(seatNumber)}&select=*`,
        {
          headers: {
            apikey: SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
          }
        }
      );

      const seatRows = await seatRes.json();
      const seat = seatRows[0];

      if (!seat) {
        return res.status(404).json({ error: `Seat ${seatNumber} not found` });
      }

      const lockedUntil = seat.locked_until ? new Date(seat.locked_until) : null;

      if (
        seat.status !== "locked" ||
        seat.booking_ref !== bookingRef ||
        !lockedUntil ||
        lockedUntil <= now
      ) {
        return res.status(409).json({
          error: `Seat ${seatNumber} is no longer reserved. Please reselect your seat.`
        });
      }
    }

    return res.status(200).json({ success: true });

  } catch (err) {
    console.error("VERIFY SEATS ERROR:", err);
    return res.status(500).json({ error: "Server error" });
  }
};
