export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: corsHeaders });
    }

    try {
      const data = await request.json();
      
      const categoryName = data.category || "Algemene aanvraag";
      const isBusiness = data.isBusiness || false;
      const attachments = data.attachments || [];

      // Splits de bijlagen: PDF gaat naar klant, Foto's + PDF gaan naar NRT
      const quotePdf = attachments.find(a => a.type === 'application/pdf');
      const photos = attachments.filter(a => a.type !== 'application/pdf');

      // --- EMAIL 1: NAAR DE KLANT (MET ALLEEN DE OFFERTE) ---
      const customerEmailHtml = `
      <!DOCTYPE html>
      <html>
      <body style="font-family: 'Segoe UI', sans-serif; color: #333;">
        <div style="max-width: 600px; margin: 0 auto;">
          <h2 style="color: #e30613;">Bedankt voor uw aanvraag, ${data.firstname}!</h2>
          <p>We hebben uw gegevens voor een laadpaalinstallatie goed ontvangen.</p>
          <p>In de bijlage vindt u direct een <strong>indicatieve offerte</strong> (PDF) op basis van de door u ingevulde gegevens.</p>
          <p>Wij gaan uw meegestuurde foto's bekijken om de situatie definitief te beoordelen. Mocht de installatie afwijken van de standaard situatie, nemen wij contact met u op.</p>
          <br>
          <p>Met vriendelijke groet,<br><strong>NRT Elektroservice</strong></p>
        </div>
      </body>
      </html>
      `;

      // Verzend naar klant
      const emailToCustomer = fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "NRT Elektroservice <info@spectux.com>", // Let op: gebruik je geverifieerde domein
          to: [data.email],
          subject: `Uw Offerte Aanvraag: ${categoryName}`,
          html: customerEmailHtml,
          attachments: quotePdf ? [quotePdf] : [] // Alleen PDF naar klant
        }),
      });

      // --- EMAIL 2: NAAR NRT (MET FOTO'S & DATA & PDF) ---
      const nrtEmailHtml = `
      <!DOCTYPE html>
      <html>
      <body style="font-family: sans-serif;">
        <h2 style="color: #e30613;">Nieuwe Aanvraag: ${data.firstname} ${data.lastname}</h2>
        <p><strong>Type:</strong> ${isBusiness ? "Zakelijk" : "Particulier"}</p>
        <p><strong>Email:</strong> ${data.email} | <strong>Tel:</strong> ${data.phone}</p>
        <p><strong>Adres:</strong> ${data.houseNumber}, ${data.zipcode} ${data.city}</p>
        <hr>
        <h3>Details uit formulier:</h3>
        <pre style="background: #f4f4f4; padding: 10px;">${data.message}</pre>
        <p><em>De proefofferte en ${photos.length} foto's zijn bijgevoegd.</em></p>
      </body>
      </html>
      `;

      // Verzend naar NRT (alle attachments: foto's + pdf)
      const emailToNRT = fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "NRT Website <info@spectux.com>",
          to: ["info@nrtelektroservice.nl"], 
          reply_to: data.email,
          subject: `AANVRAAG: ${data.firstname} ${data.lastname} - ${categoryName}`,
          html: nrtEmailHtml,
          attachments: attachments // Alles naar jezelf
        }),
      });

      // Wacht tot beide mails verstuurd zijn
      await Promise.all([emailToCustomer, emailToNRT]);

      return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });

    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
    }
  },
};
