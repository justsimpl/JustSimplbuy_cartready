"""Offline tests for the product importer and Shopify CSV export."""
import csv
import io
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

import product_importer  # noqa: E402
import shopify_client  # noqa: E402

JSONLD_PAGE = """
<html><head>
<title>Ignored title</title>
<meta property="og:image" content="https://cdn.example.com/og.jpg">
<script type="application/ld+json">
{"@context":"https://schema.org","@graph":[
  {"@type":"BreadcrumbList","itemListElement":[]},
  {"@type":"Product","name":"Trail Runner 2 &amp; More",
   "description":"Light shoe.",
   "brand":{"@type":"Brand","name":"Acme"},
   "image":["/img/a.jpg",{"url":"https://cdn.example.com/b.jpg"}],
   "offers":{"@type":"AggregateOffer","lowPrice":"89.99","priceCurrency":"USD",
             "availability":"https://schema.org/OutOfStock"}}
]}
</script></head><body></body></html>
"""

META_ONLY_PAGE = """
<html><head>
<meta property="og:title" content="Desk Lamp">
<meta property="og:description" content="A lamp.">
<meta property="og:image" content="https://cdn.example.com/lamp.jpg?width=200">
<meta property="og:image" content="https://cdn.example.com/lamp.jpg?width=800">
<meta property="product:price:amount" content="1,299.00">
</head></html>
"""

SHOPIFY_JSON = {
    "product": {
        "title": "Canvas Tote",
        "body_html": "<p>Sturdy bag.</p><ul><li>Organic cotton</li><li>Inner pocket</li></ul>",
        "vendor": "Bagco",
        "product_type": "Bags",
        "tags": "summer, canvas",
        "variants": [{"price": "24.00", "compare_at_price": "30.00", "available": True}],
        "images": [{"src": "https://cdn.shopify.com/1.jpg"}, {"src": "https://cdn.shopify.com/2.jpg"}],
    }
}


def test_jsonld_product():
    product = product_importer.parse_html_product(JSONLD_PAGE, "https://shop.example.com/p/1")
    assert product["source"] == "json-ld"
    assert product["title"] == "Trail Runner 2 & More"
    assert product["brand"] == "Acme"
    assert product["price"] == 89.99
    assert product["currency"] == "USD"
    assert product["in_stock"] is False
    assert product["images"] == [
        "https://shop.example.com/img/a.jpg",
        "https://cdn.example.com/b.jpg",
        "https://cdn.example.com/og.jpg",
    ]


def test_meta_fallback_dedupes_image_sizes():
    product = product_importer.parse_html_product(META_ONLY_PAGE, "https://x.example.com/lamp")
    assert product["source"] == "meta"
    assert product["title"] == "Desk Lamp"
    assert product["price"] == 1299.0
    assert product["images"] == ["https://cdn.example.com/lamp.jpg?width=200"]


def test_shopify_product_json():
    product = product_importer.parse_shopify_product(SHOPIFY_JSON, "https://store.example.com/products/tote")
    assert product["title"] == "Canvas Tote"
    assert product["price"] == 24.0
    assert product["original_price"] == 30.0
    assert product["brand"] == "Bagco"
    assert product["tags"] == ["summer", "canvas"]
    assert product["features"] == ["Organic cotton", "Inner pocket"]
    assert len(product["images"]) == 2
    assert "Sturdy bag." in product["description"]


def test_shopify_json_url():
    assert product_importer._shopify_json_url(
        "https://store.example.com/collections/all/products/tote?variant=1"
    ) == "https://store.example.com/collections/all/products/tote.json"
    assert product_importer._shopify_json_url("https://example.com/item/123") is None


@pytest.mark.parametrize("url", [
    "http://127.0.0.1/admin",
    "http://localhost:8080/",
    "http://169.254.169.254/latest/meta-data",
    "file:///etc/passwd",
])
def test_private_addresses_rejected(url):
    with pytest.raises(product_importer.ProductImportError):
        product_importer._check_public_host(url)


def test_shopify_csv_has_extra_image_rows():
    products = [{
        "id": "prod-1", "title": "Canvas Tote", "description": "Sturdy bag.",
        "features": ["Organic cotton"], "brand": "Bagco", "category": "fashion",
        "price": 24.0, "original_price": 30.0, "in_stock": True,
        "image_url": "https://cdn.shopify.com/1.jpg",
        "images": ["https://cdn.shopify.com/1.jpg", "https://cdn.shopify.com/2.jpg"],
    }, {
        "id": "prod-2", "title": "Canvas Tote", "price": 10.0, "images": [],
    }]
    rows = list(csv.DictReader(io.StringIO(shopify_client.products_to_csv(products))))
    assert [r["Handle"] for r in rows] == ["canvas-tote", "canvas-tote", "canvas-tote-2"]
    assert rows[0]["Variant Price"] == "24.00"
    assert rows[0]["Variant Compare At Price"] == "30.00"
    assert "<li>Organic cotton</li>" in rows[0]["Body (HTML)"]
    assert rows[1]["Title"] == "" and rows[1]["Image Position"] == "2"
    assert rows[2]["Image Src"] == ""


SHOPIFY_VARIANT_JSON = {
    "product": {
        "title": "Runner",
        "options": [{"name": "Size", "values": ["8", "9", "10"]}, {"name": "Color", "values": ["Black"]}],
        "variants": [
            {"option1": "8", "option2": "Black", "price": "100.00", "sku": "R8", "available": None},
            {"option1": "9", "option2": "Black", "price": "110.00", "compare_at_price": "120.00", "sku": "R9"},
        ],
        "images": [],
    }
}


def test_shopify_variants_parsed():
    product = product_importer.parse_shopify_product(SHOPIFY_VARIANT_JSON, "https://s.example.com/products/r")
    assert product["in_stock"] is True  # "available": null is not sold out
    assert [o["name"] for o in product["options"]] == ["Size", "Color"]
    assert product["variants"][1] == {
        "options": ["9", "Black"], "price": 110.0, "original_price": 120.0, "sku": "R9", "available": True,
    }


def test_default_title_product_has_no_variants():
    data = {"product": {"title": "Mug", "options": [{"name": "Title", "values": ["Default Title"]}],
                        "variants": [{"option1": "Default Title", "price": "9.00"}]}}
    product = product_importer.parse_shopify_product(data, "https://s.example.com/products/mug")
    assert product["options"] == [] and product["variants"] == []


def test_variant_rows_drop_unused_option_values():
    options, variants = shopify_client.variant_rows({
        "options": [{"name": "Size", "values": ["8", "9", "10"]}],
        "variants": [{"options": ["9"], "price": 10.0}, {"options": ["8"], "price": 10.0}],
    })
    assert options == [{"name": "Size", "values": ["8", "9"]}]
    assert len(variants) == 2


def test_sync_product_sends_variants_and_cost(monkeypatch):
    sent = {}

    def fake_graphql(query, variables):
        sent.update(variables)
        return {"productSet": {"product": {"id": "gid://shopify/Product/5", "handle": "runner"}, "userErrors": []}}

    monkeypatch.setattr(shopify_client, "_graphql", fake_graphql)
    monkeypatch.setenv("SHOPIFY_STORE_DOMAIN", "demo.myshopify.com")
    result = shopify_client.sync_product({
        "title": "Runner", "price": 130.0, "images": ["https://cdn/1.jpg"],
        "options": [{"name": "Size", "values": ["8", "9"]}],
        "variants": [
            {"options": ["8"], "price": 130.0, "cost": 100.0, "sku": "R8"},
            {"options": ["9"], "price": 143.0, "original_price": 150.0, "cost": 110.0, "sku": "R9"},
        ],
    }, "ACTIVE")
    assert result["admin_url"] == "https://demo.myshopify.com/admin/products/5"
    product_input = sent["input"]
    assert sent["identifier"] is None
    assert product_input["status"] == "ACTIVE"
    assert product_input["productOptions"] == [
        {"name": "Size", "position": 1, "values": [{"name": "8"}, {"name": "9"}]}
    ]
    assert product_input["variants"][1] == {
        "optionValues": [{"optionName": "Size", "name": "9"}],
        "price": "143.00",
        "compareAtPrice": "150.00",
        "inventoryItem": {"tracked": False, "sku": "R9", "cost": "110.00"},
    }
    assert product_input["files"][0]["originalSource"] == "https://cdn/1.jpg"

    # Re-sync updates in place and leaves images alone
    shopify_client.sync_product({"title": "Runner", "price": 5.0}, None, "gid://shopify/Product/5")
    assert sent["identifier"] == {"id": "gid://shopify/Product/5"}
    assert "files" not in sent["input"] and "status" not in sent["input"]
    assert sent["input"]["variants"][0]["optionValues"] == [{"optionName": "Title", "name": "Default Title"}]


def test_csv_variant_rows():
    rows = list(csv.DictReader(io.StringIO(shopify_client.products_to_csv([{
        "id": "p1", "title": "Runner", "price": 130.0,
        "images": ["https://cdn/1.jpg", "https://cdn/2.jpg", "https://cdn/3.jpg"],
        "options": [{"name": "Size", "values": ["8", "9"]}],
        "variants": [{"options": ["8"], "price": 130.0, "cost": 100.0}, {"options": ["9"], "price": 140.0}],
    }]))))
    assert len(rows) == 3
    assert (rows[0]["Option1 Name"], rows[0]["Option1 Value"], rows[0]["Cost per item"]) == ("Size", "8", "100.00")
    assert (rows[1]["Option1 Name"], rows[1]["Option1 Value"], rows[1]["Variant Price"]) == ("", "9", "140.00")
    assert rows[1]["Title"] == "" and rows[1]["Image Src"] == "https://cdn/2.jpg"
    assert rows[2]["Variant Price"] == "" and rows[2]["Image Position"] == "3"
