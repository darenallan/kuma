import re
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape

TEMPLATES_DIR = Path(__file__).resolve().parent.parent / "templates"

# Mise en page commune à tous les modèles composés dans l'interface.
CUSTOM_LAYOUT = "custom_contract.html"

# autoescape=True obligatoire : les variables de contrat sont fournies par l'utilisateur
# et injectees dans du HTML converti en PDF (anti-injection HTML/XSS).
_jinja_env = Environment(
    loader=FileSystemLoader(str(TEMPLATES_DIR)),
    autoescape=select_autoescape(["html", "xml"]),
)

_PLACEHOLDER_RE = re.compile(r"\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}")


def substitute_variables(text: str, values: dict) -> str:
    """Remplace les {{ variables }} d'un texte utilisateur par leur valeur.

    Volontairement fait par expression régulière et NON en compilant le texte
    comme template Jinja2 : compiler du contenu saisi par l'utilisateur ouvrirait
    une injection de template côté serveur (SSTI), qui permet d'exécuter du code
    arbitraire via des expressions du type {{ ''.__class__.__mro__ }}.

    Une variable inconnue est laissée visible entre crochets plutôt que vidée :
    un trou silencieux dans un contrat signé serait bien pire.
    """

    def replace(match: re.Match) -> str:
        key = match.group(1)
        value = values.get(key)
        if value is None or value == "":
            return f"[{key}]"
        return str(value)

    return _PLACEHOLDER_RE.sub(replace, text)


def _to_paragraphs(text: str, values: dict) -> list[str]:
    """Découpe un texte en paragraphes après substitution.

    Le découpage est fait ici (et non dans le template) pour que chaque fragment
    reste une simple chaîne échappée par Jinja au rendu.
    """
    substituted = substitute_variables(text, values)
    return [line.strip() for line in substituted.splitlines() if line.strip()]


def render_contract_html(template_filename: str, context: dict) -> str:
    template = _jinja_env.get_template(template_filename)
    return template.render(**context)


def render_custom_contract_html(body: dict, context: dict, values: dict) -> str:
    """Rend un modèle composé par l'utilisateur (intro + articles)."""
    articles = [
        {
            "title": substitute_variables(article.get("title", ""), values),
            "paragraphs": _to_paragraphs(article.get("content", ""), values),
        }
        for article in (body or {}).get("articles", [])
    ]

    intro = (body or {}).get("intro")
    return render_contract_html(
        CUSTOM_LAYOUT,
        {
            **context,
            "articles": articles,
            "intro_paragraphs": _to_paragraphs(intro, values) if intro else [],
        },
    )


def html_to_pdf(html_content: str) -> bytes:
    # Import differe : weasyprint charge des libs natives (Pango/Cairo/GObject) absentes
    # de certains environnements de dev (ex. Windows sans GTK) ; le reste de l'app doit
    # rester utilisable meme si la generation PDF n'est pas disponible localement.
    from weasyprint import HTML

    return HTML(string=html_content, base_url=str(TEMPLATES_DIR)).write_pdf()


def render_contract_pdf(template_filename: str, context: dict) -> bytes:
    return html_to_pdf(render_contract_html(template_filename, context))


def render_custom_contract_pdf(body: dict, context: dict, values: dict) -> bytes:
    return html_to_pdf(render_custom_contract_html(body, context, values))
