"""Bundles HabitFlow into one self-contained HTML file (dist/habitflow.html).

The single file has the CSS, JavaScript and app icon inlined, so it can be downloaded
and opened directly on a phone. Usage (from the project folder):

    python tools/build-standalone.py
"""
import base64
import io
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def read(path):
    with io.open(os.path.join(ROOT, path), encoding='utf-8') as f:
        return f.read()


def as_namespace(src, name):
    """Turns an ES module into `const NAME = (() => { ...; return { exports } })();`."""
    exports = re.findall(r'^export\s+(?:async\s+)?(?:function\*?|const|let|class)\s+([A-Za-z_$][\w$]*)', src, re.M)
    body = re.sub(r'^export\s+', '', src, flags=re.M)
    return f'const {name} = (() => {{\n{body}\nreturn {{ {", ".join(exports)} }};\n}})();\n'


def main():
    logic = as_namespace(read('js/logic.js'), 'L')
    store = as_namespace(read('js/store.js'), 'S')
    share = as_namespace(read('js/share.js'), 'SHARE')
    app = read('js/app.js')
    imports = re.findall(r'^import .*$', app, re.M)
    app = re.sub(r'^import .*\n', '', app, flags=re.M)
    named = re.search(r"import \{([^}]+)\} from './share.js'", '\n'.join(imports))
    share_names = f'const {{{named.group(1)}}} = SHARE;\n' if named else ''

    script = f'window.HABITFLOW_STANDALONE = true; // single file: no service worker\n(() => {{\n"use strict";\n{logic}\n{store}\n{share}\n{share_names}\n{app}\n}})();'
    if '</script' in script:
        raise SystemExit('Script contains "</script", which would break the inline bundle')

    html = read('index.html')
    css = read('css/app.css')
    icon = base64.b64encode(open(os.path.join(ROOT, 'icons', 'apple-touch-icon.png'), 'rb').read()).decode()
    icon_uri = f'data:image/png;base64,{icon}'

    html = html.replace('<link rel="stylesheet" href="css/app.css">', f'<style>\n{css}\n</style>')
    html = html.replace('<script type="module" src="js/app.js"></script>', f'<script>\n{script}\n</script>')
    html = html.replace('<link rel="manifest" href="manifest.webmanifest">\n', '')
    html = re.sub(r'href="icons/[^"]+\.png"', f'href="{icon_uri}"', html)

    out_dir = os.path.join(ROOT, 'dist')
    os.makedirs(out_dir, exist_ok=True)
    out = os.path.join(out_dir, 'habitflow.html')
    with io.open(out, 'w', encoding='utf-8', newline='\n') as f:
        f.write(html)
    print(f'Wrote {out} ({os.path.getsize(out) // 1024} KB)')


if __name__ == '__main__':
    main()
