from app.services import pdf_service


def test_render_contract_html_autoescapes_variables():
    html = pdf_service.render_contract_html(
        "prestation_service.html",
        {
            "contract": type("C", (), {"reference": "CTR-2026-TEST", "amount": 100, "duration_months": None})(),
            "client": type(
                "Cl", (), {"company_name": "<script>alert(1)</script>", "contact_name": "X", "address": ""}
            )(),
            "prestation": "Developpement",
        },
    )
    assert "<script>alert(1)</script>" not in html
    assert "&lt;script&gt;" in html
    assert "CTR-2026-TEST" in html
