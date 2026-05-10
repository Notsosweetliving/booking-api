module.exports = async function handler(req, res) {
  const { ref } = req.query;

  if (!ref) {
    return res.status(400).json({ error: "Missing booking reference" });
  }

  const SHOP = "blue-atlas-air.myshopify.com";
  const TOKEN = process.env.SHOPIFY_TOKEN;

  try {
    const response = await fetch(`https://${SHOP}/admin/api/2024-01/orders.json?status=any&limit=250`, {
      headers: {
        "X-Shopify-Access-Token": TOKEN,
        "Content-Type": "application/json"
      }
    });

    const data = await response.json();

    console.log("TOTAL ORDERS:", data.orders.length);

    data.orders.forEach(order => {
  order.line_items.forEach(item => {
    console.log("ITEM PROPERTIES:", item.properties);
  });
});

 const orders = data.orders || [];

// ✅ NORMALIZE FUNCTION (ADD HERE)
const normalize = (str) =>
  (str || "")
    .toString()
    .replace(/\s+/g, "")   // remove ALL whitespace
    .toUpperCase();

// ✅ NEW MATCH LOGIC (REPLACE OLD ONE)
const match = orders.find(order =>
  order.line_items.some(item =>
    (item.properties || []).some(p =>
      normalize(p.name) === "BOOKING" &&
      normalize(p.value) === normalize(ref)
    )
  )
);

    if (!match) {
      return res.status(404).json({ error: "Booking not found" });
    }

    if (!match) {
  return res.status(404).json({ error: "Booking not found" });
}

// 🔥 BUILD CLEAN BOOKING OBJECT
const passengers = [];

match.line_items.forEach(item => {
  const props = item.properties || [];

  const get = (name) =>
    props.find(p => p.name === name)?.value?.trim();

  if (get("Name")) {
    passengers.push({
      name: get("Name"),
      passport: get("Passport"),
      seat: get("Seat"),
      class: get("Class"),
      baggage: get("Baggage"),
      meal: get("Meal")
    });
  }
});

// ✅ RETURN CLEAN DATA
res.status(200).json({
  bookingRef: ref,
  flight: match.line_items.find(i => i.title)?.title,
  passengers
});

} catch (err) {
  console.error("REAL ERROR:", err);
  res.status(500).json({ error: "Server error" });
}
} 
