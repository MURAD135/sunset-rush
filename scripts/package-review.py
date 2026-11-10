"""Package the existing static build for review; never upload or deploy it."""
import hashlib
import json
import re
import subprocess
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo

root = Path(__file__).resolve().parents[1]
dist = root / "dist"
revision = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=root, text=True).strip()
files = {}
for path in sorted(dist.rglob("*")):
    if path.is_symlink():
        raise SystemExit("Build must not contain symlinks")
    if path.is_file():
        name = path.relative_to(dist).as_posix()
        if name.endswith(".map") or any(part.startswith(".") for part in path.relative_to(dist).parts):
            raise SystemExit("Unexpected private/debug build file: " + name)
        files[name] = path.read_bytes()
required = {"index.html", "manifest.webmanifest", "sw.js", "THIRD_PARTY_NOTICES.txt"}
if not required.issubset(files):
    raise SystemExit("Run npm run build before packaging")
cache = re.search(rb"sunset-rush-([a-f0-9]{12})", files["sw.js"])
digest = hashlib.sha256(b"".join(data for name, data in sorted(files.items()) if name != "sw.js")).hexdigest()[:12]
if not cache or cache.group(1).decode() != digest:
    raise SystemExit("Service-worker cache does not match build contents")
runtime_hashes = {name: hashlib.sha256(data).hexdigest() for name, data in files.items()}
info = {"sourceCommit": revision, "productionCache": "sunset-rush-" + digest,
        "format": "Static web/PWA build; serve over HTTPS for mobile review, not file://",
        "deviceValidation": "Chromium emulation and offline production passed; physical Safari/iOS and Chrome/Android testing pending",
        "runtimeFiles": runtime_hashes}
files["BUILD_INFO.json"] = (json.dumps(info, indent=2) + "\n").encode()
files["REVIEW.md"] = (root / "docs/v3/REVIEW_GUIDE.md").read_bytes()
files["SHA256SUMS"] = "".join(f"{hashlib.sha256(data).hexdigest()}  {name}\n" for name, data in sorted(files.items())).encode()
output = root / "artifacts/review"
output.mkdir(parents=True, exist_ok=True)
archive = output / f"sunset-rush-3-review-{revision[:7]}.zip"
with ZipFile(archive, "w", compression=ZIP_DEFLATED, compresslevel=9) as package:
    for name, data in sorted(files.items()):
        entry = ZipInfo(name, date_time=(2026, 1, 1, 0, 0, 0))
        entry.compress_type = ZIP_DEFLATED
        entry.external_attr = 0o100644 << 16
        package.writestr(entry, data)
with ZipFile(archive) as package:
    assert package.testzip() is None
    for name, expected in runtime_hashes.items():
        assert hashlib.sha256(package.read(name)).hexdigest() == expected
checksum = hashlib.sha256(archive.read_bytes()).hexdigest()
archive.with_suffix(".zip.sha256").write_text(f"{checksum}  {archive.name}\n")
print(json.dumps({"archive": str(archive.relative_to(root)), "bytes": archive.stat().st_size,
                  "sha256": checksum, "sourceCommit": revision, "productionCache": info["productionCache"],
                  "runtimeFilesVerified": len(runtime_hashes)}, indent=2))
