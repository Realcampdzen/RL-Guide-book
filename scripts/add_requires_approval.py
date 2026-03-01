#!/usr/bin/env python3
"""
M7-REQUIRESAPPROVAL-C: Add requiresApproval flag to badge level objects.

Per orchestrator scope:
- Category 9 (BRO) and Category 10 (Flag) → requiresApproval: true on each level
- All other categories → field is NOT added (implicit false / self-claim)

Usage:
  python scripts/add_requires_approval.py          # Apply changes
  python scripts/add_requires_approval.py --verify  # Verify only (no writes)
"""

import json
import os
import sys
from pathlib import Path

AI_DATA_DIR = Path(__file__).resolve().parent.parent / "ai-data"

# Only these categories get requiresApproval: true
REQUIRES_APPROVAL_CATEGORIES = {"9", "10"}


def get_badge_files():
    """Yield (path, category_id) for all badge JSON files (not index.json)."""
    for cat_dir in sorted(AI_DATA_DIR.iterdir()):
        if not cat_dir.is_dir() or not cat_dir.name.startswith("category-"):
            continue
        cat_id = cat_dir.name.replace("category-", "")
        for f in sorted(cat_dir.iterdir()):
            if f.suffix == ".json" and f.name != "index.json":
                yield f, cat_id


def process_badge(path: Path, cat_id: str, dry_run: bool = False):
    """Add/verify requiresApproval in level objects. Returns (changed, error)."""
    try:
        text = path.read_text(encoding="utf-8")
        data = json.loads(text)
    except Exception as e:
        return False, str(e)

    if "levels" not in data or not isinstance(data["levels"], list):
        return False, None  # no levels array — skip

    needs_approval = cat_id in REQUIRES_APPROVAL_CATEGORIES
    changed = False

    for level in data["levels"]:
        if not isinstance(level, dict):
            continue

        if needs_approval:
            if level.get("requiresApproval") is not True:
                # Insert after confirmation or criteria field
                new_level = {}
                inserted = False
                for key, value in level.items():
                    new_level[key] = value
                    if key == "confirmation" and not inserted:
                        new_level["requiresApproval"] = True
                        inserted = True
                if not inserted:
                    new_level["requiresApproval"] = True
                level.clear()
                level.update(new_level)
                changed = True
        else:
            # Remove field if it was somehow added to non-approval categories
            if "requiresApproval" in level:
                del level["requiresApproval"]
                changed = True

    if changed and not dry_run:
        out = json.dumps(data, ensure_ascii=False, indent=2) + "\n"
        path.write_text(out, encoding="utf-8")

    return changed, None


def verify_results():
    """Verify all badge files match expected state."""
    issues = []
    total = 0
    approval_count = 0

    for path, cat_id in get_badge_files():
        total += 1
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except Exception as e:
            issues.append(f"{path.name}: parse error: {e}")
            continue

        levels = data.get("levels", [])
        needs = cat_id in REQUIRES_APPROVAL_CATEGORIES

        for level in levels:
            if not isinstance(level, dict):
                continue
            has_flag = "requiresApproval" in level

            if needs and not has_flag:
                issues.append(f"{path.name} level {level.get('id', '?')}: MISSING requiresApproval")
            elif needs and level["requiresApproval"] is not True:
                issues.append(f"{path.name} level {level.get('id', '?')}: requiresApproval != true")
            elif not needs and has_flag:
                issues.append(f"{path.name} level {level.get('id', '?')}: unexpected requiresApproval field")

            if needs and has_flag:
                approval_count += 1

    return total, approval_count, issues


def main():
    verify_only = "--verify" in sys.argv
    mode = "VERIFY" if verify_only else "APPLY"
    print(f"[{mode}] requiresApproval flag in ai-data badge JSONs")
    print(f"  AI_DATA_DIR: {AI_DATA_DIR}")
    print(f"  Approval categories: {sorted(REQUIRES_APPROVAL_CATEGORIES)}")
    print()

    if not verify_only:
        changed_count = 0
        errors = []
        for path, cat_id in get_badge_files():
            ok, err = process_badge(path, cat_id, dry_run=False)
            if err:
                errors.append(f"{path.name}: {err}")
            elif ok:
                changed_count += 1

        if errors:
            print(f"Errors ({len(errors)}):")
            for e in errors:
                print(f"  {e}")
        print(f"Files changed: {changed_count}")
        print()

    total, approval_count, issues = verify_results()
    print(f"Total badge files: {total}")
    print(f"Levels with requiresApproval=true: {approval_count}")

    if issues:
        print(f"\nIssues ({len(issues)}):")
        for i in issues:
            print(f"  {i}")
        print("\n❌ Issues found.")
        return 1
    else:
        print("\n✅ All good!")
        return 0


if __name__ == "__main__":
    sys.exit(main())
