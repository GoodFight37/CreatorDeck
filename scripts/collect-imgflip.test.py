import importlib.util
from pathlib import Path
import unittest
import sys

sys.dont_write_bytecode = True

spec = importlib.util.spec_from_file_location('collector', Path(__file__).with_name('collect-imgflip.py'))
collector = importlib.util.module_from_spec(spec)
spec.loader.exec_module(collector)


class PaginationTest(unittest.TestCase):
    def test_public_page(self):
        cards, following = collector.parse_page('<div class="mt-box"><h3><a href="/meme/test">A &amp; B</a></h3><img src="//i.imgflip.com/4/1bij.jpg"/><a class="pager-next l but" href="/memetemplates?page=2">Next</a>')
        self.assertEqual(cards[0]['id'], '61579')
        self.assertEqual(cards[0]['name'], 'A & B')
        self.assertEqual(cards[0]['url'], 'https://i.imgflip.com/1bij.jpg')
        self.assertEqual(following, '/memetemplates?page=2')

    def test_final_page_and_unknown_markup(self):
        self.assertEqual(collector.parse_page('fin'), ([], None))
        with self.assertRaises(ValueError):
            collector.parse_page('<div class="mt-box">structure inconnue')

    def test_full_size_and_proxy_images(self):
        for source, expected in [('//i.imgflip.com/1bij.png', 'https://i.imgflip.com/1bij.png'), ('/i-view/4/1bij.jpg', 'https://imgflip.com/i-view/1bij.jpg')]:
            cards, _ = collector.parse_page(f'<div class="mt-box"><h3><a>Template</a></h3><img src="{source}"/>')
            self.assertEqual(cards[0]['url'], expected)

    def test_original_from_public_template_not_extension_guessing(self):
        self.assertEqual(collector.parse_template_media('<img id="mtm-img" src="//i.imgflip.com/44eggm.png"/>'), 'https://i.imgflip.com/44eggm.png')
        with self.assertRaises(ValueError):
            collector.parse_template_media('<img id="mtm-img" src="https://outside.invalid/image.png"/>')

    def test_animated_templates_keep_their_video_source(self):
        cards, _ = collector.parse_page('<div class="mt-box"><h3><a>GIF</a></h3><img src="//i.imgflip.com/2/3ohapu.jpg"/><div class="mt-animated-label">animated</div>')
        self.assertEqual(cards[0]['media_type'], 'gif')
        self.assertEqual(collector.parse_template_media('<source src="//i.imgflip.com/3ohapu.mp4" type="video/mp4">'), 'https://i.imgflip.com/3ohapu.mp4')

    def test_replacement_keeps_source_rank_and_exactly_1000_available(self):
        cards = [{'rank': rank, 'blocked': rank == 277} for rank in range(1, 1002)]
        selected, excluded = collector.select_available(cards)
        self.assertEqual(len(selected), 1000)
        self.assertEqual(selected[276], {'rank': 277, 'source_rank': 278, 'blocked': False})
        self.assertEqual(selected[-1]['source_rank'], 1001)
        self.assertEqual(excluded[0]['rank'], 277)
        with self.assertRaises(ValueError):
            collector.select_available(cards[:-1])


if __name__ == '__main__':
    unittest.main()
