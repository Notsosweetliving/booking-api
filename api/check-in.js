module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { bookingRef, email } = req.body || {};

  if (!bookingRef || !email) {
    return res.status(400).json({ error: "Missing booking reference or email" });
  }

  const SHOP = "blue-atlas-air.myshopify.com";
  const SHOPIFY_TOKEN = process.env.SHOPIFY_TOKEN;

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  try {
    const shopifyRes = await fetch(
      `https://${SHOP}/admin/api/2024-01/orders.json?status=any&limit=250`,
      {
        headers: {
          "X-Shopify-Access-Token": SHOPIFY_TOKEN,
          "Content-Type": "application/json"
        }
      }
    );

    const shopifyData = await shopifyRes.json();
    const orders = shopifyData.orders || [];

    const normalize = (str) =>
      (str || "").toString().replace(/\s+/g, "").toUpperCase();

    const match = orders.find(order =>
      order.line_items.some(item =>
        (item.properties || []).some(p =>
          normalize(p.name) === "BOOKING" &&
          normalize(p.value) === normalize(bookingRef)
        )
      )
    );

    if (!match) {
      return res.status(404).json({ error: "Booking not found" });
    }

    const orderEmail = (match.email || match.contact_email || "").toLowerCase().trim();

    if (orderEmail !== email.toLowerCase().trim()) {
      return res.status(403).json({ error: "Email does not match booking" });
    }

    const passengers = [];

    match.line_items.forEach(item => {
      const props = item.properties || [];

      const get = (name) =>
        props.find(p => p.name === name)?.value?.toString().trim();

      if (get("Name")) {
        passengers.push({
          name: get("Name"),
          seat: get("Seat"),
          flight: get("Flight")
        });
      }
    });

    const created = [];

    for (let i = 0; i < passengers.length; i++) {
      const p = passengers[i];

      const boardingGroup = `Group ${Math.min(i + 1, 5)}`;
      const sequenceNumber = String(i + 1).padStart(3, "0");

      const supabaseRes = await fetch(
        `${SUPABASE_URL}/rest/v1/checkins`,
        {
          method: "POST",
          headers: {
            apikey: SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            "Content-Type": "application/json",
            Prefer: "return=representation"
          },
          body: JSON.stringify({
            booking_ref: bookingRef,
            passenger_name: p.name,
            seat_number: p.seat,
            flight_number: p.flight,
            email,
            status: "checked_in",
            boarding_group: boardingGroup,
            sequence_number: sequenceNumber
          })
        }
      );

      const row = await supabaseRes.json();
      created.push(row[0]);
    }

    return res.status(200).json({
      success: true,
      bookingRef,
      passengers: created
    });

  } catch (err) {
    console.error("CHECK-IN ERROR:", err);
    return res.status(500).json({ error: "Server error" });
  }
};
