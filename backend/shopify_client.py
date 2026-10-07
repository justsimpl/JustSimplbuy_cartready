"""
Send catalog products to a Shopify store.

Two options:
  * Live sync through the Shopify Admin GraphQL API. Needs these env vars:
      SHOPIFY_STORE_DOMAIN        e.g. my-store.myshopify.com
      and either
      SHOPIFY_CLIENT_ID +         an app from the Shopify Dev Dashboard with the
      SHOPIFY_CLIENT_SECRET       write_products scope, installed on the store
      or
      SHOPIFY_ADMIN_ACCESS_TOKEN  a token from an older admin-created custom app
      SHOPIFY_API_VERSION         optional, defaults to DEFAULT_API_VERSION
    Shopify downloads and hosts every image itself, so imported images keep
    working even if the original site removes them.
  * A CSV in Shopify's product import format (Shopify admin -> Products ->
    Import). Needs no setup at all.
"""
import csv
import io
import os
import re
import threading
import time
from typing import Any, Dict, List, Optional

import requests

DEFAULT_API_VERSION = "2026-07"


class ShopifyError(Exception):
    pass


def _config() -> Dict[str, str]:
    domain = os.environ.get("SHOPIFY_STORE_DOMAIN", "").strip()
    domain = re.sub(r"^https?://", "", domain).rstrip("/")
    return {
        "domain": domain,
        "token": os.environ.get("SHOPIFY_ADMIN_ACCESS_TOKEN", "").strip(),
        "client_id": os.environ.get("SHOPIFY_CLIENT_ID", "").strip(),
        "client_secret": os.environ.get("SHOPIFY_CLIENT_SECRET", "").strip(),
        "version": os.environ.get("SHOPIFY_API_VERSION", DEFAULT_API_VERSION).strip(),
    }


def is_configured() -> bool:
    config = _config()
    return bool(config["domain"] and (config["token"] or (config["client_id"] and config["client_secret"])))


_token_cache: Dict[str, Any] = {"token": None, "expires_at": 0.0}
_token_lock = threading.Lock()


def _access_token(config: Dict[str, str]) -> str:
    """Static token if given, otherwise a client-credentials token (valid 24h, cached)."""
    if config["token"]:
        return config["token"]
    with _token_lock:
        if _token_cache["token"] and time.time() < _token_cache["expires_at"]:
            return _token_cache["token"]
        resp = requests.post(
            f"https://{config['domain']}/admin/oauth/access_token",
            data={
                "grant_type": "client_credentials",
                "client_id": config["client_id"],
                "client_secret": config["client_secret"],
            },
            timeout=30,
        )
        if resp.status_code >= 400:
            raise ShopifyError(
                f"Could not get a Shopify access token (HTTP {resp.status_code}); check SHOPIFY_CLIENT_ID / "
                "SHOPIFY_CLIENT_SECRET and that the app is installed on this store"
            )
        body = resp.json()
        _token_cache["token"] = body["access_token"]
        _token_cache["expires_at"] = time.time() + int(body.get("expires_in", 86399)) - 300
        return _token_cache["token"]


def store_domain() -> str:
    return _config()["domain"]


def _graphql(query: str, variables: Dict[str, Any]) -> Dict[str, Any]:
    config = _config()
    if not is_configured():
        raise ShopifyError(
            "Shopify is not configured (set SHOPIFY_STORE_DOMAIN plus SHOPIFY_CLIENT_ID and "
            "SHOPIFY_CLIENT_SECRET, or SHOPIFY_ADMIN_ACCESS_TOKEN)"
        )
    resp = requests.post(
        f"https://{config['domain']}/admin/api/{config['version']}/graphql.json",
        json={"query": query, "variables": variables},
        headers={"X-Shopify-Access-Token": _access_token(config), "Content-Type": "application/json"},
        timeout=30,
    )
    if resp.status_code in (401, 403):
        _token_cache["token"] = None
        raise ShopifyError("Shopify rejected the access token (check the app credentials and write_products scope)")
    if resp.status_code >= 400:
        raise ShopifyError(f"Shopify API error HTTP {resp.status_code}")
    body = resp.json()
    if body.get("errors"):
        raise ShopifyError("; ".join(e.get("message", str(e)) for e in body["errors"]))
    return body["data"]


def _user_errors(payload: Dict[str, Any]) -> None:
    errors = payload.get("userErrors") or []
    if errors:
        raise ShopifyError("; ".join(e.get("message", "") for e in errors))


PRODUCT_CREATE = """
mutation productCreate($product: ProductCreateInput!, $media: [CreateMediaInput!]) {
  productCreate(product: $product, media: $media) {
    product { id handle variants(first: 1) { nodes { id } } }
    userErrors { field message }
  }
}
"""

VARIANT_UPDATE = """
mutation productVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
  productVariantsBulkUpdate(productId: $productId, variants: $variants) {
    userErrors { field message }
  }
}
"""


def _description_html(product: Dict[str, Any]) -> str:
    if product.get("description_html"):
        return product["description_html"]
    from html import escape
    paragraphs = [f"<p>{escape(p)}</p>" for p in (product.get("description") or "").split("\n") if p.strip()]
    features = product.get("features") or []
    if features:
        paragraphs.append("<ul>" + "".join(f"<li>{escape(f)}</li>" for f in features) + "</ul>")
    return "".join(paragraphs)


def _images(product: Dict[str, Any]) -> List[str]:
    images = list(product.get("images") or [])
    if product.get("image_url") and product["image_url"] not in images:
        images.insert(0, product["image_url"])
    return images


def create_product(product: Dict[str, Any], status: str = "DRAFT") -> Dict[str, str]:
    """Create the product in Shopify. Returns {"id", "handle", "admin_url"}."""
    tags = [t for t in [product.get("category"), product.get("subcategory")] if t]
    data = _graphql(PRODUCT_CREATE, {
        "product": {
            "title": product["title"],
            "descriptionHtml": _description_html(product),
            "vendor": product.get("brand") or "",
            "productType": product.get("subcategory") or product.get("category") or "",
            "tags": tags,
            "status": status,
        },
        "media": [
            {"originalSource": src, "mediaContentType": "IMAGE", "alt": product["title"]}
            for src in _images(product)
        ],
    })["productCreate"]
    _user_errors(data)

    created = data["product"]
    variant_nodes = created["variants"]["nodes"]
    if variant_nodes:
        variant: Dict[str, Any] = {"id": variant_nodes[0]["id"], "price": str(product.get("price") or 0)}
        original = product.get("original_price")
        if original and original > (product.get("price") or 0):
            variant["compareAtPrice"] = str(original)
        _user_errors(_graphql(VARIANT_UPDATE, {"productId": created["id"], "variants": [variant]})
                     ["productVariantsBulkUpdate"])

    numeric_id = created["id"].rsplit("/", 1)[-1]
    return {
        "id": created["id"],
        "handle": created["handle"],
        "admin_url": f"https://{store_domain()}/admin/products/{numeric_id}",
    }


# ============ CSV EXPORT ============

CSV_COLUMNS = [
    "Handle", "Title", "Body (HTML)", "Vendor", "Type", "Tags", "Published",
    "Option1 Name", "Option1 Value", "Variant Price", "Variant Compare At Price",
    "Variant Requires Shipping", "Variant Taxable", "Variant Inventory Policy",
    "Variant Fulfillment Service", "Image Src", "Image Position", "Image Alt Text", "Status",
]


def _handle(title: str, fallback: str) -> str:
    handle = re.sub(r"[^a-z0-9]+", "-", (title or "").lower()).strip("-")[:200]
    return handle or fallback


def products_to_csv(products: List[Dict[str, Any]], status: Optional[str] = "draft") -> str:
    """Build a CSV that Shopify's product importer accepts."""
    out = io.StringIO()
    writer = csv.DictWriter(out, fieldnames=CSV_COLUMNS)
    writer.writeheader()
    used_handles: Dict[str, int] = {}

    for product in products:
        handle = _handle(product.get("title", ""), product.get("id", "product"))
        if handle in used_handles:
            used_handles[handle] += 1
            handle = f"{handle}-{used_handles[handle]}"
        else:
            used_handles[handle] = 1

        images = _images(product)
        price = product.get("price") or 0
        original = product.get("original_price")
        writer.writerow({
            "Handle": handle,
            "Title": product.get("title", ""),
            "Body (HTML)": _description_html(product),
            "Vendor": product.get("brand", ""),
            "Type": product.get("subcategory") or product.get("category", ""),
            "Tags": ", ".join(t for t in [product.get("category"), product.get("subcategory")] if t),
            "Published": "TRUE" if status == "active" else "FALSE",
            "Option1 Name": "Title",
            "Option1 Value": "Default Title",
            "Variant Price": f"{price:.2f}",
            "Variant Compare At Price": f"{original:.2f}" if original and original > price else "",
            "Variant Requires Shipping": "TRUE",
            "Variant Taxable": "TRUE",
            "Variant Inventory Policy": "continue" if product.get("in_stock", True) else "deny",
            "Variant Fulfillment Service": "manual",
            "Image Src": images[0] if images else "",
            "Image Position": "1" if images else "",
            "Image Alt Text": product.get("title", "") if images else "",
            "Status": status or "draft",
        })
        # Extra images go on their own rows with only the handle filled in
        for position, src in enumerate(images[1:], start=2):
            writer.writerow({"Handle": handle, "Image Src": src, "Image Position": str(position),
                             "Image Alt Text": product.get("title", "")})
    return out.getvalue()
