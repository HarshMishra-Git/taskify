import logging
import httpx
from pathlib import Path
from app.core.config import settings

logger = logging.getLogger(__name__)

ZEPTO_API_URL = "https://api.zeptomail.in/v1.1/email"
TEMPLATE_DIR  = Path(__file__).parent.parent / "templates" / "email"


def _load_template(filename: str, **kwargs) -> str:
    html = (TEMPLATE_DIR / filename).read_text()
    for key, val in kwargs.items():
        html = html.replace("{{" + key + "}}", str(val))
    return html


def _send(to_email: str, to_name: str, subject: str, html: str) -> None:
    if not settings.ZEPTO_API_KEY:
        # Dev mode — log so it appears in docker logs
        logger.warning("[EMAIL DEV] To: %s | Subject: %s", to_email, subject)
        return

    payload = {
        "from": {
            "address": settings.ZEPTO_FROM_EMAIL,
            "name":    settings.ZEPTO_FROM_NAME,
        },
        "to": [{"email_address": {"address": to_email, "name": to_name}}],
        "subject": subject,
        "htmlbody": html,
    }
    resp = httpx.post(
        ZEPTO_API_URL,
        json=payload,
        headers={
            "Authorization": f"Zoho-enczapikey {settings.ZEPTO_API_KEY}",
            "Content-Type":  "application/json",
        },
        timeout=10,
    )
    resp.raise_for_status()


def send_verification_email(email: str, name: str, token: str) -> None:
    verify_url = f"{settings.FRONTEND_URL}/verify?token={token}"
    logger.warning("[EMAIL] VERIFY URL for %s: %s", email, verify_url)
    html = _load_template("verification.html", name=name, verify_url=verify_url)
    _send(email, name, "Verify your email — Taskify", html)


def send_project_invite_email(
    email: str,
    project_name: str,
    inviter_name: str,
    token: str,
    role: str,
) -> None:
    invite_url = f"{settings.FRONTEND_URL}/invite?token={token}"
    logger.warning("[EMAIL] INVITE URL for %s: %s", email, invite_url)
    html = _load_template(
        "project_invite.html",
        inviter_name=inviter_name,
        project_name=project_name,
        role=role,
        invite_url=invite_url,
    )
    _send(email, email, f"{inviter_name} added you to {project_name}", html)
