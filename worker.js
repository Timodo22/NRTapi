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

      // HTML Email opbouw
      const htmlEmail = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
          .header { background-color: #e30613; padding: 30px; text-align: center; }
          .header h1 { color: #ffffff; margin: 0; font-size: 22px; text-transform: uppercase; }
          .content { padding: 30px; color: #333333; }
          .field { margin-bottom: 15px; border-bottom: 1px solid #eeeeee; padding-bottom: 10px; }
          .label { font-weight: bold; color: #e30613; display: block; font-size: 11px; text-transform: uppercase; margin-bottom: 4px; }
          .value { font-size: 15px; line-height: 1.5; }
          .footer { background-color: #222222; color: #888888; padding: 20px; text-align: center; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Nieuwe Zakelijke Aanvraag</h1>
          </div>
          <div class="content">
            <p>Er is een nieuwe aanvraag binnengekomen via het <strong>zakelijke formulier</strong>.</p>
            
            <div class="field">
              <span class="label">Klantnaam</span>
              <span class="value">${data.firstname} ${data.lastname || ""}</span>
            </div>
            
            <div class="field">
              <span class="label">Contactgegevens</span>
              <span class="value">E: ${data.email}<br>T: ${data.phone}</span>
            </div>

            ${!isBusiness ? `
            <div class="field">
              <span class="label">Locatie</span>
              <span class="value">${data.zipcode || ""} ${data.city || ""}<br>Huisnummer: ${data.houseNumber || ""}</span>
            </div>
            ` : ''}

            <div class="field">
              <span class="label">Onderwerp / Categorie</span>
              <span class="value">${categoryName}</span>
            </div>

            <div class="field">
              <span class="label">Bericht</span>
              <span class="value">${(data.message || "Geen opmerkingen.").replace(/\n/g, '<br>')}</span>
            </div>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} NRT Elektroservice - Zakelijk Formulier</p>
          </div>
        </div>
      </body>
      </html>
      `;

      const resendResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "NRT Elektroservice <info@spectux.com>",
          to: ["bartheesbeen4@gmail.com"],
          reply_to: data.email,
          subject: `ZAKELIJK: ${categoryName} - ${data.firstname}`,
          html: htmlEmail,
        }),
      });

      if (!resendResponse.ok) {
        const errorText = await resendResponse.text();
        return new Response(JSON.stringify({ error: errorText }), { status: 500, headers: corsHeaders });
      }

      return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });

    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
    }
  },
};
