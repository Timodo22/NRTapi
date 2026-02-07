export default {
  async fetch(request, env) {
    // 1. CORS Headers instellen (zodat je website mag praten met deze API)
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    // 2. Pre-flight check (OPTIONS)
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // 3. Alleen POST toestaan
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: corsHeaders });
    }

    try {
      const data = await request.json();

      // --- CONFIGURATIE ---
      const OWNER_EMAIL = "info@nrtelektroservice.nl"; // Jouw ontvangst adres
      const SENDER_EMAIL = "NRT Elektroservice <info@nrtelektroservice.nl>"; // Je geverifieerde Resend domein
      
      // Data normaliseren
      const categoryName = data.category || "Algemene aanvraag";
      const isBusiness = data.isBusiness || false;
      const attachments = data.attachments || [];
      const formTitle = isBusiness ? "Zakelijke Aanvraag" : `Offerte: ${categoryName}`;

      // --- LOGICA BEPALEN: IS DIT EEN LAADPAAL OFFERTE? ---
      // We kijken of er een PDF bij zit EN of de categorie 'Laadpaal' bevat.
      const quotePdf = attachments.find(a => a.type === 'application/pdf');
      const isQuoteFlow = quotePdf && categoryName.toLowerCase().includes("laadpaal");

      // --- STAP A: EMAIL VORMGEVING VOOR JOU (NRT) ---
      // We gebruiken hier jouw mooie HTML template uit de eerste code, 
      // zodat ELKE aanvraag er strak uitziet in jouw inbox.
      
      const generateOwnerHtml = (title, messageContent) => `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
          .header { background-color: #e30613; padding: 30px; text-align: center; }
          .header h1 { color: #ffffff; margin: 0; font-size: 20px; text-transform: uppercase; }
          .content { padding: 30px; color: #333333; }
          .field { margin-bottom: 15px; border-bottom: 1px solid #eeeeee; padding-bottom: 10px; }
          .label { font-weight: bold; color: #e30613; display: block; font-size: 11px; text-transform: uppercase; margin-bottom: 4px; }
          .value { font-size: 15px; line-height: 1.5; }
          .attachment-alert { background-color: #fff5f5; border: 1px solid #ffcccc; padding: 10px; color: #e30613; border-radius: 5px; font-weight: bold; margin-top: 15px; }
          .footer { background-color: #222222; color: #888888; padding: 20px; text-align: center; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${title}</h1>
          </div>
          <div class="content">
            <p>Er is een nieuwe aanvraag binnengekomen voor: <strong>${categoryName}</strong>.</p>
            
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
              <span class="label">Bericht / Details</span>
              <span class="value">${(messageContent || "Geen opmerkingen.").replace(/\n/g, '<br>')}</span>
            </div>

            ${attachments.length > 0 ? `
              <div class="attachment-alert">
                📎 Er zijn ${attachments.length} bestanden meegeleverd (zie bijlagen).
              </div>
            ` : ''}
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} NRT Elektroservice - Website Formulier</p>
          </div>
        </div>
      </body>
      </html>
      `;

      const emailsToSend = [];

      // --- SCENARIO 1: LAADPAAL MET DIRECTE OFFERTE ---
      if (isQuoteFlow) {
        // 1. Mail naar de KLANT (alleen PDF)
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

        emailsToSend.push(fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Authorization": `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: SENDER_EMAIL,
            to: [data.email],
            subject: `Uw Offerte Aanvraag: ${categoryName}`,
            html: customerEmailHtml,
            attachments: [quotePdf] // Alleen de PDF naar de klant
          }),
        }));

        // 2. Mail naar NRT (Foto's + PDF + Data) - gebruik de mooie template
        emailsToSend.push(fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Authorization": `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: SENDER_EMAIL,
            to: [OWNER_EMAIL],
            reply_to: data.email,
            subject: `NIEUWE AANVRAAG: ${data.firstname} ${data.lastname} - ${categoryName}`,
            html: generateOwnerHtml(formTitle, data.message), // Hergebruik de mooie styling
            attachments: attachments // Alles naar jou (PDF + Foto's)
          }),
        }));

      } else {
        // --- SCENARIO 2: STANDAARD FORMULIER (Verlichting, Groepenkast, Contact) ---
        
        // Alleen mail naar NRT
        emailsToSend.push(fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Authorization": `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: SENDER_EMAIL,
            to: [OWNER_EMAIL],
            reply_to: data.email,
            subject: `${isBusiness ? 'ZAKELIJK' : 'OFFERTE'}: ${categoryName} - ${data.firstname}`,
            html: generateOwnerHtml(formTitle, data.message),
            attachments: attachments // Alle bijlagen (indien aanwezig)
          }),
        }));
      }

      // Verstuur alle mails (1 of 2, afhankelijk van scenario)
      const results = await Promise.all(emailsToSend);

      // Check of er fouten waren
      for (const res of results) {
        if (!res.ok) {
          const errorText = await res.text();
          console.error("Resend Error:", errorText);
          return new Response(JSON.stringify({ error: errorText }), { status: 500, headers: corsHeaders });
        }
      }

      return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });

    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
    }
  },
};
