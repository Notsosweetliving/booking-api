export default async function handler(req, res) {
  const { ref } = req.query;

  if (!ref) {
    return res.status(400).json({ error: "Missing booking reference" });
  }

  const SHOP = "your-store-name.myshopify.com";
  const TOKEN = process.env.SHOPIFY_TOKEN;

  try {
    const response = await fetch(`https://${SHOP}/admin/api/2024-01/orders.json?status=any`, {
      headers: {
        "X-Shopify-Access-Token": TOKEN,
        "Content-Type": "application/json"
      }
    });

    const data = await response.json();

    const orders = data.orders || [];

    const match = orders.find(order =>
  order.line_items.some(item =>
    (item.properties || []).some(p =>
      p.name && p.name.toLowerCase() === "booking" &&
      p.value && p.value.trim() === ref.trim()
    )
  )
);

    if (!match) {
      return res.status(404).json({ error: "Booking not found" });
    }

    res.status(200).json(match);

  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
} 
