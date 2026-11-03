"""Local MVP server and deterministic match ranking for Dogs on a Journey."""

from __future__ import annotations

import json
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse


MAX_SHORTLIST = 10
ROOT = Path(__file__).parent

# Portrait source images are displayed in a wide card. These focal points were
# visually reviewed against the card aspect ratio so each dog remains in frame.
CARD_FOCUS = {
    "azra": "center 23%", "beanie": "center 0%", "belka": "center 50%",
    "benji": "center 45%", "blake": "center 18%", "cara": "center 18%",
    "chap": "center 37%", "chewy": "center 8%", "cinnamon": "center 20%",
    "claude": "center 40%", "elliot": "center 28%", "hughie": "center 32%",
    "izzy": "center 45%", "molly": "center 12%", "shaggie": "center 28%",
    "soul": "center 8%",
}


def dog(
    identifier, name, country, url, sex, age, size, image, *, dogs="unknown", cats="unknown",
    children="unknown", energy="unknown", environment=(), note=""
):
    return {
        "id": identifier, "name": name, "country": country, "profileUrl": url, "sex": sex,
        "age": age, "size": size, "image": image, "dogCompatibility": dogs,
        "catCompatibility": cats, "childCompatibility": children, "energy": energy,
        "environment": list(environment), "note": note, "cardFocus": CARD_FOCUS[identifier],
    }


# Every attribute below is taken from the supplied dossier; unknown means the dossier did not confirm it.
DOGS = [
    dog("azra", "Azra", "Noord-Macedonië", "https://www.dogsonajourney.com/honden/azra-1506/", "Teef", "Pup · geboren rond mei 2026", "Middelgroot · verwacht max. 17 kg", "assets/azra.jpg", dogs="yes", cats="yes", energy="high", note="Speels en voergemotiveerd; verwacht middelgroot."),
    dog("beanie", "Beanie", "Noord-Macedonië", "https://www.dogsonajourney.com/honden/beanie-1388/", "Teef", "Pup · geboren 24 april 2026", "Klein · verwachting", "assets/beanie.jpg", dogs="yes", energy="high", note="Speels, energiek en dol op mensen en knuffelen."),
    dog("belka", "Belka", "Noord-Macedonië", "https://www.dogsonajourney.com/honden/belka-1409/", "Teef", "Volwassen · geboren rond 2023", "Middelgroot · 17–18 kg", "assets/belka.jpg", dogs="yes", cats="yes", environment=("lively",), note="Sociaal met honden en katten; medische informatie staat op haar profiel."),
    dog("benji", "Benji", "Roemenië", "https://www.dogsonajourney.com/honden/benji-1387/", "Reu", "Pup · geboren 1 maart 2026", "Middelgroot · verwachting", "assets/benji.jpg", dogs="yes", cats="yes", children="yes", energy="high", note="Actieve pup die training, avontuur en geduld nodig heeft."),
    dog("blake", "Blake", "Roemenië", "https://www.dogsonajourney.com/hond/Blake/", "Reu", "Volwassen · geboren rond 2023", "Middelgroot · ca. 50 cm", "assets/blake.jpg", dogs="yes", cats="yes", energy="low", note="Zelfverzekerd, nieuwsgierig en geen hond met heel veel energie."),
    dog("cara", "Cara", "Roemenië", "https://www.dogsonajourney.com/hond/Cara/", "Teef", "Jong · geboren 27 april 2023", "Groot · volgroeid", "assets/cara.jpg", dogs="yes", cats="yes", children="yes", note="Heeft een ervaren, geduldige adopter nodig voor socialisatie en training."),
    dog("chap", "Chap", "Noord-Macedonië", "https://www.dogsonajourney.com/honden/chap-1480/", "Reu", "Jong · geboren rond begin 2025", "Middelgroot · 18 kg", "assets/chap.jpg", dogs="yes", energy="medium", note="Sociaal met honden en mensen; voergemotiveerd en gebruikt graag zijn neus."),
    dog("chewy", "Chewy", "Noord-Macedonië", "https://www.dogsonajourney.com/hond/Chewy-2/", "Reu", "Jong · geboren herfst 2023", "Middelgroot", "assets/chewy.jpg", dogs="no", cats="no", environment=("quiet",), note="Plaatsing als enig dier in het huishouden; gezondheidsinformatie staat op zijn profiel."),
    dog("cinnamon", "Cinnamon", "Noord-Macedonië", "https://www.dogsonajourney.com/honden/cinnamon-1362/", "Teef", "Jong · geboren oktober 2025", "Kleine middelmaat · 8 kg / 40 cm", "assets/cinnamon.jpg", dogs="yes", energy="medium", note="Positief, sociaal met honden en leert aan de lijn lopen."),
    dog("claude", "Claude", "Noord-Macedonië", "https://www.dogsonajourney.com/hond/Claude/", "Reu", "Volwassen · geboren rond 2022", "Kleine middelmaat · ca. 12 kg", "assets/claude.jpg", dogs="yes", note="Sociaal met honden; medische informatie en plaatsingsadvies staan op zijn profiel."),
    dog("elliot", "Elliot", "Noord-Macedonië", "https://www.dogsonajourney.com/hond/Elliot/", "Reu", "Jong · geboren begin april 2025", "Middelgroot · 19 kg / 52 cm", "assets/elliot.jpg", dogs="yes", environment=("quiet",), note="Sociaal met honden; heeft tijd, geduld en een rustige omgeving nodig."),
    dog("hughie", "Hughie", "Noord-Macedonië", "https://www.dogsonajourney.com/hond/Hughie/", "Reu", "Jong · geboren rond mei–juni 2024", "Middelgroot · verwacht max. 20 kg", "assets/hughie.jpg", dogs="yes", cats="yes", children="yes", note="Goed met honden, katten en kinderen volgens zijn dossier."),
    dog("izzy", "Izzy", "Noord-Macedonië", "https://www.dogsonajourney.com/honden/izzy-1445/", "Teef", "Pup · geboren rond juni 2026", "Middelgroot · verwacht 15–20 kg", "assets/izzy.jpg", dogs="yes", cats="yes", energy="high", note="Speels en knuffelig; wil graag een honden- of kattenmaatje."),
    dog("molly", "Molly", "Roemenië", "https://www.dogsonajourney.com/honden/molly-1498/", "Teef", "Volwassen · geboren rond 2023", "Middelgroot · 28 kg / 50 cm", "assets/molly.jpg", dogs="yes", cats="yes", environment=("quiet",), note="Sociaal met honden en katten; heeft rust, geduld en tijd nodig om te wennen."),
    dog("shaggie", "Shaggie", "Roemenië", "https://www.dogsonajourney.com/honden/shaggie-1499/", "Teef", "Volwassen · geboren 2024", "Middelgroot · 28 kg / 50 cm", "assets/shaggie.jpg", dogs="yes", cats="yes", energy="high", note="Vrolijk, sociaal en speels; medische informatie staat op haar profiel."),
    dog("soul", "Soul", "Noord-Macedonië", "https://www.dogsonajourney.com/honden/soul-1428/", "Teef", "Senior · geboren rond 2016", "Middelgroot · 17 kg", "assets/soul.jpg", dogs="yes", cats="yes", energy="low", note="Kalm en rustig; sociaal met honden en katten en loopt goed aan de lijn."),
]


def build_gallery():
    """Index original raw photos only; collages never appear in the curator."""
    sources = json.loads((ROOT / "assets" / "sources.json").read_text())
    gallery = {}
    for identifier, source in sources.items():
        photo_dir = Path(source).parent
        files = sorted(
            path for path in photo_dir.rglob("*")
            if path.is_file() and path.suffix.lower() in {".jpg", ".jpeg", ".png"}
        )
        gallery[identifier] = [
            {"id": f"{identifier}:{index}", "source": str(path), "name": path.name}
            for index, path in enumerate(files)
        ]
    return gallery


GALLERY = build_gallery()


def shortlist_can_add(shortlist):
    return len(shortlist) < MAX_SHORTLIST


def _required_compatibility(answer, compatible):
    if answer == "none" or answer == "unknown":
        return True
    return compatible != "no"


def rank_dogs(dogs, answers):
    """Filter documented incompatibilities and rank dossier-backed matches first."""
    ranked = []
    animal_answer = answers.get("animals", "unknown")
    child_answer = answers.get("children", "unknown")
    for source in dogs:
        if animal_answer in ("dogs", "both") and not _required_compatibility(animal_answer, source.get("dogCompatibility", "unknown")):
            continue
        if animal_answer in ("cats", "both") and not _required_compatibility(animal_answer, source.get("catCompatibility", "unknown")):
            continue
        if child_answer == "children" and source.get("childCompatibility", "unknown") == "no":
            continue

        item = dict(source)
        score, unknown = 0, False
        for requested, field in (("dogs", "dogCompatibility"), ("cats", "catCompatibility")):
            if animal_answer in (requested, "both"):
                value = item.get(field, "unknown")
                score += 3 if value == "yes" else 0
                unknown = unknown or value == "unknown"
        if child_answer == "children":
            value = item.get("childCompatibility", "unknown")
            score += 3 if value == "yes" else 0
            unknown = unknown or value == "unknown"
        activity = answers.get("activity", "unknown")
        if activity != "unknown":
            energy = item.get("energy", "unknown")
            score += 2 if energy == activity else 0
            unknown = unknown or energy == "unknown"
        environment = answers.get("environment", "unknown")
        if environment != "unknown":
            values = item.get("environment", [])
            score += 2 if environment in values else 0
            unknown = unknown or not values
        item["matchStatus"] = "ask-us" if unknown else "documented-match"
        item["matchScore"] = score
        ranked.append(item)
    return sorted(ranked, key=lambda item: (-item["matchScore"], item.get("name", item["id"])))


class MatchHandler(SimpleHTTPRequestHandler):
    def _json(self, data, status=200):
        body = json.dumps(data).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        url = urlparse(self.path)
        if url.path == "/api/dogs":
            answers = {key: values[0] for key, values in parse_qs(url.query).items()}
            self._json(rank_dogs(DOGS, answers))
            return
        if url.path == "/api/gallery":
            self._json({
                identifier: [{"id": item["id"], "name": item["name"], "url": f"/api/gallery/image/{item['id']}"} for item in items]
                for identifier, items in GALLERY.items()
            })
            return
        if url.path.startswith("/api/gallery/image/"):
            image_id = unquote(url.path.removeprefix("/api/gallery/image/"))
            try:
                identifier, position = image_id.rsplit(":", 1)
                image = GALLERY[identifier][int(position)]
            except (KeyError, ValueError, IndexError):
                self.send_error(404)
                return
            self.send_response(200)
            self.send_header("Content-Type", "image/jpeg")
            self.send_header("Cache-Control", "public, max-age=3600")
            self.end_headers()
            self.wfile.write(Path(image["source"]).read_bytes())
            return
        return super().do_GET()

    def do_POST(self):
        if urlparse(self.path).path != "/api/profile-photo-selection":
            self.send_error(404)
            return
        try:
            data = json.loads(self.rfile.read(int(self.headers.get("Content-Length", 0))))
            identifier = data["dogId"]
            image_id = data["imageId"]
            selected = next(item for item in GALLERY[identifier] if item["id"] == image_id)
        except (KeyError, StopIteration, ValueError, json.JSONDecodeError):
            self._json({"error": "Unknown dog or photo"}, 400)
            return
        target = ROOT / "assets" / "profile-photo-selections.json"
        selections = json.loads(target.read_text()) if target.exists() else {}
        selections[identifier] = selected["source"]
        target.write_text(json.dumps(selections, indent=2) + "\n")
        self._json({"ok": True, "selection": selections[identifier]})


if __name__ == "__main__":
    server = ThreadingHTTPServer(("127.0.0.1", 8000), MatchHandler)
    print("Dogs on a Journey Match is running at http://127.0.0.1:8000")
    server.serve_forever()
