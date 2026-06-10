import json
import os
import socket
import smtplib
from email.message import EmailMessage
from typing import Any

import requests
from bs4 import BeautifulSoup
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr

from lead_engine import search_ready_leads


app = FastAPI(title="LeadsPipeline Backend", version="0.1.0")

allowed_origins = [
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", "*").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins if allowed_origins != ["*"] else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class TailorRequest(BaseModel):
    body: str
    instruction: str
    subject: str


class AiIntelRequest(BaseModel):
    company: str | None = ""
    prompt: str | None = ""
    website: str | None = ""


class SendMailRequest(BaseModel):
    body: str
    html: str | None = None
    subject: str
    to: EmailStr


class AdminTestMailRequest(BaseModel):
    body: str = "LeadsPipeline backend admin test email."
    subject: str = "LeadsPipeline backend test"
    to: EmailStr


class ReadyLeadSearchRequest(BaseModel):
    category: str = "Healthcare"
    city: str = "All Cities"
    country: str = "United States"
    decisionMaker: bool = True
    directDial: bool = False
    emailVerified: bool = False
    excludedLeadIds: list[str] = []
    fetchContacts: bool = True
    includeWebResults: bool = True
    max: int = 50
    service: str = "SEO Services"
    stage: str = "Growth Stage"
    state: str = "All Regions"
    targetWebsite: str = ""


@app.get("/")
def root() -> dict[str, str]:
    return {"ok": "true", "service": "LeadsPipeline backend"}


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/mail/status")
def mail_status() -> dict[str, bool]:
    return {"configured": brevo_configured() or message_smtp_configured()}


@app.get("/admin/status")
def admin_status(x_admin_token: str | None = Header(default=None)) -> dict[str, Any]:
    require_admin(x_admin_token)
    return {
        "service": "LeadsPipeline backend",
        "status": "ok",
        "adminTokenConfigured": bool(os.getenv("ADMIN_TOKEN")),
        "allowedOrigins": allowed_origins,
        "groq": {
            "configured": bool(os.getenv("GROQ_API_KEY")),
            "model": os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile"),
        },
        "mail": {
            "configured": brevo_configured() or message_smtp_configured(),
            "provider": "brevo" if brevo_configured() else "smtp" if message_smtp_configured() else "none",
            "smtpHost": os.getenv("MESSAGE_SMTP_HOST", ""),
            "smtpPort": os.getenv("MESSAGE_SMTP_PORT", ""),
            "smtpSecure": os.getenv("MESSAGE_SMTP_SECURE", ""),
            "smtpFrom": os.getenv("MESSAGE_SMTP_FROM") or os.getenv("MESSAGE_SMTP_USER", ""),
        },
        "features": {
            "htmlEmail": True,
            "aiIntel": True,
            "messageTailor": True,
        },
    }


@app.post("/admin/test-mail")
def admin_test_mail(payload: AdminTestMailRequest, x_admin_token: str | None = Header(default=None)) -> dict[str, bool]:
    require_admin(x_admin_token)
    return mail_send(SendMailRequest(body=payload.body, subject=payload.subject, to=payload.to))


@app.post("/leads/ready-search")
def ready_lead_search(payload: ReadyLeadSearchRequest) -> dict[str, Any]:
    leads = search_ready_leads(payload.model_dump())
    max_count = max(1, min(payload.max, 500))
    warning = ""
    if not leads:
        warning = "No real leads found. Try turning Email Verified off, selecting a city, or changing the category."
    elif len(leads) < max_count:
        warning = f"{len(leads)} real leads found from free sources."

    return {
        "leads": leads,
        "mode": "backend_free_scraper",
        "warning": warning,
    }


@app.post("/mail/send")
def mail_send(payload: SendMailRequest) -> dict[str, bool]:
    if brevo_configured():
        return send_with_brevo(payload)

    if not message_smtp_configured():
        raise HTTPException(status_code=500, detail="Brevo API or Message SMTP is not configured.")

    message = EmailMessage()
    sender_email = os.getenv("MESSAGE_SMTP_FROM") or os.getenv("MESSAGE_SMTP_USER", "")
    message["From"] = f"LeadsPipeline <{sender_email}>"
    message["To"] = payload.to
    message["Subject"] = payload.subject
    message.set_content(payload.body)
    if payload.html:
        message.add_alternative(payload.html, subtype="html")

    host = os.getenv("MESSAGE_SMTP_HOST", "")
    port = int(os.getenv("MESSAGE_SMTP_PORT", "587"))
    secure = os.getenv("MESSAGE_SMTP_SECURE", "false").lower() == "true"
    user = os.getenv("MESSAGE_SMTP_USER", "")
    password = os.getenv("MESSAGE_SMTP_PASS", "")

    try:
        if secure:
            print(f"[mail] connecting SMTP_SSL {host}:{port}", flush=True)
            server = smtplib.SMTP_SSL(host, port, timeout=10)
        else:
            print(f"[mail] connecting SMTP STARTTLS {host}:{port}", flush=True)
            server = smtplib.SMTP(host, port, timeout=20)
            server.ehlo()
            server.starttls()
            server.ehlo()
        if not secure:
            print("[mail] STARTTLS enabled", flush=True)
        server.login(user, password)
        server.send_message(message)
    except (TimeoutError, socket.timeout) as exc:
        raise HTTPException(
            status_code=504,
            detail=f"SMTP connection timed out for {host}:{port}. Hugging Face network IP may be blocked by the SMTP provider.",
        ) from exc
    except smtplib.SMTPAuthenticationError as exc:
        raise HTTPException(status_code=401, detail="SMTP authentication failed. Check MESSAGE_SMTP_USER and MESSAGE_SMTP_PASS.") from exc
    except smtplib.SMTPConnectError as exc:
        raise HTTPException(status_code=502, detail=f"SMTP connection failed: {exc}") from exc
    except smtplib.SMTPException as exc:
        raise HTTPException(status_code=502, detail=f"SMTP send failed: {exc}") from exc
    except OSError as exc:
        raise HTTPException(status_code=502, detail=f"SMTP network error: {exc}") from exc
    finally:
        if "server" in locals():
            try:
                server.quit()
            except Exception:
                pass

    return {"ok": True}


def send_with_brevo(payload: SendMailRequest) -> dict[str, bool]:
    sender_email = os.getenv("BREVO_FROM_EMAIL") or os.getenv("MESSAGE_SMTP_FROM") or os.getenv("MESSAGE_SMTP_USER")
    sender_name = os.getenv("BREVO_FROM_NAME", "LeadsPipeline")

    if not sender_email:
        raise HTTPException(status_code=500, detail="BREVO_FROM_EMAIL is missing.")

    response = requests.post(
        "https://api.brevo.com/v3/smtp/email",
        headers={
            "accept": "application/json",
            "api-key": os.getenv("BREVO_API_KEY", ""),
            "content-type": "application/json",
        },
        json={
            "sender": {"email": sender_email, "name": sender_name},
            "to": [{"email": str(payload.to)}],
            "replyTo": {"email": sender_email, "name": sender_name},
            "subject": payload.subject,
            "textContent": payload.body,
            "htmlContent": payload.html
            or f"<pre style=\"font-family:Arial,sans-serif;white-space:pre-wrap\">{escape_html(payload.body)}</pre>",
        },
        timeout=20,
    )

    if response.status_code not in (200, 201, 202):
        raise HTTPException(status_code=response.status_code, detail=f"Brevo send failed: {response.text[:500]}")

    return {"ok": True}


@app.post("/messages/tailor")
def tailor_message(payload: TailorRequest) -> dict[str, str]:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        return {
            "subject": payload.subject,
            "body": local_tailor(payload.body, payload.instruction),
            "warning": "GROQ_API_KEY is not configured. Used local tailoring.",
        }

    result = groq_json(
        [
            {
                "role": "system",
                "content": "Return strict JSON only with subject and body. Rewrite B2B outreach emails. Keep placeholders when useful.",
            },
            {
                "role": "user",
                "content": json.dumps(
                    {
                        "current": {"body": payload.body, "subject": payload.subject},
                        "instruction": payload.instruction,
                        "requiredShape": {"subject": "string", "body": "string"},
                    }
                ),
            },
        ]
    )

    return {
        "subject": str(result.get("subject") or payload.subject),
        "body": str(result.get("body") or local_tailor(payload.body, payload.instruction)),
    }


@app.post("/ai/intel")
def ai_intel(payload: AiIntelRequest) -> dict[str, Any]:
    company = (payload.company or "the company").strip()
    prompt = (payload.prompt or "Find company intel and write a B2B outreach email.").strip()
    website = normalize_url(payload.website or "")
    website_text = scrape_website_text(website) if website else ""

    api_key = os.getenv("GROQ_API_KEY")
    fallback = local_intel(company, website, prompt, website_text)
    if not api_key:
        return {**fallback, "warning": "GROQ_API_KEY is not configured. Used local AI fallback."}

    result = groq_json(
        [
            {
                "role": "system",
                "content": (
                    "Return strict JSON only. Create concise B2B company intel and an outreach email. "
                    "Use only provided website text and user prompt. Do not invent private facts."
                ),
            },
            {
                "role": "user",
                "content": json.dumps(
                    {
                        "company": company,
                        "prompt": prompt,
                        "website": website,
                        "websiteText": website_text,
                        "requiredShape": {
                            "companyIntel": ["string"],
                            "outreachAngles": ["string"],
                            "subject": "string",
                            "body": "string",
                        },
                    }
                ),
            },
        ]
    )

    return {
        "companyIntel": normalize_list(result.get("companyIntel")) or fallback["companyIntel"],
        "outreachAngles": normalize_list(result.get("outreachAngles")) or fallback["outreachAngles"],
        "subject": str(result.get("subject") or fallback["subject"]),
        "body": str(result.get("body") or fallback["body"]),
    }


def message_smtp_configured() -> bool:
    return bool(
        os.getenv("MESSAGE_SMTP_HOST")
        and os.getenv("MESSAGE_SMTP_USER")
        and os.getenv("MESSAGE_SMTP_PASS")
    )


def brevo_configured() -> bool:
    return bool(os.getenv("BREVO_API_KEY"))


def require_admin(token: str | None) -> None:
    expected = os.getenv("ADMIN_TOKEN")
    if expected and token != expected:
        raise HTTPException(status_code=401, detail="Invalid admin token.")


def escape_html(value: str) -> str:
    return (
        value.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&#39;")
    )


def groq_json(messages: list[dict[str, str]]) -> dict[str, Any]:
    response = requests.post(
        "https://api.groq.com/openai/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {os.getenv('GROQ_API_KEY')}",
            "Content-Type": "application/json",
        },
        json={
            "model": os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile"),
            "temperature": 0.3,
            "response_format": {"type": "json_object"},
            "messages": messages,
        },
        timeout=45,
    )
    response.raise_for_status()
    content = response.json().get("choices", [{}])[0].get("message", {}).get("content", "{}")
    return json.loads(content)


def scrape_website_text(website: str) -> str:
    try:
        response = requests.get(
            website,
            headers={"User-Agent": "Mozilla/5.0 (compatible; LeadsPipeline/0.1)"},
            timeout=6,
        )
        response.raise_for_status()
        soup = BeautifulSoup(response.text, "html.parser")
        for tag in soup(["script", "style", "noscript"]):
            tag.decompose()
        return " ".join(soup.get_text(" ").split())[:4500]
    except Exception:
        return ""


def local_tailor(message: str, instruction: str) -> str:
    lower = instruction.lower()
    if "short" in lower:
        return ". ".join([part for part in message.split(".") if part][:2]).strip() + "."
    if "warm" in lower:
        return f"{message}\n\nHappy to send a quick, no-pressure breakdown if it helps."
    if "formal" in lower:
        return message.replace("Hi ", "Hello ").replace("I can help", "I would like to help")
    return f"{message}\n\nContext: {instruction}"


def local_intel(company: str, website: str, prompt: str, website_text: str) -> dict[str, Any]:
    source = "website content" if website_text else "your prompt"
    return {
        "companyIntel": [
            f"{company} context is based on {source}.",
            f"Website reviewed: {website}" if website else "No website was provided.",
            "Use a practical, low-pressure outreach angle instead of broad claims.",
        ],
        "outreachAngles": [
            "Offer a quick audit or growth idea.",
            "Reference their current website or category.",
            "Keep the first email short and easy to reply to.",
        ],
        "subject": f"Quick idea for {company}",
        "body": (
            "Hi {{name}},\n\n"
            f"I reviewed {website or '{{website}}'} and noticed a few places where {{{{company}}}} could make the customer journey clearer.\n\n"
            f"One practical angle is: {prompt}\n\n"
            "If useful, I can send a short breakdown with 2-3 improvements for {{company}}.\n\n"
            "Best,\n{{email}}"
        ),
    }


def normalize_list(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    return [str(item) for item in value if str(item).strip()][:6]


def normalize_url(value: str) -> str:
    value = value.strip()
    if not value:
        return ""
    if value.startswith("http://") or value.startswith("https://"):
        return value
    return f"https://{value}"
