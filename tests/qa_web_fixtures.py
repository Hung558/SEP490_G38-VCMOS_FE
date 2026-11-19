"""Shared isolation helpers for desktop FE browser tests with stubbed BE routes."""
import json
import os
import re
from urllib.parse import urlsplit

from playwright.sync_api import sync_playwright

BASE = os.getenv('FE_BASE_URL', 'http://[::1]:3000').rstrip('/')
_ALLOWED_ORIGINS = {
    'http://[::1]:3000', 'http://127.0.0.1:3000', 'http://127.0.0.2:3000',
}
if BASE not in _ALLOWED_ORIGINS:
    raise SystemExit('FE_BASE_URL must be a dedicated loopback listener on port 3000.')

TOKEN = 'be53-54-synthetic-fixture-token'
OWNER = {
    '_id': '000000000000000000000053', 'fullName': 'Chủ nuôi E2E QA',
    'role': 'PetOwner', 'status': 'Active', 'isEmailVerified': True,
}
OTHER_OWNER = '000000000000000000000054'
PET = '000000000000000000000055'
FOREIGN_PET = '000000000000000000000056'


def install_auth(context, role='PetOwner'):
    user = {**OWNER, 'role': role}
    context.add_init_script(
        f"localStorage.setItem('user-info', {json.dumps(json.dumps(user))});"
        f"localStorage.setItem('token', {json.dumps(TOKEN)});"
        "sessionStorage.setItem('hasLoadedBefore', 'true');"
    )


def install_network_guard(context, handler, failures):
    """Never let API or cross-origin traffic reach a server; track gaps as failures."""
    def route(request_route):
        request = request_route.request
        parsed = urlsplit(request.url)
        origin = f'{parsed.scheme}://{parsed.netloc}'
        path = parsed.path
        api_like = path.startswith('/api/') or request.resource_type in ('xhr', 'fetch')
        if origin == BASE and path.startswith('/api/'):
            if request.header_value('authorization') != f'Bearer {TOKEN}':
                failures.append((request.method, path, 'missing fixture auth'))
                return request_route.fulfill(status=401, json={'message': 'Thiếu phiên QA'})
            return handler(request_route, parsed)
        if origin == BASE and request.method in ('GET', 'HEAD') and not api_like:
            return request_route.continue_()
        if api_like or request.method not in ('GET', 'HEAD'):
            failures.append((request.method, origin, path, 'blocked unmatched/cross-origin request'))
        return request_route.abort()

    context.route('**/*', route)


def fixture_file(name):
    """Tiny, valid PNG uploaded only into the browser request interception fixture."""
    import base64
    return {
        'name': name,
        'mimeType': 'image/png',
        'buffer': base64.b64decode(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l2cAAAAASUVORK5CYII='
        ),
    }


def parse_multipart(request):
    """Extract UTF-8 multipart fields and binary files without corrupting text."""
    content_type = request.header_value('content-type') or ''
    if 'multipart/form-data' not in content_type.lower():
        raise AssertionError(f'Expected multipart/form-data, got {content_type!r}')
    raw_body = request.post_data_buffer
    boundary = content_type.split('boundary=', 1)[-1].strip().strip('"').encode('ascii')
    fields = {}
    files = []
    for part in raw_body.split(b'--' + boundary):
        if b'Content-Disposition:' not in part:
            continue
        head, _, value = part.partition(b'\r\n\r\n')
        value = value.rsplit(b'\r\n', 1)[0]
        header_text = head.decode('latin-1')
        name_match = re.search(r'\bname="([^"]*)"', header_text)
        filename_match = re.search(r'\bfilename="([^"]*)"', header_text)
        name = name_match.group(1) if name_match else None
        filename = filename_match.group(1) if filename_match else None
        if filename is not None:
            files.append((name, filename, value))
        elif name:
            fields[name] = value.decode('utf-8')
    return fields, files


def launch_browser():
    """Context manager yielding browser + Playwright; callers own closing both."""
    playwright = sync_playwright().start()
    browser = playwright.chromium.launch()
    return playwright, browser
