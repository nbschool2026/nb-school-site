"""Create a reviewable SQLite content snapshot for Git without CMS credentials."""

from pathlib import Path
import json
import sqlite3
import sys
import tempfile


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "cms" / ".tmp" / "data.db"
DESTINATION = ROOT / "backups" / "cms-content.db"
UPLOADS = ROOT / "cms" / "public" / "uploads"

# Review new nonempty tables before adding them here: they may contain secrets.
ALLOWED_TABLES = {
    "admin_permissions", "admin_permissions_api_token_lnk",
    "admin_permissions_role_lnk", "admin_roles", "admin_users",
    "admin_users_roles_lnk", "events", "files", "files_folder_lnk",
    "files_related_mph", "gallery_items", "history_items", "i18n_locale",
    "public_documents", "schedule_lessons", "school_profiles",
    "sqlite_sequence", "staff_members", "strapi_ai_localization_jobs",
    "strapi_ai_metadata_jobs", "strapi_api_token_permissions",
    "strapi_api_token_permissions_token_lnk", "strapi_api_tokens",
    "strapi_api_tokens_admin_user_owner_lnk", "strapi_core_store_settings",
    "strapi_database_schema", "strapi_history_versions", "strapi_migrations",
    "strapi_migrations_internal", "strapi_release_actions",
    "strapi_release_actions_release_lnk", "strapi_releases",
    "strapi_sessions", "strapi_transfer_token_permissions",
    "strapi_transfer_token_permissions_token_lnk", "strapi_transfer_tokens",
    "strapi_webhooks", "strapi_workflows",
    "strapi_workflows_stage_required_to_publish_lnk",
    "strapi_workflows_stages", "strapi_workflows_stages_permissions_lnk",
    "strapi_workflows_stages_workflow_lnk", "up_permissions",
    "up_permissions_role_lnk", "up_roles", "up_users", "up_users_role_lnk",
    "upload_folders", "upload_folders_parent_lnk", "value_cards",
}

REMOVE_ROWS = {
    "admin_users", "admin_users_roles_lnk", "strapi_api_tokens",
    "strapi_api_tokens_admin_user_owner_lnk", "strapi_sessions",
    "strapi_transfer_tokens", "strapi_webhooks", "up_users",
    "up_users_role_lnk", "strapi_history_versions",
    "strapi_ai_localization_jobs", "strapi_ai_metadata_jobs",
}


def main() -> None:
    if not SOURCE.is_file():
        sys.exit(f"Source database is missing: {SOURCE}")
    DESTINATION.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(dir=DESTINATION.parent) as temp_dir:
        temp_db = Path(temp_dir) / "snapshot.db"
        source = sqlite3.connect(f"file:{SOURCE.as_posix()}?mode=ro", uri=True)
        snapshot = sqlite3.connect(temp_db)
        try:
            source.backup(snapshot)  # SQLite online backup: consistent while CMS runs.
            tables = {
                row[0] for row in snapshot.execute(
                    "SELECT name FROM sqlite_master WHERE type = 'table' "
                    "AND name NOT LIKE 'sqlite_%'"
                )
            }
            unknown = sorted(tables - ALLOWED_TABLES)
            if unknown:
                raise RuntimeError(f"Review new database tables before export: {unknown}")
            with snapshot:
                snapshot.execute("PRAGMA secure_delete = ON")
                for table in REMOVE_ROWS & tables:
                    snapshot.execute(f'DELETE FROM "{table}"')
                # These Strapi settings may hold authentication or provider secrets.
                snapshot.execute(
                    "DELETE FROM strapi_core_store_settings "
                    "WHERE key NOT IN ('strapi_content_types_schema', "
                    "'plugin_i18n_default_locale', "
                    "'core_school_site_i18n_migration_v1')"
                )
            missing_media = []
            for url, formats, provider in snapshot.execute(
                "SELECT url, formats, provider FROM files"
            ):
                if provider != "local":
                    raise RuntimeError(f"Review non-local media provider: {provider}")
                urls = [url]
                if formats:
                    urls.extend(item.get("url") for item in json.loads(formats).values())
                for media_url in urls:
                    if media_url and media_url.startswith("/uploads/"):
                        if not (UPLOADS / Path(media_url).name).is_file():
                            missing_media.append(media_url)
            if missing_media:
                raise RuntimeError(f"Missing upload files: {missing_media}")
            snapshot.execute("VACUUM")  # Remove deleted credential bytes from the file.
            if snapshot.execute("PRAGMA integrity_check").fetchone()[0] != "ok":
                raise RuntimeError("SQLite integrity check failed")
            count = snapshot.execute("SELECT COUNT(*) FROM events").fetchone()[0]
            media_count = snapshot.execute("SELECT COUNT(*) FROM files").fetchone()[0]
        finally:
            snapshot.close()
            source.close()
        temp_db.replace(DESTINATION)
    print(f"Saved {DESTINATION.relative_to(ROOT)}: {count} event rows, {media_count} media records")
    print("Admin accounts, sessions, API tokens and sensitive settings were removed.")
    print("Review the snapshot and stage uploads separately before committing.")


if __name__ == "__main__":
    main()
