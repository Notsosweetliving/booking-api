module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  try {
    const order = req.body;

    const bookingRefs = new Set();
    const seatsToBook = [];

    (order.line_items || []).forEach(item => {
      const props = item.properties || [];

      const get = (name) =>
        props.find(p => p.name === name)?.value?.toString().trim();

      const bookingRef = get("Booking");
      const flight = get("Flight");
      const seat = get("Seat");

      if (bookingRef) bookingRefs.add(bookingRef);

      if (bookingRef && flight && seat) {
        seatsToBook.push({
          bookingRef,
          flight,
          seat
        });
      }
    });

    for (const item of seatsToBook) {
      const flightRes = await fetch(
        `${SUPABASE_URL}/rest/v1/flights?flight_number=eq.${encodeURIComponent(item.flight)}&select=id`,
        {
          headers: {
            apikey: SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
          }
        }
      );

      const flights = await flightRes.json();
      if (!flights.length) continue;

      const flightId = flights[0].id;

      await fetch(
        `${SUPABASE_URL}/rest/v1/seats?flight_id=eq.${flightId}&seat_number=eq.${encodeURIComponent(item.seat)}`,
        {
          method: "PATCH",
          headers: {
            apikey: SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            status: "booked",
            locked_until: null,
            booking_ref: item.bookingRef
          })
        }
      );
    }

    return res.status(200).json({
      success: true,
      bookedSeats: seatsToBook.length,
      bookingRefs: Array.from(bookingRefs)
    });

  } catch (err) {
    console.error("ORDER PAID ERROR:", err);
    return res.status(500).json({ error: "Server error" });
  }
};
