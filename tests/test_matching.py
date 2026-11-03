import unittest
from pathlib import Path
import json
import hashlib

from app import MAX_SHORTLIST, build_gallery, rank_dogs, shortlist_can_add


class MatchingTests(unittest.TestCase):
    def test_interface_defines_all_four_lifestyle_questions(self):
        interface = Path("index.html").read_text() + Path("app.js").read_text()
        for question in ("dieren in huis", "deelt het huis", "dagelijkse activiteit", "omgeving"):
            self.assertIn(question, interface.lower())

    def test_interface_explains_the_shortlist_cap(self):
        page = Path("index.html").read_text()
        self.assertIn("10", page)
        self.assertIn("shortlist", page.lower())

    def test_profile_dialog_keeps_only_profile_and_adoption_actions(self):
        page = Path("index.html").read_text().lower()
        interface = Path("app.js").read_text()
        self.assertNotIn('id="info-link"', page)
        self.assertNotIn("mailto:dogsoaj@gmail.com", interface)
        self.assertIn('id="profile-link"', page)
        self.assertIn('id="apply-link"', page)

    def test_interface_uses_the_reference_brand_palette(self):
        styles = Path("styles.css").read_text().lower()
        for color in ("#17261f", "#f8f5ee", "#e36d58"):
            self.assertIn(color, styles)

    def test_each_dog_has_an_explicit_card_focal_point(self):
        from app import CARD_FOCUS, DOGS

        self.assertEqual(set(CARD_FOCUS), {dog["id"] for dog in DOGS})
        self.assertTrue(all(dog["cardFocus"].endswith("%") for dog in DOGS))

    def test_affected_portrait_photos_have_verified_face_framing(self):
        from app import CARD_FOCUS

        self.assertEqual(
            {identifier: CARD_FOCUS[identifier] for identifier in ("azra", "beanie", "cara", "chewy", "molly", "soul")},
            {"azra": "center 23%", "beanie": "center 0%", "cara": "center 18%", "chewy": "center 8%", "molly": "center 12%", "soul": "center 8%"},
        )

    def test_profile_images_are_selected_from_raw_photo_folders(self):
        sources = json.loads(Path("assets/sources.json").read_text())
        self.assertEqual(len(sources), 16)
        self.assertTrue(all("/Collages/" not in path for path in sources.values()))

    def test_gallery_contains_raw_photos_for_all_dogs_without_collages(self):
        gallery = build_gallery()
        self.assertEqual(set(gallery), {dog["id"] for dog in __import__("app").DOGS})
        self.assertTrue(all("/Collages/" not in item["source"] for images in gallery.values() for item in images))

    def test_curation_page_invites_the_editor_to_choose_a_profile_photo(self):
        page = Path("curate.html").read_text().lower()
        self.assertIn("choose profile photo", page)

    def test_live_assets_match_each_editor_photo_selection(self):
        selections = json.loads(Path("assets/profile-photo-selections.json").read_text())
        self.assertEqual(len(selections), 16)
        for identifier, source in selections.items():
            chosen = Path(source).read_bytes()
            live_asset = Path("assets") / f"{identifier}.jpg"
            self.assertEqual(hashlib.sha256(live_asset.read_bytes()).digest(), hashlib.sha256(chosen).digest())

    def test_excludes_a_dog_marked_not_compatible_with_resident_cats(self):
        dogs = [
            {"id": "cat-friendly", "catCompatibility": "yes", "dogCompatibility": "unknown", "childCompatibility": "unknown", "energy": "medium", "environment": ["quiet", "lively"]},
            {"id": "no-cats", "catCompatibility": "no", "dogCompatibility": "unknown", "childCompatibility": "unknown", "energy": "medium", "environment": ["quiet", "lively"]},
        ]

        result = rank_dogs(dogs, {"animals": "cats", "children": "unknown", "activity": "balanced", "environment": "quiet"})

        self.assertEqual([dog["id"] for dog in result], ["cat-friendly"])

    def test_keeps_unknown_compatibility_as_ask_us(self):
        dogs = [{"id": "unknown-cats", "catCompatibility": "unknown", "dogCompatibility": "unknown", "childCompatibility": "unknown", "energy": "medium", "environment": ["quiet"]}]

        result = rank_dogs(dogs, {"animals": "cats", "children": "unknown", "activity": "balanced", "environment": "quiet"})

        self.assertEqual(result[0]["matchStatus"], "ask-us")

    def test_stops_a_shortlist_at_ten_dogs(self):
        self.assertTrue(shortlist_can_add(list(range(MAX_SHORTLIST - 1))))
        self.assertFalse(shortlist_can_add(list(range(MAX_SHORTLIST))))


if __name__ == "__main__":
    unittest.main()
