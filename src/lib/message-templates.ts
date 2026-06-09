export type MessageTemplate = {
  body: string;
  cta: string;
  description: string;
  name: string;
  subject: string;
  tone: string;
};

export const messageTemplates: MessageTemplate[] = [
  {
    name: "Welcome Growth",
    tone: "Warm intro",
    subject: "Welcome idea for {{company}}",
    description: "Friendly first-touch email for new prospects.",
    cta: "Start the conversation",
    body: "Hi {{name}},\n\nI came across {{company}} while reviewing {{category}} businesses and wanted to share a simple growth idea.\n\nYour web presence already gives people a reason to trust you. The next opportunity is turning more of those visitors into qualified enquiries with a cleaner offer, better follow-up, and a stronger booking path.\n\nIf useful, I can send a short breakdown for {{company}} with 2-3 practical improvements.\n\nBest,\n{{email}}",
  },
  {
    name: "Website Audit",
    tone: "Useful audit",
    subject: "Small website wins for {{company}}",
    description: "Conversion-focused website improvement pitch.",
    cta: "Send audit notes",
    body: "Hi {{name}},\n\nI reviewed {{website}} and noticed a few areas where {{company}} could make the customer journey clearer.\n\nThe biggest wins usually come from:\n- Clearer above-the-fold offer\n- Faster trust signals\n- Simpler enquiry path\n- Better follow-up after form submission\n\nI can send a concise audit with screenshots and fixes if you want to take a look.\n\nRegards,\n{{email}}",
  },
  {
    name: "Local SEO",
    tone: "Local growth",
    subject: "{{company}} local SEO opportunity",
    description: "Local search ranking and visibility outreach.",
    cta: "View SEO gaps",
    body: "Hi {{name}},\n\nI found {{company}} while researching {{category}} businesses and noticed there may be room to capture more high-intent local searches.\n\nA focused local SEO plan could help with:\n- Better service-page targeting\n- More map and organic visibility\n- Stronger location signals\n- Higher-quality inbound enquiries\n\nI can share a quick opportunity snapshot for {{company}} if helpful.\n\nThanks,\n{{email}}",
  },
  {
    name: "Paid Ads Lift",
    tone: "Performance",
    subject: "Ad growth idea for {{company}}",
    description: "Ad audit email for lead-gen businesses.",
    cta: "Check ad waste",
    body: "Hi {{name}},\n\nI help businesses like {{company}} improve ad performance by tightening targeting, landing pages, and follow-up.\n\nMost campaigns lose money in three places: weak intent matching, generic landing pages, and slow response after the lead arrives.\n\nIf you are running ads, I can send a quick review showing where budget might be leaking.\n\nBest,\n{{email}}",
  },
  {
    name: "Ecommerce Revenue",
    tone: "Revenue",
    subject: "More qualified buyers for {{company}}",
    description: "Store conversion and retention template.",
    cta: "Review store funnel",
    body: "Hi {{name}},\n\nI came across {{company}} and wanted to share a practical ecommerce growth angle.\n\nSmall improvements in product pages, abandoned cart follow-up, and offer clarity can often create more revenue without increasing ad spend.\n\nI can send a short funnel review with the highest-impact fixes for {{company}}.\n\nRegards,\n{{email}}",
  },
  {
    name: "Booking Boost",
    tone: "Direct",
    subject: "Booking flow idea for {{company}}",
    description: "Appointment-setting and lead follow-up pitch.",
    cta: "Improve bookings",
    body: "Hi {{name}},\n\nI noticed {{company}} could potentially improve how new enquiries turn into booked appointments.\n\nThe highest-leverage fixes are usually simple: faster response, clearer next steps, and automated reminders that reduce drop-off.\n\nI can share a short booking-flow improvement plan if you want it.\n\nBest,\n{{email}}",
  },
  {
    name: "B2B Pipeline",
    tone: "Professional",
    subject: "Lead pipeline idea for {{company}}",
    description: "Outbound pipeline and verified leads template.",
    cta: "Build pipeline",
    body: "Hi {{name}},\n\nI help B2B teams build cleaner lead pipelines using verified contacts, targeted messaging, and consistent follow-up.\n\n{{company}} looks like a business where a focused outbound system could create more qualified conversations without adding manual work.\n\nI can send a sample campaign structure if you would like to see it.\n\nThanks,\n{{email}}",
  },
  {
    name: "Trust Builder",
    tone: "Credibility",
    subject: "Trust signal idea for {{company}}",
    description: "Reputation and conversion trust template.",
    cta: "Strengthen trust",
    body: "Hi {{name}},\n\nI noticed {{company}} has an opportunity to make trust signals more visible before visitors decide to enquire.\n\nA stronger mix of reviews, outcomes, proof points, and clear service positioning can help more people take the next step.\n\nI can send a quick trust-signal checklist for {{company}} if useful.\n\nRegards,\n{{email}}",
  },
  {
    name: "Lead Reactivation",
    tone: "Win-back",
    subject: "Win-back campaign idea for {{company}}",
    description: "Past leads and inactive customers campaign.",
    cta: "Reactivate leads",
    body: "Hi {{name}},\n\nMany businesses have old enquiries, past customers, or cold leads that never received a strong follow-up sequence.\n\nFor {{company}}, a simple reactivation campaign could bring back warm conversations without needing a new ad budget.\n\nI can outline a short 3-email sequence if you want to test it.\n\nBest,\n{{email}}",
  },
  {
    name: "Partnership Pitch",
    tone: "Collaborative",
    subject: "Potential project with {{company}}",
    description: "Project collaboration and partnership intro.",
    cta: "Explore project",
    body: "Hi {{name}},\n\nI am reaching out from {{website}} to discuss a potential project collaboration that could drive meaningful growth for {{company}} in the {{category}} space.\n\nI would like to explore how our solutions can support your business goals with better lead flow, clearer outreach, and stronger conversion follow-up.\n\nIf you are interested, we can schedule a short call at a time that works for you.\n\nYou can also reply to this email at {{email}} for more information.",
  },
];
