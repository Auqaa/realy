import json
import os
import re
import secrets
import threading
import urllib.error
import urllib.request
from datetime import datetime
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent
SITE_DIR = ROOT / "site"
DB_PATH = ROOT / "backend" / "data" / "db.json"

TWOGIS_KEY = os.environ.get("TWOGIS_KEY", "67d20ce5-f5ec-42a0-85a6-c17ce759809b")
ROUTING_URL = f"https://routing.api.2gis.com/carrouting/6.0.0/global?key={TWOGIS_KEY}"

CURRENT_SCHEMA_VERSION = 2


def _now_iso() -> str:
    return datetime.utcnow().isoformat() + "Z"


def _read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def _write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def _normalize_phone(raw: str | None) -> str:
    if not raw:
        return ""
    s = re.sub(r"\D", "", raw.strip())
    if s.startswith("8") and len(s) == 11:
        s = "7" + s[1:]
    if s.startswith("7") and len(s) == 11:
        return "+" + s
    if len(s) == 10:
        return "+7" + s
    return ""


def _seed_db() -> dict:
    def make_id() -> str:
        return secrets.token_hex(12)

    kremlin_text = (
        "Рязанский кремль — сердце древнего Переяславля-Рязанского, основанного в 1095 году. "
        "Крепость стояла на высоком холме между реками Трубеж и Лыбедь. В XIII веке после разорения Старой Рязани "
        "город стал столицей княжества. Сегодня от оборонительных стен сохранился земляной вал, а главное украшение "
        "ансамбля — Успенский собор (конец XVII века) и 83-метровая колокольня. С 1923 года здесь работает музей-заповедник."
    )

    points = [
        {
            "_id": make_id(),
            "name": "Рязанский историко-архитектурный музей-заповедник",
            "address": "пл. Кремль, д. 15",
            "description": "Музей-заповедник на территории Рязанского кремля.",
            "lat": 54.63545,
            "lng": 39.74485,
            "qrCodeValue": "rq_museum_kremlin_01",
            "reward": 15,
            "order": 1,
            "guideAudioUrl": "/media/kremlin-guide.mp3",
            "guideText": kremlin_text,
            "facts": [{"question": "Когда основан Переяславль-Рязанский?", "answer": "В 1095 году."}],
            "quiz": {
                "question": "Чем крепость соединена с рельефом в описании гида?",
                "options": ["Между реками Трубеж и Лыбедь", "Между Волгой и Окой", "На острове посреди озера"],
                "correctIndex": 0,
                "reward": 5,
            },
        },
        {
            "_id": make_id(),
            "name": "Успенский собор",
            "address": "пл. Кремль, д. 15",
            "description": "Главный храм кремлёвского ансамбля.",
            "lat": 54.63572,
            "lng": 39.74395,
            "qrCodeValue": "rq_uspensky_02",
            "reward": 10,
            "order": 2,
            "guideText": "Успенский собор — центральный православный храм Рязанского кремля, памятник архитектуры XVII века.",
            "facts": [],
            "quiz": {
                "question": "Успенский собор относится к какому веку по описанию?",
                "options": ["XVII век", "XIX век", "XX век"],
                "correctIndex": 0,
                "reward": 5,
            },
        },
        {
            "_id": make_id(),
            "name": "Музей пряника",
            "address": "ул. Свободы, д. 4",
            "description": "Музей с дегустацией рязанского пряника.",
            "lat": 54.62992,
            "lng": 39.74015,
            "qrCodeValue": "rq_pryanik_03",
            "reward": 10,
            "order": 3,
            "guideText": "Музей пряника рассказывает о традициях рязанской выпечки и мастер-классах для гостей.",
            "facts": [],
            "quiz": {
                "question": "Чем знаменит музей на ул. Свободы, 4?",
                "options": ["Рязанский пряник", "Военная техника", "Живопись Передвижников"],
                "correctIndex": 0,
                "reward": 5,
            },
        },
        {
            "_id": make_id(),
            "name": "Памятник Сергею Есенину",
            "address": "пл. Кремль (наб. Трубежа)",
            "description": "Памятник поэту на набережной.",
            "lat": 54.62585,
            "lng": 39.74295,
            "qrCodeValue": "rq_esenin_04",
            "reward": 10,
            "order": 4,
            "guideText": "Памятник Сергею Есенину напоминает о связи поэта с Рязанским краем.",
            "facts": [],
            "quiz": {
                "question": "Памятник посвящён кому?",
                "options": ["С. Есенину", "К. Циолковскому", "Евпатию Коловрату"],
                "correctIndex": 0,
                "reward": 5,
            },
        },
        {
            "_id": make_id(),
            "name": "Борисо-Глебский кафедральный собор",
            "address": "ул. Сенная, д. 32",
            "description": "Один из крупнейших храмов Рязани.",
            "lat": 54.63225,
            "lng": 39.7348,
            "qrCodeValue": "rq_borisoglebsky_05",
            "reward": 10,
            "order": 5,
            "guideText": "Борисо-Глебский собор — катедральный собор, важная часть исторической застройки улицы Сенной.",
            "facts": [],
            "quiz": {
                "question": "На какой улице расположен Борисо-Глебский собор?",
                "options": ["ул. Сенная", "ул. Свободы", "ул. Почтовая"],
                "correctIndex": 0,
                "reward": 5,
            },
        },
    ]

    route_id = make_id()
    for p in points:
        p["routeId"] = route_id

    total_reward = sum(int(p["reward"]) for p in points)
    routes = [
        {
            "_id": route_id,
            "name": "Исторический центр: 5 точек",
            "description": "Музей-заповедник на кремле, соборы, музей пряника, памятник Есенину.",
            "points": [p["_id"] for p in points],
            "totalReward": total_reward,
            "image": "",
            "city": "Рязань",
            "finalTest": {
                "question": "В каком году основан город Переяславль-Рязанский по тексту гида у кремля?",
                "options": ["1095", "1147", "1221"],
                "correctIndex": 0,
                "reward": 25,
            },
            "paidAiGuide": {
                "enabled": False,
                "title": "Платный голосовой AI-гид",
                "description": "Полноценная озвучка и ответы на вопросы по маршруту. Подключение через API голосового ассистента — модуль будет добавлен позже.",
                "priceRub": 199,
                "featureFlag": "voice_ai_guide_v1",
            },
            "tickets": {
                "title": "Билеты и экскурсии",
                "description": "Оформление билетов через партнёра: выберите точки, оплата онлайн, ваучеры на e-mail (интеграция платежей — заготовка).",
                "partnerCheckoutUrl": "https://example.com/tickets/ryazan-quest",
                "note": "Замените partnerCheckoutUrl на реальный шлюз агентского продажи.",
            },
        }
    ]

    rewards = [
        {
            "_id": make_id(),
            "name": "Скидка 10% в партнёрском кафе",
            "description": "Промокод при заказе",
            "cost": 50,
            "promoCode": "RQ-CAFE-10",
            "partnerName": "Партнёр «Графин»",
            "image": "",
        },
        {
            "_id": make_id(),
            "name": "Купон в музейный сувенир",
            "description": "Скидка на сувенирную продукцию",
            "cost": 30,
            "promoCode": "RQ-SUV-30",
            "partnerName": "Сувенирная лавка",
            "image": "",
        },
    ]

    optional_stops = [
        {"_id": make_id(), "kind": "food", "name": "Графин", "address": "ул. Татарская, д. 36", "lat": 54.6289, "lng": 39.7342},
        {"_id": make_id(), "kind": "food", "name": "Гастробар «Есть»", "address": "ул. Почтовая, д. 62", "lat": 54.6301, "lng": 39.7349},
        {"_id": make_id(), "kind": "food", "name": "Трактир «Белый»", "address": "ул. Николодворянская, д. 18", "lat": 54.6238, "lng": 39.7386},
        {"_id": make_id(), "kind": "food", "name": "«Хлебная площадь»", "address": "ул. Кольцова, д. 1", "lat": 54.6149, "lng": 39.7136},
        {"_id": make_id(), "kind": "food", "name": "Мидийный дом", "address": "ул. Краснорядская, д. 2", "lat": 54.6283, "lng": 39.7362},
        {"_id": make_id(), "kind": "shop", "name": "Пятёрочка", "address": "ул. Дзержинского, 24-26", "lat": 54.6195, "lng": 39.7125},
        {"_id": make_id(), "kind": "shop", "name": "ТРЦ «Премьер»", "address": "Московское шоссе, д. 21", "lat": 54.6033, "lng": 39.7626},
        {"_id": make_id(), "kind": "shop", "name": "ТЦ «Европа»", "address": "ул. Советской Армии, д. 9А", "lat": 54.6378, "lng": 39.7164},
    ]

    return {
        "schemaVersion": CURRENT_SCHEMA_VERSION,
        "users": [],
        "routes": routes,
        "points": points,
        "rewards": rewards,
        "optionalStops": optional_stops,
        "scans": [],
        "sessions": {},
    }


DB_LOCK = threading.Lock()


def db_load() -> dict:
    with DB_LOCK:
        if not DB_PATH.exists():
            _write_json(DB_PATH, _seed_db())
            return _read_json(DB_PATH)
        data = _read_json(DB_PATH)
        ver = data.get("schemaVersion", 0)
        if ver < CURRENT_SCHEMA_VERSION:
            _write_json(DB_PATH.with_suffix(".bak.json"), data)
            _write_json(DB_PATH, _seed_db())
            return _read_json(DB_PATH)
        data.setdefault("optionalStops", [])
        data.setdefault("sessions", {})
        return data


def db_save(db: dict) -> None:
    with DB_LOCK:
        _write_json(DB_PATH, db)


def _ensure_user_fields(user: dict) -> dict:
    user.setdefault("email", "")
    user.setdefault("phone", "")
    user.setdefault("avatar", "")
    user.setdefault("hideFromLeaderboard", False)
    user.setdefault("quizState", {"pointQuizzes": {}, "finalTests": {}})
    return user


def json_response(handler: SimpleHTTPRequestHandler, status: int, data: Any) -> None:
    payload = json.dumps(data, ensure_ascii=False).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(payload)))
    handler.send_header("Access-Control-Allow-Origin", "*")
    handler.send_header("Access-Control-Allow-Headers", "Content-Type, x-auth-token")
    handler.end_headers()
    handler.wfile.write(payload)


def _get_token(handler: SimpleHTTPRequestHandler) -> str | None:
    return handler.headers.get("x-auth-token")


def require_user(handler: SimpleHTTPRequestHandler):
    token = _get_token(handler)
    if not token:
        json_response(handler, HTTPStatus.UNAUTHORIZED, {"msg": "No token, authorization denied"})
        return None
    db = db_load()
    user_id = db.get("sessions", {}).get(token)
    if not user_id:
        json_response(handler, HTTPStatus.UNAUTHORIZED, {"msg": "Token is not valid"})
        return None
    user = next((u for u in db["users"] if u["_id"] == user_id), None)
    if not user:
        json_response(handler, HTTPStatus.UNAUTHORIZED, {"msg": "User not found"})
        return None
    _ensure_user_fields(user)
    return db, user


def _read_body_json(handler: SimpleHTTPRequestHandler) -> dict:
    length = int(handler.headers.get("Content-Length", "0") or "0")
    raw = handler.rfile.read(length) if length > 0 else b"{}"
    try:
        return json.loads(raw.decode("utf-8") or "{}")
    except Exception:
        return {}


def _parse_linestring_wkt(s: str) -> list[list[float]]:
    out: list[list[float]] = []
    m = re.search(r"LINESTRING\s*\((.+)\)\s*$", s.strip(), re.I | re.DOTALL)
    if not m:
        return out
    inner = m.group(1)
    for seg in inner.split(","):
        seg = seg.strip()
        if not seg:
            continue
        parts = seg.split()
        if len(parts) >= 2:
            out.append([float(parts[0]), float(parts[1])])
    return out


def _fallback_straight_line(waypoints: list[tuple[float, float]]) -> list[list[float]]:
    """Прямая ломаная между точками, если 2GIS недоступен."""
    coords: list[list[float]] = []
    for lng, lat in waypoints:
        coords.append([lng, lat])
    return coords


def twogis_pedestrian_route(waypoints: list[tuple[float, float]]) -> dict:
    """
    waypoints: [(lng, lat), ...] порядок обхода включает пользовательские остановки.
    """
    if len(waypoints) < 2:
        return {
            "coordinates": _fallback_straight_line(waypoints),
            "total_distance_m": 0,
            "total_duration_s": 0,
            "source": "local",
            "error": None,
        }

    pts: list[dict] = []
    for i, (lng, lat) in enumerate(waypoints):
        if i == 0 or i == len(waypoints) - 1:
            pts.append({"type": "walking", "x": float(lng), "y": float(lat)})
        else:
            pts.append({"type": "pref", "x": float(lng), "y": float(lat)})

    payload = {"locale": "ru", "points": pts, "type": "pedestrian"}
    req = urllib.request.Request(
        ROUTING_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=35) as resp:
            raw = resp.read().decode("utf-8")
            data = json.loads(raw)
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="replace")
        return {
            "coordinates": _fallback_straight_line(waypoints),
            "total_distance_m": 0,
            "total_duration_s": 0,
            "source": "fallback",
            "error": f"HTTP {e.code}: {err_body[:200]}",
        }
    except Exception as e:
        return {
            "coordinates": _fallback_straight_line(waypoints),
            "total_distance_m": 0,
            "total_duration_s": 0,
            "source": "fallback",
            "error": str(e),
        }

    results = data.get("result") or []
    if not results:
        return {
            "coordinates": _fallback_straight_line(waypoints),
            "total_distance_m": 0,
            "total_duration_s": 0,
            "source": "fallback",
            "error": "empty result",
        }

    r0 = results[0]
    coords: list[list[float]] = []
    for g in r0.get("geometry") or []:
        sel = g.get("selection") or ""
        if "LINESTRING" in sel.upper():
            seg = _parse_linestring_wkt(sel)
            if coords and seg and seg[0] == coords[-1]:
                seg = seg[1:]
            coords.extend(seg)

    if len(coords) < 2:
        coords = _fallback_straight_line(waypoints)

    return {
        "coordinates": coords,
        "total_distance_m": int(r0.get("total_distance") or 0),
        "total_duration_s": int(r0.get("total_duration") or 0),
        "source": "2gis",
        "error": None,
    }


class Handler(SimpleHTTPRequestHandler):
    def translate_path(self, path: str) -> str:
        path = urlparse(path).path
        rel = path.lstrip("/")
        if rel == "":
            rel = "index.html"
        return str((SITE_DIR / rel).resolve())

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, x-auth-token")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(HTTPStatus.NO_CONTENT)
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path.startswith("/api/"):
            return self._api_get(parsed.path)
        file_path = Path(self.translate_path(self.path))
        if not file_path.exists():
            self.path = "/index.html"
        return super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path.startswith("/api/"):
            return self._api_post(parsed.path)
        return json_response(self, HTTPStatus.NOT_FOUND, {"msg": "Not found"})

    def _api_get(self, path: str):
        db = db_load()

        if path == "/api/config":
            return json_response(
                self,
                HTTPStatus.OK,
                {"twogisKey": TWOGIS_KEY, "schemaVersion": CURRENT_SCHEMA_VERSION},
            )

        if path == "/api/stops":
            return json_response(self, HTTPStatus.OK, db.get("optionalStops", []))

        if path == "/api/routes":
            points_by_id = {p["_id"]: p for p in db["points"]}
            routes = []
            for r in db["routes"]:
                routes.append(
                    {
                        **r,
                        "points": [points_by_id[pid] for pid in r.get("points", []) if pid in points_by_id],
                    }
                )
            return json_response(self, HTTPStatus.OK, routes)

        if path.startswith("/api/routes/"):
            route_id = path.split("/")[-1]
            route = next((r for r in db["routes"] if r["_id"] == route_id), None)
            if not route:
                return json_response(self, HTTPStatus.NOT_FOUND, {"msg": "Route not found"})
            points_by_id = {p["_id"]: p for p in db["points"]}
            return json_response(
                self,
                HTTPStatus.OK,
                {
                    **route,
                    "points": [points_by_id[pid] for pid in route.get("points", []) if pid in points_by_id],
                },
            )

        if path == "/api/points":
            return json_response(self, HTTPStatus.OK, db["points"])

        if path.startswith("/api/points/") and path.endswith("/ask"):
            parts = path.split("/")
            if len(parts) < 4:
                return json_response(self, HTTPStatus.NOT_FOUND, {"msg": "Point not found"})
            point_id = parts[3]
            point = next((p for p in db["points"] if p["_id"] == point_id), None)
            if not point:
                return json_response(self, HTTPStatus.NOT_FOUND, {"msg": "Point not found"})
            facts = point.get("facts") or []
            if point.get("guideText"):
                facts = [{"question": "Краткий гид", "answer": point["guideText"]}] + facts
            return json_response(self, HTTPStatus.OK, facts)

        if path == "/api/users/leaderboard":
            leaders = []
            for u in db["users"]:
                _ensure_user_fields(u)
                if u.get("hideFromLeaderboard"):
                    continue
                leaders.append(
                    {
                        "_id": u["_id"],
                        "name": u["name"],
                        "balance": u.get("balance", 0),
                        "avatar": u.get("avatar") or "",
                    }
                )
            leaders.sort(key=lambda x: x["balance"], reverse=True)
            return json_response(self, HTTPStatus.OK, leaders[:10])

        if path == "/api/rewards":
            return json_response(self, HTTPStatus.OK, db["rewards"])

        if path == "/api/users/me":
            auth_res = require_user(self)
            if not auth_res:
                return
            db, user = auth_res
            routes_by_id = {r["_id"]: r for r in db["routes"]}
            points_by_id = {p["_id"]: p for p in db["points"]}
            completed_routes = [
                {"_id": rid, "name": routes_by_id[rid]["name"]}
                for rid in user.get("completedRoutes", [])
                if rid in routes_by_id
            ]
            scanned_points = [
                {"_id": pid, "name": points_by_id[pid]["name"]}
                for pid in user.get("scannedPoints", [])
                if pid in points_by_id
            ]
            safe_user = {k: v for k, v in user.items() if k != "password"}
            safe_user["completedRoutes"] = completed_routes
            safe_user["scannedPoints"] = scanned_points
            return json_response(self, HTTPStatus.OK, safe_user)

        return json_response(self, HTTPStatus.NOT_FOUND, {"msg": "Not found"})

    def _api_post(self, path: str):
        body = _read_body_json(self)
        db = db_load()

        if path == "/api/routing/pedestrian":
            wps = body.get("waypoints") or []
            pts: list[tuple[float, float]] = []
            for w in wps:
                lng, lat = float(w.get("lng")), float(w.get("lat"))
                pts.append((lng, lat))
            res = twogis_pedestrian_route(pts)
            return json_response(self, HTTPStatus.OK, res)

        if path == "/api/auth/register":
            name = (body.get("name") or "").strip()
            email = (body.get("email") or "").strip().lower()
            phone = _normalize_phone(body.get("phone"))
            password = body.get("password") or ""
            if not name or len(password) < 6:
                return json_response(self, HTTPStatus.BAD_REQUEST, {"msg": "Invalid data"})
            if not email and not phone:
                return json_response(self, HTTPStatus.BAD_REQUEST, {"msg": "Укажите e-mail или телефон"})
            if email and phone:
                email_exists = any((u.get("email") or "").lower() == email for u in db["users"])
                phone_exists = any(_normalize_phone(u.get("phone")) == phone for u in db["users"] if u.get("phone"))
                if email_exists and phone_exists:
                    return json_response(
                        self,
                        HTTPStatus.BAD_REQUEST,
                        {"msg": "Пользователь с такими e-mail и телефоном уже существует"},
                    )
                if email_exists:
                    return json_response(self, HTTPStatus.BAD_REQUEST, {"msg": "Пользователь с таким e-mail уже существует"})
                if phone_exists:
                    return json_response(self, HTTPStatus.BAD_REQUEST, {"msg": "Пользователь с таким телефоном уже существует"})
            elif email and any((u.get("email") or "").lower() == email for u in db["users"]):
                return json_response(self, HTTPStatus.BAD_REQUEST, {"msg": "Пользователь с таким e-mail уже существует"})
            elif phone and any(_normalize_phone(u.get("phone")) == phone for u in db["users"] if u.get("phone")):
                return json_response(self, HTTPStatus.BAD_REQUEST, {"msg": "Пользователь с таким телефоном уже существует"})
            user_id = secrets.token_hex(12)
            user = {
                "_id": user_id,
                "name": name,
                "email": email,
                "phone": phone,
                "password": password,
                "balance": 0,
                "completedRoutes": [],
                "scannedPoints": [],
                "avatar": "",
                "hideFromLeaderboard": False,
                "quizState": {"pointQuizzes": {}, "finalTests": {}},
                "createdAt": _now_iso(),
            }
            token = secrets.token_urlsafe(24)
            db["users"].append(user)
            db.setdefault("sessions", {})[token] = user_id
            db_save(db)
            return json_response(self, HTTPStatus.OK, {"token": token})

        if path == "/api/auth/login":
            login_id = (body.get("login") or body.get("email") or body.get("phone") or "").strip()
            password = body.get("password") or ""
            user = None
            if "@" in login_id:
                em = login_id.lower()
                user = next((u for u in db["users"] if (u.get("email") or "").lower() == em), None)
            else:
                ph = _normalize_phone(login_id)
                user = next((u for u in db["users"] if _normalize_phone(u.get("phone")) == ph), None)
            if not user or user.get("password") != password:
                return json_response(self, HTTPStatus.BAD_REQUEST, {"msg": "Invalid credentials"})
            token = secrets.token_urlsafe(24)
            db.setdefault("sessions", {})[token] = user["_id"]
            db_save(db)
            return json_response(self, HTTPStatus.OK, {"token": token})

        if path == "/api/users/me":
            auth_res = require_user(self)
            if not auth_res:
                return
            db, user = auth_res
            if body.get("hideFromLeaderboard") is not None:
                user["hideFromLeaderboard"] = bool(body.get("hideFromLeaderboard"))
            if body.get("name"):
                user["name"] = str(body.get("name")).strip()[:80]
            for i, u in enumerate(db["users"]):
                if u["_id"] == user["_id"]:
                    db["users"][i] = user
                    break
            db_save(db)
            return json_response(self, HTTPStatus.OK, {"ok": True})

        if path == "/api/users/me/avatar":
            auth_res = require_user(self)
            if not auth_res:
                return
            db, user = auth_res
            b64 = body.get("imageBase64") or ""
            if not b64.startswith("data:image"):
                return json_response(self, HTTPStatus.BAD_REQUEST, {"msg": "Invalid image"})
            user["avatar"] = b64[:200000]
            for i, u in enumerate(db["users"]):
                if u["_id"] == user["_id"]:
                    db["users"][i] = user
                    break
            db_save(db)
            return json_response(self, HTTPStatus.OK, {"ok": True, "avatar": user["avatar"]})

        if path == "/api/quiz/point":
            auth_res = require_user(self)
            if not auth_res:
                return
            db, user = auth_res
            point_id = body.get("pointId")
            choice = body.get("choiceIndex")
            point = next((p for p in db["points"] if p["_id"] == point_id), None)
            if not point or "quiz" not in point:
                return json_response(self, HTTPStatus.NOT_FOUND, {"msg": "Quiz not found"})
            if point["_id"] not in (user.get("scannedPoints") or []):
                return json_response(self, HTTPStatus.BAD_REQUEST, {"msg": "Сначала отсканируйте точку"})
            qs = user.setdefault("quizState", {}).setdefault("pointQuizzes", {})
            if qs.get(point_id, {}).get("solved"):
                return json_response(self, HTTPStatus.OK, {"success": True, "already": True, "newBalance": user["balance"]})
            quiz = point["quiz"]
            ok = int(choice) == int(quiz.get("correctIndex"))
            add = int(quiz.get("reward", 0)) if ok else 0
            if add:
                user["balance"] = int(user.get("balance", 0)) + add
            qs[point_id] = {"solved": True, "correct": ok, "won": add}
            for i, u in enumerate(db["users"]):
                if u["_id"] == user["_id"]:
                    db["users"][i] = user
                    break
            db_save(db)
            return json_response(
                self,
                HTTPStatus.OK,
                {"success": ok, "reward": add, "newBalance": user["balance"]},
            )

        if path == "/api/quiz/final":
            auth_res = require_user(self)
            if not auth_res:
                return
            db, user = auth_res
            route_id = body.get("routeId")
            choice = body.get("choiceIndex")
            route = next((r for r in db["routes"] if r["_id"] == route_id), None)
            if not route or "finalTest" not in route:
                return json_response(self, HTTPStatus.NOT_FOUND, {"msg": "Final test not found"})
            rids = set(route.get("points", []))
            if not rids.issubset(set(user.get("scannedPoints") or [])):
                return json_response(self, HTTPStatus.BAD_REQUEST, {"msg": "Не все точки пройдены"})
            ft = route["finalTest"]
            qs = user.setdefault("quizState", {}).setdefault("finalTests", {})
            if qs.get(route_id, {}).get("passed"):
                return json_response(self, HTTPStatus.OK, {"success": True, "already": True, "newBalance": user["balance"]})
            ok = int(choice) == int(ft.get("correctIndex"))
            add = int(ft.get("reward", 0)) if ok else 0
            if add:
                user["balance"] = int(user.get("balance", 0)) + add
            qs[route_id] = {"passed": ok, "won": add}
            for i, u in enumerate(db["users"]):
                if u["_id"] == user["_id"]:
                    db["users"][i] = user
                    break
            db_save(db)
            return json_response(
                self,
                HTTPStatus.OK,
                {"success": ok, "reward": add, "newBalance": user["balance"]},
            )

        if path == "/api/scan":
            auth_res = require_user(self)
            if not auth_res:
                return
            db, user = auth_res
            qr_value = body.get("qrValue")
            point = next((p for p in db["points"] if p["qrCodeValue"] == qr_value), None)
            if not point:
                return json_response(self, HTTPStatus.NOT_FOUND, {"msg": "Invalid QR code"})

            user.setdefault("scannedPoints", [])
            user.setdefault("completedRoutes", [])

            fresh_scan = point["_id"] not in user["scannedPoints"]
            if fresh_scan:
                user["balance"] = int(user.get("balance", 0)) + int(point.get("reward", 0))
                user["scannedPoints"].append(point["_id"])

            route = next((r for r in db["routes"] if r["_id"] == point.get("routeId")), None)
            if route:
                if all(pid in user["scannedPoints"] for pid in route.get("points", [])):
                    if route["_id"] not in user["completedRoutes"]:
                        user["completedRoutes"].append(route["_id"])

            for i, u in enumerate(db["users"]):
                if u["_id"] == user["_id"]:
                    db["users"][i] = user
                    break
            db_save(db)

            reward = int(point.get("reward", 0)) if fresh_scan else 0
            return json_response(
                self,
                HTTPStatus.OK,
                {"success": True, "reward": reward, "newBalance": user["balance"], "point": point, "freshScan": fresh_scan},
            )

        if path == "/api/rewards/purchase":
            auth_res = require_user(self)
            if not auth_res:
                return
            db, user = auth_res
            reward_id = body.get("rewardId")
            reward = next((r for r in db["rewards"] if r["_id"] == reward_id), None)
            if not reward:
                return json_response(self, HTTPStatus.NOT_FOUND, {"msg": "Reward not found"})
            if int(user.get("balance", 0)) < int(reward.get("cost", 0)):
                return json_response(self, HTTPStatus.BAD_REQUEST, {"msg": "Not enough points"})
            user["balance"] = int(user.get("balance", 0)) - int(reward.get("cost", 0))
            for i, u in enumerate(db["users"]):
                if u["_id"] == user["_id"]:
                    db["users"][i] = user
                    break
            db_save(db)
            return json_response(self, HTTPStatus.OK, {"success": True, "newBalance": user["balance"], "promoCode": reward["promoCode"]})

        return json_response(self, HTTPStatus.NOT_FOUND, {"msg": "Not found"})


def main():
    SITE_DIR.mkdir(parents=True, exist_ok=True)
    db_load()

    port = int(os.environ.get("PORT", "8000"))
    server = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    print(f"Ryazan Quest running at http://localhost:{port}")
    server.serve_forever()


if __name__ == "__main__":
    main()
