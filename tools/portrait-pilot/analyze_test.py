import unittest
from PIL import Image
import numpy as np
from analyze import checked_url, difference_hash, face_crop


class AnalysisTests(unittest.TestCase):
    def test_local_and_credential_urls_are_rejected(self):
        for value in ["http://example.com/image.jpg", "https://localhost/image.jpg",
                      "https://192.168.1.1/image.jpg", "https://127.0.0.1/image.jpg",
                      "https://example.local/image.jpg", "https://user:secret@example.com/image.jpg"]:
            with self.subTest(url=value), self.assertRaises(ValueError):
                checked_url(value)
        self.assertEqual(checked_url("https://example.com/photo.jpg"), "https://example.com/photo.jpg")

    def test_face_near_border_is_kept_inside_the_image(self):
        class Box:
            origin_x = 920
            origin_y = 5
            width = 70
            height = 90
        x, y, size = face_crop(1000, 600, Box)
        self.assertGreaterEqual(x, 0)
        self.assertGreaterEqual(y, 0)
        self.assertLessEqual(x + size, 1000)
        self.assertLessEqual(y + size, 600)
        self.assertLessEqual(x, Box.origin_x)
        self.assertGreaterEqual(x + size, Box.origin_x + Box.width)

    def test_reencoded_image_is_not_treated_as_a_new_portrait(self):
        values = np.tile(np.arange(900, dtype=np.uint8), (900, 1))
        source = Image.fromarray(values)
        resized = source.resize((600, 600))
        self.assertLessEqual(np.count_nonzero(difference_hash(source) != difference_hash(resized)), 3)


if __name__ == "__main__":
    unittest.main()
