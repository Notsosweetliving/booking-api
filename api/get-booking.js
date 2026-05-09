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

    const match = orders.find(order =>
  order.line_items.some(item =>
    (item.properties || []).some(p =>
      (p.name || "").toLowerCase().trim() === "booking" &&
      (p.value || "").toUpperCase().trim() === ref.toUpperCase().trim()
    )
  )
);

    if (!match) {
      return res.status(404).json({ error: "Booking not found" });
    }

    res.status(200).json(match);

 catch (err) {
  res.status(500).json({ error: "Server error" });
}
} 
