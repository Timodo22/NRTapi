export default {
  async fetch(request, env) {
    // 1. CORS Headers (Zodat je website met de API mag praten)
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*", // Voor productie: verander '*' naar 'https://nrtelektroservice.nl'
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    // Handle OPTIONS request (Preflight check van de browser)
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: corsHeaders });
    }

    try {
      const data = await request.json();

      // 2. Email Opmaak (HTML Design)
      const htmlEmail = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
          .header { background-color: #e30613; padding: 30px; text-align: center; }
          .header h1 { color: #ffffff; margin: 0; font-size: 24px; text-transform: uppercase; letter-spacing: 1px; }
          .content { padding: 30px; color: #333333; }
          .field { margin-bottom: 15px; border-bottom: 1px solid #eeeeee; padding-bottom: 10px; }
          .label { font-weight: bold; color: #e30613; display: block; font-size: 12px; text-transform: uppercase; margin-bottom: 4px; }
          .value { font-size: 16px; line-height: 1.5; }
          .footer { background-color: #222222; color: #888888; padding: 20px; text-align: center; font-size: 12px; }
          .footer a { color: #aaaaaa; text-decoration: underline; }
          .btn { display: inline-block; background-color: #222; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin-top: 20px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Nieuwe Offerte Aanvraag</h1>
          </div>
          <div class="content">
            <p>Beste Bart,</p>
            <p>Er is een nieuwe offerte aanvraag binnengekomen via de website voor <strong>Verlichting Installatie</strong>.</p>
            
            <div class="field">
              <span class="label">Naam</span>
              <span class="value">${data.firstname} ${data.lastname}</span>
            </div>
            
            <div class="field">
              <span class="label">Contactgegevens</span>
              <span class="value">${data.email}<br>${data.phone}</span>
            </div>

            <div class="field">
              <span class="label">Locatie</span>
              <span class="value">${data.address} ${data.houseNumber}<br>${data.zipcode} ${data.city}</span>
            </div>

            <div class="field">
              <span class="label">Bericht / Opmerkingen</span>
              <span class="value">${data.message || "Geen opmerkingen."}</span>
            </div>
            
            ${data.attachments && data.attachments.length > 0 ? `<p style="color:#e30613;"><strong>📎 Let op:</strong> Er zijn bijlagen toegevoegd aan deze e-mail.</p>` : ''}
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} NRT Elektroservice - Website Formulier</p>
            <p style="margin-top: 10px; font-size: 11px;">
                Systemen & Development door <a href="https://spectux.com" target="_blank">Spectux.com</a>
            </p>
          </div>
        </div>
      </body>
      </html>
      `;

      // 3. Verstuur naar Resend
      const resendResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "NRT Electro techniek Website <info@spectux.com>",
          to: ["info@nrtelektroservice.nl"],
          reply_to: data.email, // Zodat je direct terug kunt mailen naar de klant
          subject: `Nieuwe aanvraag: ${data.firstname} ${data.lastname}`,
          html: htmlEmail,
          attachments: data.attachments || [] // Voeg bestanden toe als die er zijn
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
