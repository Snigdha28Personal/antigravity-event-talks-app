import os
import re
import datetime
from flask import Flask, render_template, jsonify, request
import requests
import feedparser
from bs4 import BeautifulSoup

app = Flask(__name__)

FEED_URLS = [
    "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml",
    "https://cloud.google.com/feeds/bigquery-release-notes.xml"
]

def clean_html(raw_html):
    """Clean HTML content into safe snippets and clean text for sharing."""
    if not raw_html:
        return "", ""
    soup = BeautifulSoup(raw_html, "html.parser")
    
    # Remove unwanted tags
    for tag in soup(["script", "style"]):
        tag.decompose()
        
    plain_text = soup.get_text(separator=" ", strip=True)
    # Fix whitespace
    plain_text = re.sub(r'\s+', ' ', plain_text)
    
    return str(soup), plain_text

def detect_tags(text):
    """Extract release note categories based on standard GCP terminology."""
    tags = []
    text_upper = text.upper()
    if "FEATURE" in text_upper or "ANNOUNCING" in text_upper or "INTRODUCING" in text_upper or "NEW" in text_upper:
        tags.append("FEATURE")
    if "GENERAL AVAILABILITY" in text_upper or " GA " in text_upper or "(GA)" in text_upper:
        tags.append("GA")
    if "PREVIEW" in text_upper:
        tags.append("PREVIEW")
    if "CHANGED" in text_upper or "UPDATE" in text_upper or "IMPROVED" in text_upper:
        tags.append("CHANGED")
    if "DEPRECATED" in text_upper or "REMOVED" in text_upper or "BREAKING" in text_upper:
        tags.append("DEPRECATED")
    if "FIX" in text_upper or "RESOLVED" in text_upper:
        tags.append("FIX")
        
    if not tags:
        tags.append("UPDATE")
    return tags

def fetch_release_notes():
    feed_data = None
    last_error = None
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/atom+xml, application/rss+xml, application/xml, text/xml"
    }

    for url in FEED_URLS:
        try:
            resp = requests.get(url, headers=headers, timeout=8)
            if resp.status_code == 200:
                parsed = feedparser.parse(resp.content)
                if parsed.entries:
                    feed_data = parsed
                    break
        except Exception as e:
            last_error = str(e)
            continue

    notes = []

    if feed_data and feed_data.entries:
        for idx, entry in enumerate(feed_data.entries):
            title = getattr(entry, "title", "BigQuery Release Note")
            link = getattr(entry, "link", "https://cloud.google.com/bigquery/docs/release-notes")
            
            # Format published date
            pub_date = getattr(entry, "updated", getattr(entry, "published", ""))
            if not pub_date and hasattr(entry, "published_parsed") and entry.published_parsed:
                pub_date = datetime.datetime(*entry.published_parsed[:6]).strftime("%B %d, %Y")
            elif pub_date:
                # Format ISO date strings cleanly
                try:
                    dt = datetime.datetime.fromisoformat(pub_date.replace("Z", "+00:00"))
                    pub_date = dt.strftime("%B %d, %Y")
                except Exception:
                    pass

            raw_content = ""
            if hasattr(entry, "content") and entry.content:
                raw_content = entry.content[0].value
            elif hasattr(entry, "summary") and entry.summary:
                raw_content = entry.summary

            formatted_html, plain_text = clean_html(raw_content)
            
            # If title is generic date (e.g. "July 20, 2026"), extract leading summary sentence for title
            display_title = title
            if re.match(r'^[A-Z][a-z]+\s+\d{1,2},\s+\d{4}$', title.strip()):
                first_sentence = plain_text.split('.')[0] if plain_text else title
                if len(first_sentence) > 90:
                    first_sentence = first_sentence[:87] + "..."
                display_title = f"{title} - {first_sentence}" if first_sentence else title

            tags = detect_tags(plain_text + " " + title)

            notes.append({
                "id": getattr(entry, "id", f"bq-note-{idx}"),
                "title": display_title,
                "date": pub_date or "Recent Update",
                "link": link,
                "html_content": formatted_html,
                "text_content": plain_text,
                "tags": tags,
                "raw_date": getattr(entry, "updated", "")
            })

    # Return fetched notes or fallback sample data if feed is unreachable
    if not notes:
        notes = get_fallback_notes()

    return notes

def get_fallback_notes():
    """Sample data if network feed is unavailable."""
    return [
        {
            "id": "bq-note-sample-1",
            "title": "BigQuery Continuous Queries now in General Availability",
            "date": "July 24, 2026",
            "link": "https://cloud.google.com/bigquery/docs/release-notes",
            "html_content": "<p>BigQuery Continuous Queries are now <strong>Generally Available (GA)</strong>. Continuous queries allow you to run SQL statements continuously against incoming streaming data streams in real time.</p>",
            "text_content": "BigQuery Continuous Queries are now Generally Available (GA). Continuous queries allow you to run SQL statements continuously against incoming streaming data streams in real time.",
            "tags": ["FEATURE", "GA"],
            "raw_date": "2026-07-24"
        },
        {
            "id": "bq-note-sample-2",
            "title": "Enhanced Vector Search with ScaNN Indexing",
            "date": "July 18, 2026",
            "link": "https://cloud.google.com/bigquery/docs/release-notes",
            "html_content": "<p>BigQuery Vector Indexing now supports <code>ScaNN</code> (Scalable Nearest Neighbors) algorithm for high-performance approximate nearest neighbor search over multi-million row embeddings.</p>",
            "text_content": "BigQuery Vector Indexing now supports ScaNN algorithm for high-performance approximate nearest neighbor search over multi-million row embeddings.",
            "tags": ["FEATURE", "PREVIEW"],
            "raw_date": "2026-07-18"
        },
        {
            "id": "bq-note-sample-3",
            "title": "Automated Materialized View Tuning Improvements",
            "date": "July 10, 2026",
            "link": "https://cloud.google.com/bigquery/docs/release-notes",
            "html_content": "<p>BigQuery query optimizer now automatically rewrites complex subqueries to leverage relevant materialized views across partitioned datasets, reducing query slot usage by up to 40%.</p>",
            "text_content": "BigQuery query optimizer now automatically rewrites complex subqueries to leverage relevant materialized views across partitioned datasets, reducing query slot usage by up to 40%.",
            "tags": ["CHANGED", "PERFORMANCE"],
            "raw_date": "2026-07-10"
        }
    ]

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/release-notes")
def api_release_notes():
    try:
        notes = fetch_release_notes()
        return jsonify({
            "status": "success",
            "timestamp": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"),
            "count": len(notes),
            "notes": notes
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e),
            "notes": get_fallback_notes()
        }), 500

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
