"""Détection/cadrage local non génératif ; sorties uniquement dans le dossier du pilote."""
import argparse
import hashlib
import io
import ipaddress
import json
import math
import pathlib
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
import numpy as np
import cv2
import mediapipe as mp
from PIL import Image, ImageOps

Image.MAX_IMAGE_PIXELS = 40_000_000
MAX_BYTES = 20 * 1024 * 1024


def checked_url(value):
    url = urllib.parse.urlsplit(value)
    if url.scheme != "https" or url.username or url.password or url.port not in (None, 443):
        raise ValueError("Adresse HTTPS publique requise")
    host = (url.hostname or "").lower()
    if not host or host == "localhost" or host.endswith((".localhost", ".local", ".internal")):
        raise ValueError("Adresse locale refusée")
    try:
        if not ipaddress.ip_address(host).is_global:
            raise ValueError("Adresse privée refusée")
    except ValueError as error:
        if str(error) == "Adresse privée refusée":
            raise
    return value


class CheckedRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        checked_url(newurl)
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def download(url):
    checked_url(url)
    request = urllib.request.Request(url, headers={"User-Agent": "CreatorDeckPortraitPilot/1.0"})
    with urllib.request.build_opener(CheckedRedirect()).open(request, timeout=20) as response:
        if not response.headers.get("Content-Type", "").lower().startswith("image/"):
            raise ValueError("Réponse non image")
        data = response.read(MAX_BYTES + 1)
        if len(data) > MAX_BYTES:
            raise ValueError("Image supérieure à 20 Mio")
        return data


def face_crop(width, height, box):
    # Assez de marge pour le haut du crâne et les épaules, sans agrandissement.
    size = min(width, height, int(math.ceil(max(box.width * 2.3, box.height * 2.1))))
    left = min(max(0, round(box.origin_x + box.width / 2 - size / 2)), width - size)
    top = min(max(0, round(box.origin_y + box.height * .60 - size / 2)), height - size)
    return [left, top, size]


def difference_hash(image):
    grey = np.asarray(ImageOps.fit(image.convert("L"), (9, 8)))
    return grey[:, 1:] > grey[:, :-1]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--jobs")
    parser.add_argument("--output")
    parser.add_argument("--model", required=True)
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--retry-downloads", action="store_true")
    args = parser.parse_args()
    detector_options = mp.tasks.vision.FaceDetectorOptions(
        base_options=mp.tasks.BaseOptions(model_asset_path=args.model, delegate=mp.tasks.BaseOptions.Delegate.CPU),
        min_detection_confidence=.65,
    )
    if args.check:
        with mp.tasks.vision.FaceDetector.create_from_options(detector_options):
            print("Détecteur local prêt ; aucune recherche envoyée")
        return
    if not args.jobs or not args.output:
        parser.error("--jobs et --output requis pour analyser")
    output = pathlib.Path(args.output)
    (output / "images").mkdir(parents=True, exist_ok=True)
    (output / "originals").mkdir(exist_ok=True)
    jobs = json.loads(pathlib.Path(args.jobs).read_text())
    jobs["detector"] = {"model": "BlazeFace short range", "delegate": "CPU",
                        "modelSha256": hashlib.sha256(pathlib.Path(args.model).read_bytes()).hexdigest(),
                        "mediapipe": mp.__version__, "opencv": cv2.__version__, "numpy": np.__version__}
    cross_creator = {}
    # Téléchargements bornés en parallèle ; le détecteur reste utilisé séquentiellement.
    def prefetch(creator, candidate):
        filename = creator["slug"] + "-" + candidate["id"]
        cached = output / "originals" / filename
        failed = output / "originals" / (filename + ".failure.json")
        if cached.exists():
            return
        if failed.exists() and not args.retry_downloads:
            candidate["downloadFailure"] = json.loads(failed.read_text())["error"]
            return
        try:
            cached.write_bytes(download(candidate["original"]))
            if failed.exists():
                failed.unlink()
        except Exception as error:
            reason = type(error).__name__ + (" HTTP " + str(error.code) if hasattr(error, "code") else "")
            candidate["downloadFailure"] = reason
            failed.write_text(json.dumps({"error": reason}))
    pairs = [(creator, candidate) for creator in jobs["creators"] for candidate in creator["candidates"]]
    print("Téléchargement borné de " + str(len(pairs)) + " candidates", flush=True)
    with ThreadPoolExecutor(max_workers=4) as pool:
        list(pool.map(lambda pair: prefetch(*pair), pairs))
    with mp.tasks.vision.FaceDetector.create_from_options(detector_options) as detector:
        for creator in jobs["creators"]:
            slug = creator["slug"]
            avatar = Image.open(creator.pop("avatar"))
            current_hash = difference_hash(avatar)
            avatar.thumbnail((450, 450))
            before = "images/" + slug + "-before.webp"
            avatar.save(output / before, "WEBP", quality=85)
            creator["before"] = before
            for candidate in creator["candidates"]:
                candidate["reasons"] = []
                candidate["reviewable"] = False
                candidate["downloaded"] = False
                candidate["analyzed"] = False
                filename = slug + "-" + candidate["id"]
                cached = output / "originals" / filename
                try:
                    if not cached.exists():
                        raise ValueError(candidate.get("downloadFailure", "Fichier non téléchargé"))
                    data = cached.read_bytes()
                    candidate["downloaded"] = True
                    candidate["sha256"] = hashlib.sha256(data).hexdigest()
                    original = ImageOps.exif_transpose(Image.open(io.BytesIO(data))).convert("RGB")
                    width, height = original.size
                    candidate["dimensions"] = [width, height]
                    distance = int(np.count_nonzero(difference_hash(original) != current_hash))
                    candidate["currentImageDistance"] = distance
                    candidate["sameAsCurrent"] = distance <= 3
                    if candidate["sameAsCurrent"]:
                        candidate["reasons"].append("Image très similaire à l’actuelle : aucune nouvelle photo proposée")
                    sample = original.copy()
                    sample.thumbnail((1800, 1800))
                    detection = detector.detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=np.asarray(sample)))
                    faces = detection.detections
                    candidate["analyzed"] = True
                    candidate["faceCount"] = len(faces)
                    if len(faces) != 1:
                        candidate["reasons"].append("Aucun visage détecté" if not faces else "Plusieurs visages : personne à choisir")
                        size = min(width, height)
                        crop = [(width - size) // 2, (height - size) // 2, size]
                    else:
                        box = faces[0].bounding_box
                        scale = width / sample.width
                        class Box:
                            origin_x = box.origin_x * scale
                            origin_y = box.origin_y * scale
                            width = box.width * scale
                            height = box.height * scale
                        crop = face_crop(width, height, Box)
                        candidate["detectionConfidence"] = round(faces[0].categories[0].score, 4)
                    left, top, size = crop
                    candidate["crop"] = {"left": left, "top": top, "size": size}
                    if size < 450:
                        candidate["reasons"].append("Cadrage inférieur à 450 px : détail insuffisant")
                    if size < 600:
                        candidate["reasons"].append("Cadrage inférieur à l’avatar 600 px : examiner la netteté")
                    cut = original.crop((left, top, left + size, top + size))
                    cut.thumbnail((900, 900))
                    out = "images/" + filename + ".webp"
                    cut.save(output / out, "WEBP", quality=85)
                    candidate["preview"] = out
                    grey = cv2.cvtColor(np.asarray(cut), cv2.COLOR_RGB2GRAY)
                    candidate["sharpnessIndicator"] = round(float(cv2.Laplacian(grey, cv2.CV_64F).var()), 2)
                    # La netteté n'est pas un seuil universel : logos et dessins faussent ce score.
                    # L’automatisation prépare une comparaison visuelle ; elle ne
                    # décide ni de l’identité ni de la qualité à la place du joueur.
                    # Une photo décodée différente reste sélectionnable même si le
                    # moteur n’a pas trouvé le nom dans son titre ou ne détecte pas
                    # un visage (logos d’équipes, avatars illustrés, etc.).
                    candidate["reviewable"] = not candidate["sameAsCurrent"]
                    candidate["technicalScore"] = candidate["nameScore"] + min(size / 30, 30)
                    cross_creator.setdefault(candidate["sha256"], set()).add(slug)
                except Exception as error:
                    # Ne pas exposer les URL (qui pourraient contenir des tokens) dans les journaux.
                    candidate["error"] = type(error).__name__
                    reason = candidate.get("downloadFailure", type(error).__name__)
                    candidate["reasons"].append("Téléchargement ou décodage impossible (" + reason + ")")
            print(slug + " : analyse terminée", flush=True)
    for creator in jobs["creators"]:
        for candidate in creator["candidates"]:
            if len(cross_creator.get(candidate.get("sha256"), set())) > 1:
                candidate["reasons"].append("Image identique proposée pour plusieurs créateurs")
        eligible = sorted([c for c in creator["candidates"] if c["reviewable"]],
                          key=lambda c: c["technicalScore"], reverse=True)
        creator["proposal"] = eligible[0]["id"] if eligible else None
    (output / "analysis.json").write_text(json.dumps(jobs, ensure_ascii=False, indent=2) + "\n")


if __name__ == "__main__":
    main()
