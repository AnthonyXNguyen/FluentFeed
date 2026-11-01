"""Phase 0 spike: how many Creative Commons Shorts exist per language?

Searches YouTube for CC-licensed short videos in each language, then looks up
every result to check the real duration, orientation, and audio language, since
the search filters alone are loose. Prints a summary table, the channels that
showed up most, and sample links. Channel counts only say who posts a lot of
CC Shorts, not who made them; check each channel by hand before trusting its
CC license.

Usage (from backend/, with YOUTUBE_API_KEY in backend/.env):
    python scripts/count_cc_shorts.py
    python scripts/count_cc_shorts.py --themes                # food/travel/daily-life searches
    python scripts/count_cc_shorts.py --languages es --query "receta" "viaje"
    python scripts/count_cc_shorts.py --list all              # print every video checked
    python scripts/count_cc_shorts.py --csv shorts.csv        # save every video to a spreadsheet

Quota: each search page costs 100 units and each lookup batch of 50 costs 1.
Cost is roughly languages x queries x pages x 100. The default
(3 languages x 1 query x 2 pages) uses ~606 of the 10,000 daily units;
--themes (3 languages x 3 themes x 1 page) uses ~909.
"""

import argparse
import csv
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from collections import defaultdict

from dotenv import load_dotenv

API_BASE = "https://www.googleapis.com/youtube/v3"

# Shorts can be up to 3 minutes; most language-learning-friendly ones are under 60s.
SHORT_MAX_SECONDS = 180
VERY_SHORT_MAX_SECONDS = 60

# Everyday topics with lots of speech, searched in each language's own words.
THEMES = {
    "es": ["comida receta", "viaje", "vida diaria"],
    "vi": ["ẩm thực nấu ăn", "du lịch", "cuộc sống hằng ngày"],
    "en": ["food recipe", "travel", "daily life"],
}


def api_get(endpoint: str, params: dict, api_key: str) -> dict:
    query = urllib.parse.urlencode({**params, "key": api_key})
    try:
        with urllib.request.urlopen(f"{API_BASE}/{endpoint}?{query}") as response:
            return json.load(response)
    except urllib.error.HTTPError as error:
        body = error.read().decode()
        sys.exit(f"YouTube API error {error.code} on /{endpoint}:\n{body}")


def parse_duration(iso: str) -> int:
    # YouTube durations are ISO 8601, e.g. "PT1M5S" -> 65 seconds.
    match = re.fullmatch(r"P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", iso)
    if not match:
        return 0
    days, hours, minutes, seconds = (int(part or 0) for part in match.groups())
    return ((days * 24 + hours) * 60 + minutes) * 60 + seconds


def search_ids(language: str, query: str, pages: int, api_key: str) -> list[str]:
    ids: list[str] = []
    page_token = None
    for _ in range(pages):
        params = {
            "part": "id",
            "type": "video",
            "videoLicense": "creativeCommon",
            # "short" means under 4 minutes; real Shorts are filtered later.
            "videoDuration": "short",
            # A ranking hint, not a filter, so audio language is checked later.
            "relevanceLanguage": language,
            "q": query,
            "maxResults": 50,
        }
        if page_token:
            params["pageToken"] = page_token
        data = api_get("search", params, api_key)
        ids.extend(item["id"]["videoId"] for item in data.get("items", []))
        page_token = data.get("nextPageToken")
        if not page_token:
            break
    return ids


def fetch_details(ids: list[str], api_key: str) -> list[dict]:
    videos: list[dict] = []
    for start in range(0, len(ids), 50):
        data = api_get(
            "videos",
            {
                "part": "snippet,contentDetails,status,player",
                "id": ",".join(ids[start : start + 50]),
                # Asking for a sized embed makes the API report the video's
                # aspect ratio through embedWidth/embedHeight.
                "maxHeight": 1000,
            },
            api_key,
        )
        videos.extend(data.get("items", []))
    return videos


def to_record(language: str, video: dict, query: str) -> dict:
    """Flatten one API video into the fields this spike cares about."""
    snippet = video["snippet"]
    player = video.get("player", {})
    seconds = parse_duration(video["contentDetails"]["duration"])
    audio_lang = snippet.get("defaultAudioLanguage") or snippet.get("defaultLanguage") or ""
    record = {
        "language": language,
        "query": query,
        "seconds": seconds,
        "cc": video["status"].get("license") == "creativeCommon",
        "vertical": int(player.get("embedHeight", 0)) > int(player.get("embedWidth", 0)),
        "audio_lang": audio_lang,
        # Uploaders set this themselves (e.g. "es-419"), so compare the base code.
        "lang_match": audio_lang.split("-")[0].lower() == language.lower(),
        "captions": video["contentDetails"].get("caption") == "true",
        "channel": snippet["channelTitle"],
        "channel_url": f"https://youtube.com/channel/{snippet['channelId']}",
        "title": snippet["title"],
        "url": f"https://youtube.com/shorts/{video['id']}",
    }
    # A Short-shaped CC video; audio language is often blank, so it's not required.
    record["short"] = record["cc"] and seconds <= SHORT_MAX_SECONDS and record["vertical"]
    record["usable"] = record["short"] and record["lang_match"]
    return record


def collect(language: str, queries: list[str], pages: int, api_key: str) -> list[dict]:
    # The same video can match several queries; keep the first query it came from.
    first_query: dict[str, str] = {}
    for query in queries:
        print(f"Searching {language}: {query!r}...", file=sys.stderr)
        for video_id in search_ids(language, query, pages, api_key):
            first_query.setdefault(video_id, query)
    videos = fetch_details(list(first_query), api_key)
    return [to_record(language, video, first_query[video["id"]]) for video in videos]


def format_video(record: dict) -> str:
    flags = "".join([
        "V" if record["vertical"] else "-",
        "L" if record["lang_match"] else "-",
        "C" if record["captions"] else "-",
    ])
    return (f"{record['seconds']:>4}s  {flags}  {record['url']}  "
            f"{record['channel']}: {record['title'][:60]}")


def print_summary(by_language: dict[str, list[dict]]) -> None:
    columns = {
        "found": lambda r: True,
        "cc_confirmed": lambda r: r["cc"],
        "under_3min": lambda r: r["cc"] and r["seconds"] <= SHORT_MAX_SECONDS,
        "under_60s": lambda r: r["cc"] and r["seconds"] <= VERY_SHORT_MAX_SECONDS,
        "vertical": lambda r: r["short"],
        "audio_lang_match": lambda r: r["usable"],
        "has_captions": lambda r: r["short"] and r["captions"],
    }
    print(f"\n{'lang':<6}" + "".join(f"{c:>18}" for c in columns) + f"{'channels':>10}")
    for language, records in by_language.items():
        channels = {r["channel"] for r in records if r["short"]}
        print(f"{language:<6}"
              + "".join(f"{sum(map(test, records)):>18}" for test in columns.values())
              + f"{len(channels):>10}")
    print("\nEach column narrows the one before it (vertical = CC + under 3 min + vertical).")
    print("audio_lang_match undercounts: uploaders often leave the audio language blank.")


def print_channels(language: str, records: list[dict], limit: int) -> None:
    by_channel: dict[str, list[dict]] = defaultdict(list)
    for record in records:
        if record["short"]:
            by_channel[record["channel"]].append(record)
    ranked = sorted(by_channel.items(), key=lambda item: len(item[1]), reverse=True)

    print(f"\n--- {language}: top channels with CC Shorts "
          "(check each is an original creator, not a reupload channel) ---")
    for channel, videos in ranked[:limit] or [("(none)", [])]:
        if not videos:
            print(channel)
            continue
        matched = sum(v["lang_match"] for v in videos)
        print(f"{len(videos):>3} shorts  ({matched} lang-tagged)  {channel}  {videos[0]['channel_url']}")
        print(f"             e.g. {videos[0]['url']}  {videos[0]['title'][:60]}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--languages", nargs="+", default=["es", "vi", "en"],
                        help="ISO 639-1 codes (default: es vi en)")
    parser.add_argument("--query", nargs="+", default=["#shorts"],
                        help='one or more search texts (default: "#shorts")')
    parser.add_argument("--themes", action="store_true",
                        help="search food/travel/daily-life in each language instead of --query")
    parser.add_argument("--pages", type=int, default=None,
                        help="search pages of 50 per query, 100 quota units each "
                             "(default: 2, or 1 with --themes)")
    parser.add_argument("--list", choices=["usable", "all", "none"], default="usable",
                        help="which videos to print per language (default: usable)")
    parser.add_argument("--samples", type=int, default=10,
                        help="max videos to print per language with --list usable (default: 10)")
    parser.add_argument("--channels", type=int, default=15,
                        help="top channels to print per language (default: 15)")
    parser.add_argument("--csv", metavar="PATH",
                        help="also save every video checked to a CSV file")
    args = parser.parse_args()
    pages = args.pages or (1 if args.themes else 2)

    load_dotenv()
    api_key = os.environ.get("YOUTUBE_API_KEY")
    if not api_key:
        sys.exit("YOUTUBE_API_KEY is missing. Add it to backend/.env.")

    by_language: dict[str, list[dict]] = {}
    for language in args.languages:
        queries = THEMES.get(language, ["#shorts"]) if args.themes else args.query
        by_language[language] = collect(language, queries, pages, api_key)

    print_summary(by_language)
    for language, records in by_language.items():
        print_channels(language, records, args.channels)

    if args.list != "none":
        print("\nFlags: V = vertical, L = audio language tagged correctly, C = has captions")
    for language, records in by_language.items():
        if args.list == "all":
            print(f"\n--- {language}: every video checked ({len(records)}) ---")
            shown = sorted(records, key=lambda r: (not r["usable"], not r["short"], r["channel"]))
        elif args.list == "usable":
            print(f"\n--- {language}: sample usable Shorts (watch a few to check for speech) ---")
            shown = [r for r in records if r["usable"]][: args.samples]
        else:
            continue
        for record in shown or [{"none": True}]:
            print("(none)" if "none" in record else format_video(record))

    if args.csv:
        rows = [record for records in by_language.values() for record in records]
        with open(args.csv, "w", newline="", encoding="utf-8") as file:
            writer = csv.DictWriter(file, fieldnames=list(rows[0]) if rows else ["url"])
            writer.writeheader()
            writer.writerows(rows)
        print(f"\nSaved {len(rows)} videos to {args.csv}", file=sys.stderr)


if __name__ == "__main__":
    main()
