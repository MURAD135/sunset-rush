"""Install the pinned CI test browser, verifying its archive before extraction.

This is test infrastructure, not an asset shipped with the game. Prints only
its executable path for CHROMIUM_PATH. Usage: python3 script.py TEMP_DIRECTORY
"""
import hashlib
import json
import pathlib
import sys
import urllib.request
import zipfile

config = json.loads((pathlib.Path(__file__).resolve().parent.parent / 'config/review-browser.json').read_text())
root = pathlib.Path(sys.argv[1]).resolve()
root.mkdir(parents=True, exist_ok=True)
archive_path = root / 'chrome.zip'
with urllib.request.urlopen(config['url'], timeout=60) as response, archive_path.open('wb') as output:
    while chunk := response.read(1024 * 1024):
        output.write(chunk)
with archive_path.open('rb') as source:
    if hashlib.file_digest(source, 'sha256').hexdigest() != config['sha256']:
        raise RuntimeError('Test browser archive checksum mismatch')
with zipfile.ZipFile(archive_path) as archive:
    for name in archive.namelist():
        relative = pathlib.PurePosixPath(name)
        if relative.is_absolute() or '..' in relative.parts or relative.parts[0] != 'chrome-linux64':
            raise RuntimeError('Unexpected archive path')
    archive.extractall(root)
for name in ['chrome', 'chrome_crashpad_handler', 'chrome_sandbox']:
    executable = root / 'chrome-linux64' / name
    if executable.exists():
        executable.chmod(0o755)
print(root / 'chrome-linux64/chrome')
