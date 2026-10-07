"""
Pull product details (title, description, price, brand, every image) from a
product page on another website so it can be added to the catalog.

Extraction order, best source first:
  1. Shopify stores: <store>/products/<handle>.json returns the full product
     with all variants and images.
  2. schema.org Product data embedded as JSON-LD (used by most retailers,
     WooCommerce, BigCommerce, Wix, Squarespace, ...).
  3. Open Graph / meta tags as a fallback.
"""
import html as html_lib
import ipaddress
import json
import re
import socket
from typing import Any, Dict, List, Optional
from urllib.parse import urljoin, urlparse, urlunparse

import requests
from bs4 import BeautifulSoup

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/126.0 Safari/537.36"
)
REQUEST_TIMEOUT = 15
MAX_RESPONSE_BYTES = 5 * 1024 * 1024
MAX_REDIRECTS = 5
MAX_IMAGES = 25


class ProductImportError(Exception):
    """Raised when a URL cannot be fetched or contains no product data."""


# ============ SAFE FETCHING ============

def _check_public_host(url: str) -> None:
    """Refuse URLs that point at private/internal addresses (SSRF guard)."""
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https") or not parsed.hostname:
        raise ProductImportError("Only http(s) URLs are supported")
    try:
        infos = socket.getaddrinfo(parsed.hostname, parsed.port or None)
    except socket.gaierror:
        raise ProductImportError(f"Could not resolve host {parsed.hostname}")
    for info in infos:
        ip = ipaddress.ip_address(info[4][0])
        if not ip.is_global:
            raise ProductImportError("That address is not allowed")


def fetch(url: str, accept: str = "text/html,application/xhtml+xml") -> requests.Response:
    """GET a public URL, validating every redirect hop and capping the size."""
    session = requests.Session()
    headers = {"User-Agent": USER_AGENT, "Accept": accept, "Accept-Language": "en-US,en;q=0.9"}
    for _ in range(MAX_REDIRECTS + 1):
        _check_public_host(url)
        resp = session.get(url, headers=headers, timeout=REQUEST_TIMEOUT,
                           allow_redirects=False, stream=True)
        if resp.is_redirect:
            url = urljoin(url, resp.headers.get("Location", ""))
            resp.close()
            continue
        chunks, size = [], 0
        for chunk in resp.iter_content(64 * 1024):
            size += len(chunk)
            if size > MAX_RESPONSE_BYTES:
                resp.close()
                raise ProductImportError("Page is too large")
            chunks.append(chunk)
        resp._content = b"".join(chunks)
        resp.url = url
        return resp
    raise ProductImportError("Too many redirects")


# ============ HELPERS ============

def _to_float(value: Any) -> Optional[float]:
    if value is None or value == "":
        return None
    if isinstance(value, (int, float)):
        return float(value)
    match = re.search(r"\d[\d,]*(?:\.\d+)?", str(value))
    if not match:
        return None
    try:
        return float(match.group(0).replace(",", ""))
    except ValueError:
        return None


def html_to_text(markup: str) -> str:
    if not markup:
        return ""
    text = BeautifulSoup(markup, "html.parser").get_text("\n")
    lines = [re.sub(r"\s+", " ", line).strip() for line in text.splitlines()]
    return "\n".join(line for line in lines if line)


def _bullets(markup: str, limit: int = 10) -> List[str]:
    """Use <li> items from the description as feature bullets."""
    if not markup:
        return []
    soup = BeautifulSoup(markup, "html.parser")
    items = [re.sub(r"\s+", " ", li.get_text(" ")).strip() for li in soup.find_all("li")]
    return [item for item in items if 2 < len(item) < 300][:limit]


def _clean_image_url(src: str, base_url: str) -> Optional[str]:
    if not src or not isinstance(src, str) or src.startswith("data:"):
        return None
    src = urljoin(base_url, src.strip())
    parsed = urlparse(src)
    if parsed.scheme not in ("http", "https"):
        return None
    return src


def _dedupe_images(urls: List[str]) -> List[str]:
    seen, out = set(), []
    for url in urls:
        # Shopify/CDN size variants (e.g. ?width=200) are the same image
        key = urlunparse(urlparse(url)._replace(query="", fragment=""))
        if key not in seen:
            seen.add(key)
            out.append(url)
    return out[:MAX_IMAGES]


def empty_product(source_url: str) -> Dict[str, Any]:
    return {
        "source_url": source_url,
        "title": "",
        "description": "",
        "description_html": "",
        "price": None,
        "original_price": None,
        "currency": None,
        "brand": "",
        "product_type": "",
        "tags": [],
        "features": [],
        "images": [],
        "in_stock": True,
        # Sizes/colors etc. Empty for single-variant products.
        "options": [],   # [{"name": "Size", "values": ["S", "M"]}]
        "variants": [],  # [{"options": ["S"], "price", "original_price", "sku", "available"}]
        "source": None,
    }


# ============ SHOPIFY STORES ============

SHOPIFY_PRODUCT_PATH = re.compile(r"/products/([^/?#.]+)")


def _shopify_json_url(url: str) -> Optional[str]:
    parsed = urlparse(url)
    match = SHOPIFY_PRODUCT_PATH.search(parsed.path)
    if not match:
        return None
    path = parsed.path[: match.end()] + ".json"
    return urlunparse((parsed.scheme, parsed.netloc, path, "", "", ""))


MAX_VARIANTS = 250


def _shopify_variants(product: Dict[str, Any]):
    """Options and variants from Shopify product JSON (none for "Default Title" products)."""
    options = [
        {"name": str(o.get("name") or f"Option {i + 1}"), "values": [str(v) for v in o.get("values") or []]}
        for i, o in enumerate(product.get("options") or [])
    ][:3]
    variants = []
    for v in (product.get("variants") or [])[:MAX_VARIANTS]:
        values = [v.get(f"option{i + 1}") for i in range(len(options))]
        if any(value is None for value in values):
            continue
        variants.append({
            "options": [str(value) for value in values],
            "price": _to_float(v.get("price")),
            "original_price": _to_float(v.get("compare_at_price")),
            "sku": v.get("sku") or "",
            # .json leaves "available" empty on many stores; only an explicit False means sold out
            "available": v.get("available") is not False,
        })
    if len(variants) <= 1 and (not options or options[0]["values"] in ([], ["Default Title"])):
        return [], []
    return options, variants


def parse_shopify_product(data: Dict[str, Any], source_url: str) -> Dict[str, Any]:
    product = data.get("product") or {}
    result = empty_product(source_url)
    variants = product.get("variants") or []
    first = variants[0] if variants else {}
    options, parsed_variants = _shopify_variants(product)
    body = product.get("body_html") or ""
    tags = product.get("tags") or []
    if isinstance(tags, str):
        tags = [t.strip() for t in tags.split(",") if t.strip()]

    result.update({
        "title": product.get("title") or "",
        "description_html": body,
        "description": html_to_text(body),
        "price": _to_float(first.get("price")),
        "original_price": _to_float(first.get("compare_at_price")),
        "brand": product.get("vendor") or "",
        "product_type": product.get("product_type") or "",
        "tags": tags,
        "features": _bullets(body),
        "images": _dedupe_images([
            img["src"] for img in product.get("images") or [] if img.get("src")
        ]),
        "in_stock": any(v.get("available") is not False for v in variants) if variants else True,
        "options": options,
        "variants": parsed_variants,
        "source": "shopify",
    })
    return result


# ============ JSON-LD / META TAGS ============

def _iter_jsonld_nodes(value: Any):
    if isinstance(value, list):
        for item in value:
            yield from _iter_jsonld_nodes(item)
    elif isinstance(value, dict):
        yield value
        for key in ("@graph", "mainEntity", "itemListElement"):
            if key in value:
                yield from _iter_jsonld_nodes(value[key])


def _is_type(node: Dict[str, Any], name: str) -> bool:
    node_type = node.get("@type")
    types = node_type if isinstance(node_type, list) else [node_type]
    return any(isinstance(t, str) and t.lower() == name.lower() for t in types)


def find_jsonld_product(soup: BeautifulSoup) -> Optional[Dict[str, Any]]:
    for script in soup.find_all("script", type=re.compile(r"ld\+json", re.I)):
        raw = script.string or script.get_text() or ""
        try:
            data = json.loads(raw.strip())
        except (json.JSONDecodeError, ValueError):
            continue
        for node in _iter_jsonld_nodes(data):
            if _is_type(node, "Product") or _is_type(node, "ProductGroup"):
                return node
    return None


def _jsonld_images(value: Any) -> List[str]:
    if isinstance(value, str):
        return [value]
    if isinstance(value, dict):
        return [value.get("url") or value.get("contentUrl") or ""]
    if isinstance(value, list):
        out = []
        for item in value:
            out.extend(_jsonld_images(item))
        return out
    return []


def _jsonld_offer(node: Dict[str, Any]) -> Dict[str, Any]:
    offers = node.get("offers")
    if not offers and node.get("hasVariant"):
        variants = node["hasVariant"]
        variants = variants if isinstance(variants, list) else [variants]
        offers = [v.get("offers") for v in variants if isinstance(v, dict) and v.get("offers")]
    if isinstance(offers, list):
        offers = next((o for o in offers if isinstance(o, dict)), {})
    if not isinstance(offers, dict):
        return {}
    if _is_type(offers, "AggregateOffer") and offers.get("offers"):
        inner = offers["offers"]
        inner = inner[0] if isinstance(inner, list) and inner else inner
        if isinstance(inner, dict) and inner.get("price") is not None:
            return {**offers, **inner}
    return offers


PRICE_TEXT = re.compile(r"(?:[$€£¥₹]|USD|EUR|GBP|CAD|AUD)\s?\d[\d,]*(?:\.\d{2})?")
PRICE_CLASS = re.compile(r"price", re.I)
GALLERY_HINT = re.compile(r"product|gallery|zoom|main-image|hero", re.I)


def _guess_price(soup: BeautifulSoup) -> Optional[float]:
    """Last resort: first element with 'price' in its class that shows a currency amount."""
    for tag in soup.find_all(class_=PRICE_CLASS):
        match = PRICE_TEXT.search(tag.get_text(" "))
        if match:
            return _to_float(match.group(0))
    return None


def _guess_images(soup: BeautifulSoup, title: str) -> List[str]:
    """Last resort: <img> tags that look like product photos."""
    found = []
    title_key = title.lower()[:30]
    for img in soup.find_all("img"):
        src = img.get("data-zoom-image") or img.get("data-large_image") or img.get("data-src") or img.get("src")
        if not src:
            continue
        alt = (img.get("alt") or "").lower()
        hints = " ".join([" ".join(img.get("class") or []), img.get("id") or "", src])
        for parent in img.parents:
            if parent.name in ("body", "html", None):
                break
            hints += " " + " ".join(parent.get("class") or []) + " " + (parent.get("id") or "")
            if parent.name in ("header", "footer", "nav"):
                hints = ""
                break
        if (title_key and alt and (alt in title.lower() or title_key in alt)) or (hints and GALLERY_HINT.search(hints)):
            found.append(src)
    return found


def parse_html_product(page_html: str, source_url: str) -> Dict[str, Any]:
    soup = BeautifulSoup(page_html, "html.parser")
    result = empty_product(source_url)

    def meta(*names: str) -> List[str]:
        values = []
        for name in names:
            for tag in soup.find_all("meta", attrs={"property": name}) + \
                    soup.find_all("meta", attrs={"name": name}):
                if tag.get("content"):
                    values.append(tag["content"].strip())
        return values

    node = find_jsonld_product(soup)
    images: List[str] = []
    if node:
        result["source"] = "json-ld"
        result["title"] = html_lib.unescape(str(node.get("name") or ""))
        description = str(node.get("description") or "")
        if "<" in description:
            result["description_html"] = description
            result["description"] = html_to_text(description)
        else:
            result["description"] = html_lib.unescape(description)
        brand = node.get("brand")
        if isinstance(brand, list):
            brand = brand[0] if brand else ""
        if isinstance(brand, dict):
            brand = brand.get("name", "")
        result["brand"] = str(brand or "")
        result["product_type"] = str(node.get("category") or "")
        images.extend(_jsonld_images(node.get("image")))

        offer = _jsonld_offer(node)
        price = offer.get("price")
        if price is None:
            price = offer.get("lowPrice")
        if price is None and isinstance(offer.get("priceSpecification"), dict):
            price = offer["priceSpecification"].get("price")
        result["price"] = _to_float(price)
        result["currency"] = offer.get("priceCurrency")
        availability = str(offer.get("availability") or "")
        if availability:
            result["in_stock"] = not re.search(r"OutOfStock|Discontinued|SoldOut", availability, re.I)

    def itemprop(name: str) -> List[str]:
        values = []
        for tag in soup.find_all(attrs={"itemprop": name}):
            value = tag.get("content") or tag.get("src") or tag.get("href") or tag.get_text(" ")
            if value and value.strip():
                values.append(value.strip())
        return values

    # Fill gaps from Open Graph / microdata / meta tags
    if not result["title"]:
        h1 = soup.find("h1")
        result["title"] = (meta("og:title", "twitter:title") or itemprop("name")
                           or [h1.get_text(" ").strip() if h1 else ""])[0]
        if not result["title"] and soup.title:
            result["title"] = soup.title.get_text().strip()
    if not result["description"]:
        result["description"] = (meta("og:description", "description", "twitter:description") or [""])[0]
    if result["price"] is None:
        result["price"] = _to_float((meta("product:price:amount", "og:price:amount")
                                     or itemprop("price") or [None])[0])
        result["currency"] = result["currency"] or (meta("product:price:currency", "og:price:currency")
                                                    or itemprop("priceCurrency") or [None])[0]
    if result["price"] is None:
        result["price"] = _guess_price(soup)
    if not result["brand"]:
        result["brand"] = (meta("product:brand", "og:brand") or itemprop("brand") or [""])[0]
    images.extend(meta("og:image", "og:image:secure_url", "twitter:image"))
    images.extend(itemprop("image"))
    if len(_dedupe_images(images)) < 2:
        # Structured data often lists only the main photo; look for the gallery too
        images.extend(_guess_images(soup, result["title"]))

    if not result["source"] and (result["title"] or images):
        result["source"] = "meta"

    if not result["features"]:
        result["features"] = _bullets(result["description_html"])

    cleaned = [_clean_image_url(src, source_url) for src in images]
    result["images"] = _dedupe_images([src for src in cleaned if src])
    result["title"] = result["title"].strip()
    return result


# ============ ENTRY POINT ============

def extract_product(url: str) -> Dict[str, Any]:
    """Fetch a product page and return normalized product data."""
    url = url.strip()
    if not urlparse(url).scheme:
        url = "https://" + url

    shopify_url = _shopify_json_url(url)
    if shopify_url:
        try:
            resp = fetch(shopify_url, accept="application/json")
            if resp.status_code == 200 and "json" in resp.headers.get("Content-Type", ""):
                product = parse_shopify_product(resp.json(), url)
                if product["title"]:
                    return product
        except (ProductImportError, requests.RequestException, ValueError):
            pass  # not actually a Shopify store; fall back to HTML

    try:
        resp = fetch(url)
    except requests.RequestException as exc:
        raise ProductImportError(f"Could not load page: {exc.__class__.__name__}")
    if resp.status_code >= 400:
        raise ProductImportError(
            f"The site returned HTTP {resp.status_code}. Some large retailers block "
            "automated requests; try the product's page on the brand or supplier site."
        )
    product = parse_html_product(resp.text, url)
    if not product["title"]:
        raise ProductImportError("No product information found on that page")
    return product
