"""Collecte limitée aux 1 000 modèles populaires ; cache/originaux hors dépôt.

GET séquentiels espacés de 2 s, sans retry ; arrêt sur refus.
"""
import argparse
import hashlib
import html
import json
from pathlib import Path
import re
import subprocess
import time
import urllib.request
import urllib.error
from urllib.robotparser import RobotFileParser

UA = "CreatorDeck-Importer/1.3 (personal project; public templates)"


def parse_page(source):
    cards = []
    for block in source.split('<div class="mt-box">')[1:]:
        title = re.search(r'<h3[^>]*>\s*<a[^>]*>(.*?)</a>', block, re.S)
        image = re.search(r'src="(//i\.imgflip\.com|/i-view)/(?:\d+/)?([a-z0-9]+)\.(jpg|png)"', block)
        if not title or not image:
            raise ValueError("Structure de modèle inconnue : collecte arrêtée")
        host, code, ext = image.groups()
        media_base = 'https://imgflip.com/i-view' if host == '/i-view' else 'https://i.imgflip.com'
        cards.append({"id": str(int(code, 36)), "name": html.unescape(re.sub('<[^>]+>', '', title[1])),
                      "url": f"{media_base}/{code}.{ext}", "media_type": "gif" if 'mt-animated-label' in block else "image"})
    next_page = re.search(r'class=[\"\'][^\"\']*pager-next[^\"\']*[\"\'] href=[\"\']([^\"\']+)', source)
    return cards, html.unescape(next_page[1]) if next_page else None


def parse_template_media(source):
    video = re.search(r'<source[^>]*src="(//i\.imgflip\.com/[a-z0-9]+\.mp4)"', source)
    if video:
        return 'https:' + video[1]
    image = re.search(r'<img[^>]*id="mtm-img"[^>]*src="(//i\.imgflip\.com/[a-z0-9]+\.(?:png|jpg)|/i-view/[a-z0-9]+\.(?:png|jpg))"', source)
    if not image:
        raise ValueError('Original introuvable sur la page publique')
    return ('https:' + image[1]) if image[1].startswith('//') else ('https://imgflip.com' + image[1])


def select_available(cards):
    excluded = [item for item in cards if item.get('blocked') is True]
    available = [item for item in cards if item.get('blocked') is not True]
    if len(available) != 1000:
        raise ValueError('Il faut exactement 1 000 modèles accessibles avant import')
    return [dict(item, source_rank=item['rank'], rank=index + 1) for index, item in enumerate(available)], excluded


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', required=True)
    parser.add_argument('--download', action='store_true')
    parser.add_argument('--skip-rank', type=int, help='Rang déjà refusé à exclure explicitement, sans nouvelle requête')
    parser.add_argument('--fill-missing', action='store_true', help='Remplacer le rang exclu par le suivant de la page publique déjà collectée')
    args = parser.parse_args()
    out = Path(args.output).resolve()
    root = Path(__file__).resolve().parent.parent
    if out == root or root in out.parents:
        raise ValueError('Le cache et les originaux doivent rester hors dépôt')
    out.mkdir(parents=True, exist_ok=True)
    last = 0.0

    class NoRedirect(urllib.request.HTTPRedirectHandler):
        max_redirections = 2

        def redirect_request(self, req, fp, code, msg, headers, newurl):
            # Seule la redirection canonique ID → ID/nom d'une page publique est admise.
            if re.fullmatch(r'https://imgflip\.com/memetemplate/\d+', req.full_url) and newurl.startswith(req.full_url + '/'):
                time.sleep(2)
                return super().redirect_request(req, fp, code, msg, headers, newurl)
            raise ValueError('Redirection refusée : collecte arrêtée')

    opener = urllib.request.build_opener(NoRedirect)

    def get(url, maximum=25 * 1024 * 1024):
        nonlocal last
        if not re.match(r'https://(?:imgflip\.com|api\.imgflip\.com|i\.imgflip\.com)/', url):
            raise ValueError('URL hors Imgflip')
        time.sleep(max(0, 2 - (time.monotonic() - last)))
        last = time.monotonic()
        with opener.open(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=30) as response:
            data = response.read(maximum + 1)
            if len(data) > maximum or b'cf-chl-' in data[:65536] or b'<title>Just a moment' in data[:65536]:
                raise ValueError('Taille ou page de vérification : arrêt')
            return data

    robots = RobotFileParser()
    robots.parse(get('https://imgflip.com/robots.txt').decode().splitlines())
    media_robots = RobotFileParser()
    try:
        media_rules = get('https://i.imgflip.com/robots.txt').decode().splitlines()
    except urllib.error.HTTPError as error:
        if error.code != 404:
            raise
        media_rules = []  # robots.txt absent : aucun chemin interdit, pas un refus 403.
    media_robots.parse(media_rules)
    manifest = out / 'discovery.json'
    cards, seen = [], set()

    def add(items):
        for item in items:
            if item['id'] not in seen and len(cards) < 1000:
                seen.add(item['id'])
                cards.append(dict(item, rank=len(cards) + 1))

    if manifest.exists():
        saved = json.loads(manifest.read_text(encoding='utf-8'))
        add(saved['cards'])
        visited = set(saved['pages'])
        last_page = max([int(re.search(r'page=(\d+)', page)[1]) if 'page=' in page else 1 for page in visited], default=0)
        url = f'https://imgflip.com/memetemplates?page={last_page + 1}'
    else:
        api = json.loads(get('https://api.imgflip.com/get_memes?type=image'))
        if api.get('success') is not True:
            raise ValueError('API refusée')
        add(api['data']['memes'])
        url = 'https://imgflip.com/memetemplates'
        visited = set()
    while len(cards) < 1000 and url:
        if url in visited or not robots.can_fetch(UA, url):
            raise ValueError('Boucle ou robots.txt : arrêt')
        visited.add(url)
        page_number = re.search(r'page=(\d+)', url)
        page_file = out / ('page-' + (page_number[1] if page_number else '1') + '.html')
        source = page_file.read_text(encoding='utf-8') if page_file.exists() else get(url).decode()
        page_file.write_text(source, encoding='utf-8')
        (out / 'last-page.html').write_text(source, encoding='utf-8')
        items, following = parse_page(source)
        if not items:
            raise ValueError('Page vide avant 1 000 modèles : arrêt')
        add(items)
        manifest.write_text(json.dumps({'complete': len(cards) == 1000, 'cards': cards, 'pages': sorted(visited)}, ensure_ascii=False), encoding='utf-8')
        print(f'discovery {len(cards)}/1000 {url}', flush=True)
        url = 'https://imgflip.com' + following if following and following.startswith('/memetemplates?page=') else None
    if len(cards) != 1000:
        raise ValueError('Classement incomplet : aucun bundle importable')
    print('Estimation : ~122 Mo images + GIF/MP4 selon modèles animés ; garde import de 2 Gio.', flush=True)
    if not args.download:
        return
    assets = out / 'assets'
    assets.mkdir(exist_ok=True)
    old_path = out.parent / 'imgflip-live/bundle-20261021-090456/imgflip-cards.json'
    old = {item['id']: item for item in json.loads(old_path.read_text(encoding='utf-8'))['cards']} if old_path.exists() else {}
    if args.fill_missing:
        if not args.skip_rank:
            raise ValueError('Un rang exclu explicite est requis')
        last_page = max(int(re.search(r'page=(\d+)', page)[1]) if 'page=' in page else 1 for page in visited)
        remaining, _ = parse_page((out / f'page-{last_page}.html').read_text(encoding='utf-8'))
        replacement = next((item for item in remaining if item['id'] not in seen), None)
        if replacement is None:
            raise ValueError('Modèle suivant absent du cache : arrêt sans invention')
        cards.append(dict(replacement, rank=1001))
    bundle = []
    for item in cards:
        if item['rank'] == args.skip_rank:
            blocked = dict(item, key='imgflip:' + item['id'], blocked=True, reason='HTTP 403 observé ; exclusion explicitement autorisée par Malik')
            bundle.append(blocked)
            (out / 'blocked.json').write_text(json.dumps([blocked], ensure_ascii=False), encoding='utf-8')
            print(f"media {len(bundle)}/{len(cards)} (refus conservé sans requête)", flush=True)
            continue
        previous = old.get(item['id'])
        if previous and previous['media_type'] == 'gif':
            for asset_name, digest_name in [('asset', 'sha256'), ('original_asset', 'source_sha256')]:
                data = (old_path.parent / previous[asset_name]).read_bytes()
                if hashlib.sha256(data).hexdigest() != previous[digest_name]:
                    raise ValueError('Empreinte du cache GIF invalide')
                (out / previous[asset_name]).write_bytes(data)
            bundle.append(dict(item, key='imgflip:' + item['id'], media_type='gif',
                               **{key: previous[key] for key in ['asset', 'original_asset', 'sha256', 'source_sha256']}))
            print(f'media {len(bundle)}/{len(cards)} (GIF local)', flush=True)
            continue
        rules = robots if item['url'].startswith('https://imgflip.com/') else media_robots
        if not rules.can_fetch(UA, item['url']):
            raise ValueError('Média refusé par robots.txt')
        cached = out / (item['id'] + '.source')
        if cached.exists():
            data = cached.read_bytes()
        else:
            try:
                data = get(item['url'])
            except urllib.error.HTTPError as error:
                if error.code != 404:
                    raise
                page_url = 'https://imgflip.com/memetemplate/' + item['id']
                if not robots.can_fetch(UA, page_url):
                    raise ValueError('Page modèle refusée')
                template = get(page_url).decode()
                (out / (item['id'] + '.html')).write_text(template, encoding='utf-8')
                resolved = parse_template_media(template)
                if resolved == item['url']:
                    raise ValueError('Original toujours absent : arrêt')
                rules = robots if resolved.startswith('https://imgflip.com/') else media_robots
                if not rules.can_fetch(UA, resolved):
                    raise ValueError('Original refusé')
                item['url'] = resolved
                data = get(resolved)
        video = data[4:8] == b'ftyp'
        if not (video or data.startswith(b'\xff\xd8\xff') or data.startswith(b'\x89PNG\r\n\x1a\n')):
            raise ValueError('Format image inattendu')
        cached.write_bytes(data)
        digest = hashlib.sha256(data).hexdigest()
        extension = '.mp4' if video else '.png' if data.startswith(b'\x89PNG') else '.jpg'
        asset = 'assets/' + digest + extension
        (out / asset).write_bytes(data)
        if video:
            gif = assets / (digest + '.gif')
            if not gif.exists():
                subprocess.run(['ffmpeg', '-v', 'error', '-n', '-protocol_whitelist', 'file,pipe', '-i', str(out / asset), '-filter_complex',
                                '[0:v]fps=10,scale=480:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=96[p];[b][p]paletteuse', str(gif)], check=True, timeout=180)
            gif_bytes = gif.read_bytes()
            if not gif_bytes.startswith((b'GIF87a', b'GIF89a')):
                raise ValueError('Conversion GIF incomplète')
            gif_digest = hashlib.sha256(gif_bytes).hexdigest()
            final_asset = 'assets/' + gif_digest + '.gif'
            (out / final_asset).write_bytes(gif.read_bytes())
            bundle.append(dict(item, key='imgflip:' + item['id'], media_type='gif', asset=final_asset,
                               original_asset=asset, sha256=gif_digest, source_sha256=digest))
        else:
            bundle.append(dict(item, key='imgflip:' + item['id'], media_type='image', asset=asset, original_asset=asset,
                               sha256=digest, source_sha256=digest))
        print(f'media {len(bundle)}/{len(cards)}', flush=True)
    excluded = []
    if args.fill_missing:
        bundle, excluded = select_available(bundle)
    (out / 'imgflip-cards.json').write_text(json.dumps({'schema': 'creatordeck.templates.v1', 'ranking': 'api-image-then-public-top-30-days', 'cards': bundle, 'exclusions': excluded}, ensure_ascii=False), encoding='utf-8')
    print('complete bytes', sum(p.stat().st_size for p in assets.iterdir()), flush=True)


if __name__ == '__main__':
    main()
