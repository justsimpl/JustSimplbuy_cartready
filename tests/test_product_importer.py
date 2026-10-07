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
