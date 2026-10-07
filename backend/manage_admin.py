"""
Create an admin account or reset an admin's password directly in MongoDB.

Use this when you are locked out of the admin panel (the "forgot password"
flow cannot email you a link yet). It talks to the database directly, so it
only works for someone who has the MONGO_URL connection string.

Usage (from the repo root):
    pip install pymongo bcrypt python-dotenv
    MONGO_URL='mongodb+srv://...' DB_NAME=justsimplbuy \
        python backend/manage_admin.py --email you@example.com

    # list existing admin accounts
    python backend/manage_admin.py --list

If MONGO_URL / DB_NAME are not set in the environment they are read from
backend/.env. You will be prompted for the new password (it is never echoed).
"""
import argparse
import getpass
import os
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

import bcrypt
from dotenv import load_dotenv
from pymongo import MongoClient

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")


def password_problem(password: str):
    """Same rules as security.validate_password_strength, without FastAPI."""
    if len(password) < 8:
        return "Password must be at least 8 characters"
    if not any(c.isalpha() for c in password) or not any(c.isdigit() for c in password):
        return "Password must include at least one letter and one number"
    return None


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def prompt_password() -> str:
    while True:
        password = getpass.getpass("New admin password: ")
        problem = password_problem(password)
        if problem:
            print(problem)
            continue
        if getpass.getpass("Repeat password: ") != password:
            print("Passwords do not match")
            continue
        return password


def get_db():
    mongo_url = os.environ.get("MONGO_URL")
    db_name = os.environ.get("DB_NAME")
    if not mongo_url or not db_name:
        sys.exit("MONGO_URL and DB_NAME must be set (environment or backend/.env)")
    client = MongoClient(mongo_url, serverSelectionTimeoutMS=10000)
    return client[db_name]


def list_admins(db) -> None:
    admins = list(db.users.find({"role": "admin"}, {"_id": 0, "email": 1, "name": 1}))
    if not admins:
        print("No admin accounts found.")
    for admin in admins:
        print(f"{admin.get('email')}  ({admin.get('name', '')})")


def set_admin(db, email: str, password: str, name: str) -> None:
    # Login matches the email exactly, so look it up the same way
    email = email.strip()
    existing = db.users.find_one({"email": email})
    now = datetime.now(timezone.utc).isoformat()

    if existing:
        db.users.update_one(
            {"_id": existing["_id"]},
            {"$set": {"password": hash_password(password), "role": "admin", "updated_at": now}},
        )
        user_id = existing.get("id")
        print(f"Password reset; {existing['email']} is now an admin.")
    else:
        user_id = str(uuid.uuid4())
        db.users.insert_one({
            "id": user_id,
            "email": email,
            "name": name,
            "password": hash_password(password),
            "role": "admin",
            "created_at": now,
        })
        print(f"Created new admin account {email}.")

    # Invalidate any outstanding reset links for this account
    db.password_resets.update_many({"email": email}, {"$set": {"used": True}})
    db.audit_logs.insert_one({
        "id": str(uuid.uuid4()),
        "admin_id": None,
        "admin_name": "manage_admin.py",
        "admin_email": "system",
        "action": "PASSWORD_RESET_COMPLETE" if existing else "CREATE",
        "resource_type": "user",
        "resource_id": user_id,
        "details": {"email": email, "via": "manage_admin.py"},
        "ip_address": None,
        "user_agent": None,
        "timestamp": now,
    })


def main() -> None:
    parser = argparse.ArgumentParser(description="Create or reset an admin account")
    parser.add_argument("--email", help="Admin email to create or reset")
    parser.add_argument("--name", default="Admin", help="Name for a newly created admin")
    parser.add_argument("--list", action="store_true", help="List existing admin accounts")
    args = parser.parse_args()

    db = get_db()
    if args.list:
        list_admins(db)
        return
    if not args.email:
        parser.error("--email is required (or use --list)")

    set_admin(db, args.email, prompt_password(), args.name)


if __name__ == "__main__":
    main()
