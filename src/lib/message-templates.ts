export type TemplateValues = {
  category?: string;
  company?: string;
  email?: string;
  name?: string;
  website?: string;
};

export type MessageTemplate = {
  body: string;
  cta: string;
  description: string;
  html: string;
  name: string;
  subject: string;
  tone: string;
};

function wrapWithLayout(title: string, bgColor: string, mainContentHtml: string) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:'Segoe UI',-apple-system,BlinkMacSystemFont,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#f8fafc;padding:40px 10px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:580px;background-color:#ffffff;border-radius:16px;border:1px solid #e2e8f0;box-shadow:0 4px 12px rgba(0,0,0,0.03);overflow:hidden;border-collapse:separate;">
          <tr>
            <td style="background-color:${bgColor};padding:35px 40px;text-align:left;">
              <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:0;">Leads Pipeline</h1>
              <p style="margin:5px 0 0 0;color:rgba(255,255,255,0.85);font-size:13px;font-weight:400;letter-spacing:0.5px;text-transform:uppercase;">AI Outreach Console</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 40px 35px 40px;background-color:#ffffff;">
              ${mainContentHtml}
            </td>
          </tr>
          <tr>
            <td style="background-color:#f8fafc;padding:25px 40px;text-align:center;border-top:1px solid #f1f5f9;">
              <p style="margin:0;color:#64748b;font-size:12px;line-height:1.5;">
                &copy; 2026 <strong>Leads Pipeline Inc.</strong> All rights reserved.
              </p>
              <p style="margin:6px 0 0 0;color:#94a3b8;font-size:11px;line-height:1.4;">
                This automation message was dispatched on behalf of your workspace targets.<br>
                If you wish to opt out or modify configuration, please contact support.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

const htmlBodies: Record<string, { bgColor: string; body: string; title: string }> = {
  "Welcome Growth": {
    title: "Welcome to Leads Pipeline Engine",
    bgColor: "#4f46e5",
    body: `
      <h2 style="margin-top:0;color:#0f172a;font-size:21px;font-weight:700;letter-spacing:0;">Welcome to the pipeline, {{name}}.</h2>
      <p style="color:#334155;font-size:15px;line-height:1.6;margin-top:15px;">We are ready to help <strong>{{company}}</strong> turn more attention into qualified pipeline.</p>
      <p style="color:#334155;font-size:15px;line-height:1.6;">A few focused improvements to lead capture, follow-up, and offer clarity can create more consistent enquiries without rebuilding your entire process.</p>
      <div style="margin-top:30px;padding:15px 20px;background-color:#f1f5f9;border-left:4px solid #4f46e5;border-radius:4px;">
        <span style="color:#1e293b;font-size:13px;font-weight:600;">Status indicator:</span>
        <span style="color:#16a34a;font-size:13px;font-weight:700;margin-left:5px;">Active growth opportunity</span>
      </div>
    `,
  },
  "Website Audit": {
    title: "Technical Performance Audit Results",
    bgColor: "#0ea5e9",
    body: `
      <h2 style="margin-top:0;color:#0f172a;font-size:21px;font-weight:700;letter-spacing:0;">Website performance diagnostics</h2>
      <p style="color:#334155;font-size:15px;line-height:1.6;margin-top:15px;">Hello {{name}},</p>
      <p style="color:#334155;font-size:15px;line-height:1.6;">I reviewed the public website for <strong>{{company}}</strong> and noticed a few conversion points that could be made clearer.</p>
      <p style="color:#334155;font-size:15px;line-height:1.6;">The main areas are headline clarity, proof near the enquiry path, and fewer steps before a visitor can contact you. I can send a short audit if you want to review the details.</p>
    `,
  },
  "Local SEO": {
    title: "Regional Local Visibility Optimization Report",
    bgColor: "#f59e0b",
    body: `
      <h2 style="margin-top:0;color:#0f172a;font-size:21px;font-weight:700;letter-spacing:0;">Regional search performance report</h2>
      <p style="color:#334155;font-size:15px;line-height:1.6;margin-top:15px;">Hi {{name}},</p>
      <p style="color:#334155;font-size:15px;line-height:1.6;">While reviewing local intent data in the {{category}} space, I noticed areas where <strong>{{company}}</strong> could capture more local search demand.</p>
      <p style="color:#334155;font-size:15px;line-height:1.6;">A focused plan around service pages, map visibility, citations, and location signals can help put your brand in front of more ready-to-buy local buyers.</p>
    `,
  },
  "Paid Ads Lift": {
    title: "Strategic Optimization Strategies for Paid Funnels",
    bgColor: "#dc2626",
    body: `
      <h2 style="margin-top:0;color:#0f172a;font-size:21px;font-weight:700;letter-spacing:0;">Paid acquisition optimization sheet</h2>
      <p style="color:#334155;font-size:15px;line-height:1.6;margin-top:15px;">Hello {{name}},</p>
      <p style="color:#334155;font-size:15px;line-height:1.6;">If <strong>{{company}}</strong> is running paid campaigns, there may be room to improve results without increasing spend.</p>
      <p style="color:#334155;font-size:15px;line-height:1.6;">The usual leaks are broad targeting, landing pages that do not match intent, and slow follow-up after the lead arrives. I can send a quick review of the highest-impact fixes.</p>
    `,
  },
  "Ecommerce Revenue": {
    title: "Maximize Transactional Store Conversions",
    bgColor: "#10b981",
    body: `
      <h2 style="margin-top:0;color:#0f172a;font-size:21px;font-weight:700;letter-spacing:0;">Ecommerce revenue optimization</h2>
      <p style="color:#334155;font-size:15px;line-height:1.6;margin-top:15px;">Hi {{name}},</p>
      <p style="color:#334155;font-size:15px;line-height:1.6;">I noticed a practical revenue opportunity for <strong>{{company}}</strong> around store conversion and cart recovery.</p>
      <p style="color:#334155;font-size:15px;line-height:1.6;">Better product-page clarity, checkout sequencing, and follow-up can help convert more of the traffic you already have into realized revenue.</p>
    `,
  },
  "Booking Boost": {
    title: "Maximize Appointment Booking Capacities",
    bgColor: "#6366f1",
    body: `
      <h2 style="margin-top:0;color:#0f172a;font-size:21px;font-weight:700;letter-spacing:0;">Automate your client booking flow</h2>
      <p style="color:#334155;font-size:15px;line-height:1.6;margin-top:15px;">Hi {{name}},</p>
      <p style="color:#334155;font-size:15px;line-height:1.6;">I wanted to share a simple way <strong>{{company}}</strong> could turn more enquiries into booked appointments.</p>
      <p style="color:#334155;font-size:15px;line-height:1.6;">Faster response times, clearer next steps, and reminder messages can reduce drop-off and keep more qualified leads moving toward a confirmed booking.</p>
    `,
  },
  "B2B Pipeline": {
    title: "High-Ticket Enterprise B2B Acquisition Channels",
    bgColor: "#1e293b",
    body: `
      <h2 style="margin-top:0;color:#0f172a;font-size:21px;font-weight:700;letter-spacing:0;">Scalable B2B client acquisition engine</h2>
      <p style="color:#334155;font-size:15px;line-height:1.6;margin-top:15px;">Hello {{name}},</p>
      <p style="color:#334155;font-size:15px;line-height:1.6;">Building a cleaner B2B pipeline for <strong>{{company}}</strong> usually comes down to verified contacts, precise targeting, and consistent follow-up.</p>
      <p style="color:#334155;font-size:15px;line-height:1.6;">I can share a sample outbound structure that maps decision-maker segments, messaging angles, and follow-up timing for your target market.</p>
    `,
  },
  "Trust Builder": {
    title: "Social Proof Validation Blueprint",
    bgColor: "#8b5cf6",
    body: `
      <h2 style="margin-top:0;color:#0f172a;font-size:21px;font-weight:700;letter-spacing:0;">Leveraging authority to drive value</h2>
      <p style="color:#334155;font-size:15px;line-height:1.6;margin-top:15px;">Hi {{name}},</p>
      <p style="color:#334155;font-size:15px;line-height:1.6;">Trust signals can directly influence how many visitors decide to contact <strong>{{company}}</strong>.</p>
      <p style="color:#334155;font-size:15px;line-height:1.6;">Reviews, proof points, guarantees, case results, and clear positioning can make the next step feel lower risk for high-intent prospects.</p>
    `,
  },
  "Lead Reactivation": {
    title: "Latent Customer Database Reactivation Strategy",
    bgColor: "#ec4899",
    body: `
      <h2 style="margin-top:0;color:#0f172a;font-size:21px;font-weight:700;letter-spacing:0;">Reactivate your latent pipeline</h2>
      <p style="color:#334155;font-size:15px;line-height:1.6;margin-top:15px;">Hello {{name}},</p>
      <p style="color:#334155;font-size:15px;line-height:1.6;">Past enquiries and old leads often hold untapped value for <strong>{{company}}</strong>.</p>
      <p style="color:#334155;font-size:15px;line-height:1.6;">A simple reactivation sequence can restart warm conversations without needing a new ad budget. I can outline a short 3-message sequence if useful.</p>
    `,
  },
  "Partnership Pitch": {
    title: "Strategic Co-Marketing Alliance Blueprint",
    bgColor: "#14b8a6",
    body: `
      <h2 style="margin-top:0;color:#0f172a;font-size:21px;font-weight:700;letter-spacing:0;">Strategic partnership architecture</h2>
      <p style="color:#334155;font-size:15px;line-height:1.6;margin-top:15px;">Hi {{name}},</p>
      <p style="color:#334155;font-size:15px;line-height:1.6;">I have been reviewing <strong>{{company}}</strong> and wanted to explore a possible partnership angle in the {{category}} space.</p>
      <p style="color:#334155;font-size:15px;line-height:1.6;">There may be a useful way to combine stronger lead flow, clearer outreach, and better conversion follow-up into a project that benefits both sides.</p>
    `,
  },
};

function emailHtml(templateName: string) {
  const template = htmlBodies[templateName];
  return wrapWithLayout(template.title, template.bgColor, template.body);
}

export function applyTemplateValues(template: string, values: TemplateValues) {
  const replacements: Required<TemplateValues> = {
    category: values.category || "business",
    company: values.company || "your company",
    email: values.email || "",
    name: values.name || values.company || "there",
    website: values.website || "your website",
  };

  return template
    .replaceAll("{{name}}", replacements.name)
    .replaceAll("{{company}}", replacements.company)
    .replaceAll("{{website}}", replacements.website)
    .replaceAll("{{category}}", replacements.category)
    .replaceAll("{{email}}", replacements.email);
}

export const messageTemplates: MessageTemplate[] = [
  {
    name: "Welcome Growth",
    tone: "Warm intro",
    subject: "Quick growth idea for {{company}}",
    description: "Friendly first-touch note for opening a conversation.",
    cta: "Share growth idea",
    body: "Hi {{name}},\n\nI came across {{company}} while looking at {{category}} businesses and wanted to share a quick growth idea.\n\nA few small improvements to offer clarity, lead capture, and follow-up could help turn more website visitors into real enquiries without changing your whole process.\n\nIf useful, I can send 2-3 practical ideas specific to {{company}}.\n\nBest,\n{{email}}",
    html: emailHtml("Welcome Growth"),
  },
  {
    name: "Website Audit",
    tone: "Useful audit",
    subject: "Website audit notes for {{company}}",
    description: "Conversion-focused website improvement email.",
    cta: "Send audit",
    body: "Hi {{name}},\n\nI reviewed {{website}} and noticed a few places where {{company}} could make the visitor journey easier.\n\nThe main opportunities are usually clearer headline messaging, stronger proof near the enquiry button, and fewer steps before someone contacts you.\n\nI can send a short website audit with screenshots and suggested fixes if you would like to review it.\n\nRegards,\n{{email}}",
    html: emailHtml("Website Audit"),
  },
  {
    name: "Local SEO",
    tone: "Local growth",
    subject: "Local search opportunity for {{company}}",
    description: "Local search ranking and visibility outreach.",
    cta: "Show local gaps",
    body: "Hi {{name}},\n\nI found {{company}} while researching local {{category}} providers and noticed there may be room to capture more high-intent searches.\n\nA focused local SEO plan could improve service-page targeting, Google visibility, location signals, and enquiry quality.\n\nI can send a quick local search snapshot for {{company}} with the main gaps and wins.\n\nThanks,\n{{email}}",
    html: emailHtml("Local SEO"),
  },
  {
    name: "Paid Ads Lift",
    tone: "Performance",
    subject: "Paid ads lift for {{company}}",
    description: "Ad audit email for lead-gen businesses.",
    cta: "Review ad funnel",
    body: "Hi {{name}},\n\nIf {{company}} is running paid ads, there may be an opportunity to improve results without increasing spend.\n\nMost ad funnels lose leads through broad targeting, generic landing pages, or slow follow-up after the form is submitted.\n\nI can send a quick paid ads review showing where budget may be leaking and what to fix first.\n\nBest,\n{{email}}",
    html: emailHtml("Paid Ads Lift"),
  },
  {
    name: "Ecommerce Revenue",
    tone: "Revenue",
    subject: "Revenue wins for {{company}}",
    description: "Store conversion and retention template.",
    cta: "Review store",
    body: "Hi {{name}},\n\nI came across {{company}} and wanted to share a practical ecommerce revenue angle.\n\nSmall improvements to product pages, offer clarity, cart recovery, and post-purchase follow-up can often increase revenue from the traffic you already have.\n\nI can send a short store funnel review with the highest-impact fixes for {{company}}.\n\nRegards,\n{{email}}",
    html: emailHtml("Ecommerce Revenue"),
  },
  {
    name: "Booking Boost",
    tone: "Direct",
    subject: "More bookings for {{company}}",
    description: "Appointment-setting and lead follow-up pitch.",
    cta: "Improve bookings",
    body: "Hi {{name}},\n\nI noticed {{company}} may be able to turn more enquiries into booked appointments with a cleaner booking flow.\n\nThe biggest gains usually come from faster response times, clearer next steps, reminder messages, and a simple way for leads to choose a time.\n\nI can share a short booking-flow improvement plan for {{company}} if helpful.\n\nBest,\n{{email}}",
    html: emailHtml("Booking Boost"),
  },
  {
    name: "B2B Pipeline",
    tone: "Professional",
    subject: "B2B pipeline idea for {{company}}",
    description: "Outbound pipeline and verified leads template.",
    cta: "Map pipeline",
    body: "Hi {{name}},\n\nI help B2B teams build cleaner outbound pipelines with verified contacts, targeted messaging, and consistent follow-up.\n\n{{company}} looks like a business where a focused outreach system could create more qualified conversations without adding extra manual work.\n\nI can send a sample campaign structure for {{company}} if you would like to see it.\n\nThanks,\n{{email}}",
    html: emailHtml("B2B Pipeline"),
  },
  {
    name: "Trust Builder",
    tone: "Credibility",
    subject: "Trust signals for {{company}}",
    description: "Reputation and conversion trust template.",
    cta: "Strengthen trust",
    body: "Hi {{name}},\n\nI noticed {{company}} could make its trust signals more visible before visitors decide to enquire.\n\nA stronger mix of reviews, proof points, guarantees, case results, and clear service positioning can help more people feel confident taking the next step.\n\nI can send a quick trust-signal checklist for {{company}} if useful.\n\nRegards,\n{{email}}",
    html: emailHtml("Trust Builder"),
  },
  {
    name: "Lead Reactivation",
    tone: "Win-back",
    subject: "Lead reactivation idea for {{company}}",
    description: "Past leads and inactive customers campaign.",
    cta: "Reactivate leads",
    body: "Hi {{name}},\n\nMany businesses have old enquiries, past customers, or cold leads that never received a strong follow-up sequence.\n\nFor {{company}}, a simple reactivation campaign could bring back warm conversations without needing a new ad budget.\n\nI can outline a short 3-message sequence you can test with past leads.\n\nBest,\n{{email}}",
    html: emailHtml("Lead Reactivation"),
  },
  {
    name: "Partnership Pitch",
    tone: "Collaborative",
    subject: "Partnership idea for {{company}}",
    description: "Project collaboration and partnership intro.",
    cta: "Explore partnership",
    body: "Hi {{name}},\n\nI am reaching out from {{website}} to explore a potential partnership with {{company}} in the {{category}} space.\n\nThere may be a useful way to combine stronger lead flow, clearer outreach, and better conversion follow-up into a project that supports your business goals.\n\nIf you are open to it, I can send a short partnership outline for review.\n\nBest,\n{{email}}",
    html: emailHtml("Partnership Pitch"),
  },
];
