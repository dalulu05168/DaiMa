import argparse
import hashlib
import json
import os
import shutil
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument("installed", type=Path)
parser.add_argument("cloudcli", type=Path)
parser.add_argument("node", type=Path)
parser.add_argument("target", type=Path)
parser.add_argument("--node-license", type=Path, default=Path(__file__).parent / "NODE-LICENSE.txt")
parser.add_argument("--full-manifest", action="store_true")
args = parser.parse_args()
target = args.target.resolve()
target.mkdir(parents=True, exist_ok=False)

PRIVATE_FILES = {".env", ".npmrc", "auth.json", "workshop-peer.key"}
SKIP_DIRS = {
    ".git", ".claude", "__pycache__", "tests", "test-results", "logs", "exports",
    "user-data", ".cache", "coverage"
}
RUNTIME_STATE = (".db", ".db-wal", ".db-shm", ".sqlite", ".sqlite3", ".log", ".pyc", ".pdb", ".bak", ".map")

def copy_tree(source, out):
    for current, folders, files in os.walk(source):
        parent = Path(current)
        folders[:] = [
            folder for folder in folders
            if folder not in SKIP_DIRS
            and not folder.startswith("backup-")
            and not (folder == "runtime" and parent.parent.name == "modules")
        ]
        for name in files:
            lower = name.lower()
            if lower in PRIVATE_FILES or lower.startswith(".env.") or lower.endswith(RUNTIME_STATE):
                continue
            original = parent / name
            destination = out / original.relative_to(source)
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(original, destination)

for original in args.installed.iterdir():
    if original.is_file() and (
        original.name == "ELLERY WESTCOTT.exe"
        or original.suffix.lower() in {".dll", ".pak", ".dat", ".bin"}
        or original.name in {"vk_swiftshader_icd.json", "LICENSE.electron.txt", "LICENSES.chromium.html"}
    ):
        shutil.copy2(original, target / original.name)

for directory in ("locales", "resources/app", "resources/modules", "resources/runtime", "resources/templates"):
    copy_tree(args.installed / directory, target / directory)

fixes = Path(__file__).parent / "app"
for original in fixes.iterdir():
    shutil.copy2(original, target / "resources/app/src" / original.name)

workshop = target / "resources/workshop"
workshop.mkdir()
for name in ("package.json", "start-local.cjs", "apply-westcott-theme.cjs", "workshop-peer.cjs"):
    shutil.copy2(args.cloudcli / name, workshop / name)
copy_tree(args.cloudcli / "theme", workshop / "theme")
copy_tree(args.cloudcli / "node_modules", workshop / "node_modules")
(workshop / "runtime").mkdir()
shutil.copy2(args.node, workshop / "runtime/node.exe")
shutil.copy2(args.node_license, workshop / "runtime/LICENSE.txt")

package_file = target / "resources/app/package.json"
package = json.loads(package_file.read_text(encoding="utf-8"))
package["version"] = "1.4.31"
package_file.write_text(json.dumps(package, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
html = target / "resources/app/ui/index.html"
html.write_text(html.read_text(encoding="utf-8").replace("DESKTOP / 1.4.30", "DESKTOP / 1.4.31"), encoding="utf-8")

manifest, removals, directories = [], [], []
for current, _, files in os.walk(target):
    parent = Path(current)
    relative = parent.relative_to(target)
    if relative != Path("."):
        directories.append(relative)
    for name in sorted(files):
        file = parent / name
        child = relative / name
        row = {"path": child.as_posix(), "bytes": file.stat().st_size}
        if args.full_manifest:
            with file.open("rb") as stream:
                row["sha256"] = hashlib.file_digest(stream, "sha256").hexdigest()
        manifest.append(row)
        removals.append(f'Delete "$INSTDIR\\{str(child).replace("$", "$$")}"')
for directory in sorted(directories, key=lambda item: len(item.parts), reverse=True):
    removals.append(f'RMDir "$INSTDIR\\{str(directory).replace("$", "$$")}"')
target.with_name("uninstall-payload.nsh").write_text("\n".join(removals) + "\n", encoding="utf-8-sig")
target.with_name("payload-manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8")
print(json.dumps({"version": package["version"], "files": len(manifest), "bytes": sum(row["bytes"] for row in manifest)}))
