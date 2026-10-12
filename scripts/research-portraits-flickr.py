"""Recherche Flickr CC commerciale, reprenable, sans publication automatique."""
import argparse
import concurrent.futures
import json
import pathlib
import re
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--output', default='reports/portrait-research')
parser.add_argument('--limit', type=int, default=1000)
options = parser.parse_args()
root = pathlib.Path(options.output).resolve()
(root / 'flickr').mkdir(parents=True, exist_ok=True)
creators = json.loads(pathlib.Path('src/data/creators.json').read_text())
excluded = json.loads(pathlib.Path('src/data/portrait-overrides.json').read_text())
licences = {
    4: ('CC BY 2.0', 'https://creativecommons.org/licenses/by/2.0/'),
    5: ('CC BY-SA 2.0', 'https://creativecommons.org/licenses/by-sa/2.0/'),
    6: ('CC BY-ND 2.0', 'https://creativecommons.org/licenses/by-nd/2.0/'),
    9: ('CC0', 'https://creativecommons.org/publicdomain/zero/1.0/'),
    10: ('Public domain mark', 'https://creativecommons.org/publicdomain/mark/1.0/'),
}
# BY-ND est exclue : le cadrage nécessaire créerait une adaptation.
aliases = {'kaicenat': 'Kai Cenat', 'adinross': 'Adin Ross', 'rivers-gg': 'Samy Rivera',
           'bobross': 'Bob Ross', 'karljacobs': 'Karl Jacobs', 'ludwig': 'Ludwig Ahgren',
           'ninja': 'Tyler Blevins', 'faker': 'Faker League of Legends',
           's1mple': 's1mple esports', 'tarik': 'tarik esports',
           'buster': 'buster streamer', 'dream': 'Dream Minecraft',
           'domingo': 'Domingo streamer', 'michou': 'Michou YouTube',
           'etoiles': 'Etoiles streamer', 'samueletienne': 'Samuel Etienne',
           'hugodecrypte': 'Hugo Travers', 'jeanmassiet': 'Jean Massiet',
           'locklear': 'Locklear streamer', 'ponce': 'Ponce streamer'}


def unwrap(data, export):
    if isinstance(data, str) and data.startswith('~'):
        current = export['main']
        for key in export['legend'][int(data[1:])]:
            current = current[int(key)] if isinstance(current, list) else current[key]
        return current
    return data


def search(creator):
    dest = root / 'flickr' / (creator['slug'] + '.json')
    if dest.exists() and json.loads(dest.read_text()).get('state') == 'searched':
        return creator['slug'], 'cached', 0
    query = aliases.get(creator['slug'], creator['displayName'].replace('_', ' ').strip())
    url = 'https://www.flickr.com/search/?' + urllib.parse.urlencode({'text': query, 'license': '4,5,9,10'})
    result = {'slug': creator['slug'], 'name': creator['displayName'], 'rank': creator['rank'],
              'query': query, 'source': url, 'queriedAt': datetime.now(timezone.utc).isoformat(),
              'state': 'searched', 'candidates': []}
    try:
        request = urllib.request.Request(url, headers={'User-Agent': 'CreatorDeck portrait research'})
        with urllib.request.urlopen(request, timeout=30) as response:
            html = response.read().decode('utf-8')
        marker = 'modelExport: '
        data = json.JSONDecoder().raw_decode(html[html.index(marker) + len(marker):])[0]
        models = data['main'].get('search-photos-lite-models', [])
        if not models:
            if not re.search('There are no matches', html):
                raise ValueError('Résultats Flickr non exportés et absence de résultat non confirmée')
            photos = {'totalItems': 0, '_data': []}
        else:
            photos = models[0]['data']['photos']['data']
        result['totalItems'] = photos['totalItems']
        result['limitedTo'] = len(photos['_data'])
        for item in photos['_data'][:24]:
            photo = unwrap(item['data'], data)
            if not isinstance(photo, dict):
                continue
            sizes = photo.get('sizes', {}).get('data', {})
            decoded = [unwrap(size['data'], data) for size in sizes.values()]
            decoded = [size for size in decoded if isinstance(size, dict)]
            if not decoded:
                continue
            largest = max(decoded, key=lambda size: size.get('width', 0) * size.get('height', 0))
            code = photo.get('license')
            licence, licence_url = licences.get(code, ('non établie', ''))
            direct = largest.get('url', largest.get('displayUrl', ''))
            if direct.startswith('//'):
                direct = 'https:' + direct
            result['candidates'].append({
                'id': photo['id'], 'title': photo.get('title', ''),
                'description': photo.get('description', ''),
                'author': photo.get('realname') or photo.get('username', ''),
                'uploader': photo.get('username', ''), 'ownerNsid': photo.get('ownerNsid', ''),
                'source': 'https://www.flickr.com/photos/' + photo['ownerNsid'] + '/' + photo['id'] + '/',
                'original': direct, 'width': largest.get('width'), 'height': largest.get('height'),
                'license': licence, 'licenseUrl': licence_url, 'licenceCode': code,
                'identity': 'à vérifier individuellement', 'visual': 'non examinée',
                'isOriginal': 'o' in sizes,
                'eligible': code in (4, 5, 9, 10) and min(largest.get('width', 0), largest.get('height', 0)) >= 900,
            })
    except Exception as error:
        result.update(state='error', error=str(error))
    temp = dest.with_suffix('.tmp')
    temp.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    temp.replace(dest)
    time.sleep(0.7)
    return creator['slug'], result['state'], len(result['candidates'])


queue = sorted([creator for creator in creators if creator['slug'] not in excluded], key=lambda creator: creator['rank'])[:options.limit]
errors = 0
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
    for count, (slug, state, candidates) in enumerate(executor.map(search, queue), start=1):
        if state == 'error':
            errors += 1
            print(slug, 'erreur', flush=True)
        if count % 25 == 0 or count == len(queue):
            print(f'Flickr {count}/{len(queue)}, erreurs {errors}', flush=True)
print(json.dumps({'total': len(queue), 'errors': errors, 'output': str(root)}))
raise SystemExit(1 if errors else 0)
