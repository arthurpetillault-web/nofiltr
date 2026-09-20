export default async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: { Allow: "POST" }
    });
  }

  const body = await req.text();
  const params = new URLSearchParams(body);

  const name = (params.get("name") || "").trim();
  const venue = (params.get("venue") || "").trim();
  const email = (params.get("email") || "").trim();
  const phone = (params.get("phone") || "").trim();
  const message = (params.get("message") || "").trim();
  const bot = (params.get("bot-field") || "").trim();

  const redirect = (state) =>
    new Response(null, {
      status: 302,
      headers: { Location: `/?contact=${state}#contact` }
    });

  if (bot) return redirect("sent");
  if (!name || !email || !message) return redirect("error");

  const apiKey = Netlify.env.get("RESEND_API_KEY");
  if (!apiKey) {
    console.error("Missing RESEND_API_KEY");
    return redirect("error");
  }

  const esc = (value) => String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

  const subjectVenue = venue ? " · " + venue : "";

  const html = `<!doctype html>
<html>
  <body style="font-family:Arial,sans-serif;color:#171717;line-height:1.55">
    <h2 style="margin:0 0 20px">Nouvelle demande NF:ACADEMY</h2>
    <p><strong>Nom :</strong> ${esc(name)}</p>
    <p><strong>Établissement :</strong> ${esc(venue || "—")}</p>
    <p><strong>Email :</strong> ${esc(email)}</p>
    <p><strong>Téléphone :</strong> ${esc(phone || "—")}</p>
    <hr style="border:0;border-top:1px solid #ddd;margin:24px 0">
    <p><strong>Message :</strong></p>
    <p style="white-space:pre-wrap">${esc(message)}</p>
  </body>
</html>`;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "NF:ACADEMY Website <contact-form@terroirsvivants.fr>",
        to: ["contact@nofiltr.fr"],
        reply_to: email,
        subject: `Nouvelle demande NF:ACADEMY · ${name}${subjectVenue}`,
        html
      })
    });

    if (!response.ok) {
      console.error("Resend error", response.status, await response.text());
      return redirect("error");
    }

    return redirect("sent");
  } catch (error) {
    console.error("Contact form error", error);
    return redirect("error");
  }
};