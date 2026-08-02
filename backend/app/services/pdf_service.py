from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape

TEMPLATES_DIR = Path(__file__).resolve().parent.parent / "templates"

# autoescape=True obligatoire : les variables de contrat sont fournies par l'utilisateur
# et injectees dans du HTML converti en PDF (anti-injection HTML/XSS).
_jinja_env = Environment(
    loader=FileSystemLoader(str(TEMPLATES_DIR)),
    autoescape=select_autoescape(["html", "xml"]),
)


def render_contract_html(template_filename: str, context: dict) -> str:
    template = _jinja_env.get_template(template_filename)
    return template.render(**context)


def render_contract_pdf(template_filename: str, context: dict) -> bytes:
    # Import differe : weasyprint charge des libs natives (Pango/Cairo/GObject) absentes
    # de certains environnements de dev (ex. Windows sans GTK) ; le reste de l'app doit
    # rester utilisable meme si la generation PDF n'est pas disponible localement.
    from weasyprint import HTML

    html_content = render_contract_html(template_filename, context)
    return HTML(string=html_content, base_url=str(TEMPLATES_DIR)).write_pdf()
