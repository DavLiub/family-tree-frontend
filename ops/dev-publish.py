#!/usr/bin/env python3
"""Publish only the successful push CI artifact of the current dev head."""
import fcntl
import json
import os
from pathlib import Path, PurePosixPath
import shutil
import stat
import subprocess
import tempfile
import zipfile
from urllib.request import urlopen

REPO = 'DavLiub/family-tree-frontend'
ROOT = Path('/opt/sites/family-tree/dev-runtime')
MAX_BYTES = 250 * 1024 * 1024


def gh(*args):
    return subprocess.check_output(['/usr/bin/gh', *args], timeout=90)


def api(path):
    return json.loads(gh('api', f'repos/{REPO}/{path}'))


def head():
    return api('git/ref/heads/dev')['object']['sha']


def main():
    ROOT.mkdir(exist_ok=True)
    with (ROOT / '.publish.lock').open('w') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        sha = head()
        state = ROOT / 'published.json'
        if state.exists() and json.loads(state.read_text())['sha'] == sha:
            print(f'Already published: {sha}')
            return
        runs = api('actions/workflows/test.yml/runs?branch=dev&event=push&per_page=20')['workflow_runs']
        run = next((r for r in runs if r['head_sha'] == sha), None)
        if not run or run['status'] != 'completed' or run['conclusion'] != 'success':
            print(f'Waiting for successful dev push CI: {sha}')
            return
        if run['head_repository']['full_name'] != REPO:
            raise ValueError('Unexpected build repository')
        artifacts = api(f"actions/runs/{run['id']}/artifacts")['artifacts']
        artifact = next(a for a in artifacts if a['name'] == 'ui-build' and not a['expired'])
        if artifact['size_in_bytes'] > MAX_BYTES:
            raise ValueError('Build archive too large')
        with tempfile.TemporaryDirectory(dir=ROOT, prefix='.download-') as temp:
            temp = Path(temp)
            archive = temp / 'build.zip'
            with archive.open('wb') as output:
                subprocess.run(['/usr/bin/gh', 'api', f"repos/{REPO}/actions/artifacts/{artifact['id']}/zip"], stdout=output, check=True, timeout=120)
            build = temp / 'build'
            build.mkdir()
            with zipfile.ZipFile(archive) as source:
                entries = source.infolist()
                if len(entries) > 10000 or sum(e.file_size for e in entries) > MAX_BYTES:
                    raise ValueError('Expanded build too large')
                for entry in entries:
                    path = PurePosixPath(entry.filename)
                    mode = entry.external_attr >> 16
                    if path.is_absolute() or '..' in path.parts or '\\' in entry.filename or stat.S_ISLNK(mode):
                        raise ValueError('Unsafe artifact path')
                    target = build.joinpath(*path.parts)
                    if entry.is_dir():
                        target.mkdir(parents=True, exist_ok=True)
                    else:
                        target.parent.mkdir(parents=True, exist_ok=True)
                        with source.open(entry) as src, target.open('wb') as dst:
                            shutil.copyfileobj(src, dst)
                        target.chmod(0o644)
            for name in ('index.html', 'sw.js', 'config.js', 'family-interface-source.tar.gz'):
                if not (build / name).is_file() or (build / name).stat().st_size == 0:
                    raise ValueError(f'Missing build file: {name}')
            if head() != sha:
                print('Dev advanced while downloading; publication deferred')
                return
            releases = ROOT / 'releases'
            releases.mkdir(exist_ok=True)
            release = releases / f"{run['id']}-{sha[:12]}"
            if not release.exists():
                shutil.move(build, release)
            current = ROOT / 'current'
            old = current.resolve() if current.is_symlink() else None
            if old and old != release:
                previous = ROOT / '.previous-next'
                previous.unlink(missing_ok=True)
                previous.symlink_to(old, target_is_directory=True)
                os.replace(previous, ROOT / 'previous')
            pending = ROOT / '.current-next'
            pending.unlink(missing_ok=True)
            pending.symlink_to(release, target_is_directory=True)
            os.replace(pending, current)
            try:
                with urlopen('https://family.dev.taldav.com/', timeout=20) as response:
                    served = response.read(2 * 1024 * 1024)
                if served != (release / 'index.html').read_bytes():
                    raise ValueError('Published HTTPS index does not match CI artifact')
            except Exception:
                if old:
                    pending.symlink_to(old, target_is_directory=True)
                    os.replace(pending, current)
                else:
                    current.unlink()
                raise
            state_tmp = ROOT / '.published-next.json'
            state_tmp.write_text(json.dumps({'sha': sha, 'run_id': run['id'], 'url': run['html_url']}) + '\n')
            os.replace(state_tmp, state)
            print(f"Published dev {sha}: {run['html_url']}")
            # Retain the current and previous release; these are generated dev builds only.
            keep = {release.resolve()}
            if (ROOT / 'previous').is_symlink():
                keep.add((ROOT / 'previous').resolve())
            for item in releases.iterdir():
                if item.is_dir() and not item.is_symlink() and item.resolve() not in keep:
                    shutil.rmtree(item)


if __name__ == '__main__':
    main()
