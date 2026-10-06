"""Change only the web interface bind mount in the existing Compose file."""
import re
import sys
from pathlib import Path

compose_path = Path(sys.argv[1])
release_name = sys.argv[2]
if not re.fullmatch(r'[0-9]{8}T[0-9]{6}Z-[0-9]+', release_name):
    raise SystemExit('Invalid release name')
content = compose_path.read_text(encoding='utf-8')
marker = '    volumes:\n'
if content.count(marker) != 1 or '  grampsweb: &grampsweb\n' not in content:
    raise SystemExit('Unexpected Compose structure; configuration was not changed')
content = re.sub(
    r'^      - \./(?:ui-overrides/lang/ru\.json:/app/static/lang/ru\.json|'
    r'frontend-releases/[^\n]+:/app/static):ro\n',
    '', content, flags=re.MULTILINE,
)
content = content.replace(
    marker,
    marker + f'      - ./frontend-releases/{release_name}:/app/static:ro\n',
    1,
)
compose_path.write_text(content, encoding='utf-8')
