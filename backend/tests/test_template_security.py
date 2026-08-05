"""Sécurité du rendu des modèles composés par l'utilisateur.

Le contenu des articles est saisi librement : il ne doit jamais pouvoir
s'exécuter côté serveur (SSTI) ni injecter de HTML dans le PDF (XSS).
"""

import pytest

from app.services import pdf_service


def _render(content: str, values: dict | None = None) -> str:
    body = {"intro": None, "articles": [{"title": "Test", "content": content}]}
    context = {
        "title": "Contrat",
        "reference": "CTR-TEST",
        "date": "01/01/2026",
        "montant": "1 000 FCFA",
        "duree": None,
        "prestataire_nom": "Prestataire",
        "client": type("C", (), {
            "company_name": "Client SARL", "contact_name": "Contact",
            "address": "", "email": "c@example.com",
        })(),
    }
    return pdf_service.render_custom_contract_html(body, context, values or {})


# ═══ Injection de template côté serveur (SSTI) ═══

@pytest.mark.parametrize(
    "payload",
    [
        "{{ 7 * 7 }}",
        "{{ ''.__class__.__mro__[1].__subclasses__() }}",
        "{{ config }}",
        "{{ self.__init__.__globals__ }}",
        "{% for x in range(10) %}{{ x }}{% endfor %}",
        "{{ cycler.__init__.__globals__.os.popen('id').read() }}",
        "{{ request.application.__globals__ }}",
    ],
)
def test_user_content_is_never_evaluated_as_template(payload):
    """Le contenu utilisateur n'est pas compilé par Jinja2 : rien ne s'exécute.

    La charge utile ressort telle quelle, échappée, comme du texte de contrat
    ordinaire — c'est le comportement attendu.
    """
    html = _render(payload)

    # Traces d'une évaluation réelle : aucune ne doit apparaître.
    assert "49" not in html                 # 7 * 7 évalué
    assert "&lt;class " not in html         # repr d'objets Python
    assert "0123456789" not in html         # boucle for déroulée
    assert "uid=" not in html               # sortie de commande shell
    assert "SECRET_KEY" not in html         # fuite de configuration

    # Deux issues sûres possibles : la syntaxe reste littérale (expression complexe
    # non reconnue), ou elle est traitée comme une variable inconnue → « [nom] ».
    assert "{{" in html or "{%" in html or "[config]" in html


def test_unknown_placeholder_stays_visible():
    """Une variable inconnue reste lisible : pas de trou silencieux dans un contrat."""
    html = _render("Montant dû : {{ variable_inexistante }}")
    assert "[variable_inexistante]" in html


def test_declared_placeholder_is_substituted():
    html = _render("Nombre de vidéos : {{ nb_videos }}", {"nb_videos": 12})
    assert "Nombre de vidéos : 12" in html


# ═══ Injection HTML / XSS dans le PDF ═══

def test_html_in_article_content_is_escaped():
    html = _render("<script>alert(1)</script>")
    assert "<script>alert(1)</script>" not in html
    assert "&lt;script&gt;" in html


def test_html_in_article_title_is_escaped():
    body = {"intro": None, "articles": [{"title": "<img src=x onerror=alert(1)>", "content": "ok"}]}
    context = {
        "title": "Contrat", "reference": "R", "date": "01/01/2026",
        "montant": "0 FCFA", "duree": None, "prestataire_nom": "P",
        "client": type("C", (), {"company_name": "C", "contact_name": "C", "address": "", "email": "e@example.com"})(),
    }
    html = pdf_service.render_custom_contract_html(body, context, {})
    assert "<img src=x" not in html
    assert "&lt;img" in html


def test_html_injected_through_a_variable_value_is_escaped():
    """Une valeur saisie à la création du contrat ne doit pas non plus injecter de HTML."""
    html = _render("Client : {{ nom }}", {"nom": "<b>gras</b><script>x</script>"})
    assert "<script>" not in html
    assert "&lt;b&gt;gras&lt;/b&gt;" in html


# ═══ Substitution ═══

def test_substitute_handles_spacing_variants():
    assert pdf_service.substitute_variables("{{a}} {{ a }} {{  a  }}", {"a": "X"}) == "X X X"


def test_empty_value_falls_back_to_placeholder_marker():
    assert pdf_service.substitute_variables("{{ vide }}", {"vide": ""}) == "[vide]"


def test_paragraphs_are_split_on_line_breaks():
    html = _render("Premier paragraphe.\nSecond paragraphe.")
    assert "<p>Premier paragraphe.</p>" in html
    assert "<p>Second paragraphe.</p>" in html
