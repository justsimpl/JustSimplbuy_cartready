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


PRODUCT_SET = """
mutation productSet($identifier: ProductSetIdentifiers, $input: ProductSetInput!) {
  productSet(identifier: $identifier, input: $input, synchronous: true) {
    product { id handle }
    userErrors { field message }
  }
}
"""

DEFAULT_OPTION = {"name": "Title", "values": ["Default Title"]}


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


def _money(value: Optional[float]) -> Optional[str]:
    return f"{value:.2f}" if value is not None else None


def variant_rows(product: Dict[str, Any]):
    """(options, variants) ready for Shopify; a single "Default Title" variant when there are none."""
    options = [o for o in product.get("options") or [] if o.get("name")][:3]
    variants = [v for v in product.get("variants") or [] if len(v.get("options") or []) == len(options)]
    if not options or not variants:
        return [DEFAULT_OPTION], [{
            "options": ["Default Title"],
            "price": product.get("price") or 0,
            "original_price": product.get("original_price"),
            "cost": product.get("cost_price"),
            "sku": product.get("sku") or "",
        }]
    # Only keep option values a variant actually uses, in their original order
    used = [{v["options"][i] for v in variants} for i in range(len(options))]
    options = [
        {"name": o["name"], "values": [val for val in o.get("values") or [] if val in used[i]]
         + sorted(used[i] - set(o.get("values") or []))}
        for i, o in enumerate(options)
    ]
    return options, variants


def _variant_input(options, variant: Dict[str, Any]) -> Dict[str, Any]:
    price = variant.get("price") or 0
    original = variant.get("original_price")
    inventory_item: Dict[str, Any] = {"tracked": False}  # dropshipping: no stock counts to keep
    if variant.get("sku"):
        inventory_item["sku"] = variant["sku"]
    if variant.get("cost") is not None:
        inventory_item["cost"] = _money(variant["cost"])
    data = {
        "optionValues": [{"optionName": o["name"], "name": value} for o, value in zip(options, variant["options"])],
        "price": _money(price),
        "inventoryItem": inventory_item,
    }
    if original and original > price:
        data["compareAtPrice"] = _money(original)
    return data


def sync_product(product: Dict[str, Any], status: Optional[str] = None,
                 existing_id: Optional[str] = None) -> Dict[str, str]:
    """Create the product in Shopify, or update it when existing_id is given.

    New products default to DRAFT; an update keeps the Shopify status unless one
    is given. Returns {"id", "handle", "admin_url"}. Images are only sent on
    create so re-syncing doesn't add duplicate copies to the product.
    """
    options, variants = variant_rows(product)
    product_input: Dict[str, Any] = {
        "title": product["title"],
        "descriptionHtml": _description_html(product),
        "vendor": product.get("brand") or "",
        "productType": product.get("subcategory") or product.get("category") or "",
        "tags": [t for t in [product.get("category"), product.get("subcategory")] if t],
        "productOptions": [
            {"name": o["name"], "position": i + 1, "values": [{"name": v} for v in o["values"]]}
            for i, o in enumerate(options)
        ],
        "variants": [_variant_input(options, v) for v in variants],
    }
    if status or not existing_id:
        product_input["status"] = status or "DRAFT"
    if not existing_id:
        product_input["files"] = [
            {"originalSource": src, "contentType": "IMAGE", "alt": product["title"]}
            for src in _images(product)
        ]

    data = _graphql(PRODUCT_SET, {
        "identifier": {"id": existing_id} if existing_id else None,
        "input": product_input,
    })["productSet"]
    errors = " ".join(e.get("message", "") for e in data.get("userErrors") or []).lower()
    if existing_id and ("not exist" in errors or "not found" in errors):
        # Deleted in Shopify since the last sync: create it again
        return sync_product(product, status, None)
    _user_errors(data)

    saved = data["product"]
    numeric_id = saved["id"].rsplit("/", 1)[-1]
    return {
        "id": saved["id"],
        "handle": saved["handle"],
        "admin_url": f"https://{store_domain()}/admin/products/{numeric_id}",
    }


# ============ CSV EXPORT ============

CSV_COLUMNS = [
    "Handle", "Title", "Body (HTML)", "Vendor", "Type", "Tags", "Published",
    "Option1 Name", "Option1 Value", "Option2 Name", "Option2 Value", "Option3 Name", "Option3 Value",
    "Variant SKU", "Variant Price", "Variant Compare At Price", "Cost per item",
    "Variant Requires Shipping", "Variant Taxable", "Variant Inventory Policy",
    "Variant Fulfillment Service", "Image Src", "Image Position", "Image Alt Text", "Status",
]


def _handle(title: str, fallback: str) -> str:
    handle = re.sub(r"[^a-z0-9]+", "-", (title or "").lower()).strip("-")[:200]
    return handle or fallback


def products_to_csv(products: List[Dict[str, Any]], status: Optional[str] = "draft") -> str:
    """Build a CSV that Shopify's product importer accepts (one row per variant, extra rows for images)."""
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
        options, variants = variant_rows(product)
        rows = []
        for index, variant in enumerate(variants):
            price = variant.get("price") or 0
            original = variant.get("original_price")
            row = {
                "Handle": handle,
                "Variant SKU": variant.get("sku") or "",
                "Variant Price": _money(price),
                "Variant Compare At Price": _money(original) if original and original > price else "",
                "Cost per item": _money(variant.get("cost")) or "",
                "Variant Requires Shipping": "TRUE",
                "Variant Taxable": "TRUE",
                "Variant Inventory Policy": "continue",
                "Variant Fulfillment Service": "manual",
            }
            for i, (option, value) in enumerate(zip(options, variant["options"]), start=1):
                if index == 0:
                    row[f"Option{i} Name"] = option["name"]
                row[f"Option{i} Value"] = value
            rows.append(row)

        rows[0].update({
            "Title": product.get("title", ""),
            "Body (HTML)": _description_html(product),
            "Vendor": product.get("brand", ""),
            "Type": product.get("subcategory") or product.get("category", ""),
            "Tags": ", ".join(t for t in [product.get("category"), product.get("subcategory")] if t),
            "Published": "TRUE" if status == "active" else "FALSE",
            "Status": status or "draft",
        })
        # Images ride along on the variant rows, then get rows of their own
        for position, src in enumerate(images, start=1):
            if position > len(rows):
                rows.append({"Handle": handle})
            rows[position - 1].update({"Image Src": src, "Image Position": str(position),
                                       "Image Alt Text": product.get("title", "")})
        writer.writerows(rows)
    return out.getvalue()
