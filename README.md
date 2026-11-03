# Dogs on a Journey Match MVP

Static dog-discovery MVP for the 16 dossier-backed dogs in `Shyam`.

The main experience is deployment-ready for GitHub Pages: it runs entirely in the browser using `dogs-data.js` and local image assets.

## Run locally

```bash
cd "/Users/anshulgoyal/Desktop/AI Builder course/Projects/RescueAI/Code/dogs-on-a-journey-match"
python3 app.py
```

Then open http://127.0.0.1:8000. For GitHub Pages, open `index.html` through the published site.

## Verify

```bash
python3 -m unittest tests/test_matching.py -v
```

The MVP intentionally has no external integration. It uses local images and a static, dossier-derived data set; official dog-profile links are retained for fuller information and adoption requests.
