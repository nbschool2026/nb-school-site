#!/usr/bin/env python3
"""Export the published Google Sites distance-learning pages to CMS import JSON."""
import html
import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import quote, unquote, urljoin, urlparse, urlsplit, urlunsplit
from urllib.request import Request, urlopen

ROOT = 'https://sites.google.com/view/novbilous/головна-сторінка?authuser=0'
PAGE_RE = re.compile(r'/view/novbilous/(\d+)-клас/([^?#]+)$')
DATE_RE = re.compile(r'^Дата\s+(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})$', re.I)

class Extractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.text = []
        self.links = []
        self.skip = 0
    def handle_starttag(self, tag, attrs):
        if tag in {'script', 'style', 'noscript', 'svg'}: self.skip += 1
        if tag == 'a':
            href = dict(attrs).get('href')
            if href: self.links.append(href)
    def handle_endtag(self, tag):
        if tag in {'script', 'style', 'noscript', 'svg'} and self.skip: self.skip -= 1
    def handle_data(self, data):
        if not self.skip and data.strip(): self.text.append(html.unescape(data.strip()))

def fetch(url):
    parts = urlsplit(url)
    url = urlunsplit((parts.scheme, parts.netloc, quote(unquote(parts.path), safe='/%'), parts.query, parts.fragment))
    req = Request(url, headers={'User-Agent': 'Mozilla/5.0 distance-learning-export'})
    with urlopen(req, timeout=30) as response: return response.read().decode('utf-8', 'replace')

def clean(lines):
    return [re.sub(r'\s+', ' ', line).strip() for line in lines if line.strip()]

def main():
    root = sys.argv[1] if len(sys.argv) > 1 else ROOT
    output = Path(sys.argv[2] if len(sys.argv) > 2 else 'distance-learning-materials.json')
    parser = Extractor(); parser.feed(fetch(root))
    urls = sorted({urljoin(root, href).split('?')[0] for href in parser.links if PAGE_RE.search(urljoin(root, href).split('?')[0])})
    records = []
    for number, url in enumerate(urls, 1):
        page = Extractor(); page.feed(fetch(url)); lines = clean(page.text)
        match = PAGE_RE.search(urlparse(url).path)
        if not match: continue
        grade, encoded_subject = match.groups(); subject = unquote(encoded_subject).replace('-', ' ')
        date_indexes = [i for i, line in enumerate(lines) if DATE_RE.match(line)]
        for pos, start in enumerate(date_indexes):
            end = date_indexes[pos + 1] if pos + 1 < len(date_indexes) else len(lines)
            day, month, year = DATE_RE.match(lines[start]).groups()
            segment = lines[start + 1:end]
            topic_index = next((i for i, line in enumerate(segment) if re.match(r'^Тема\s*:', line, re.I)), None)
            topic = re.sub(r'^Тема\s*:\s*', '', segment[topic_index], flags=re.I) if topic_index is not None else subject
            content = '\n'.join(line for i, line in enumerate(segment) if i != topic_index)
            videos = re.findall(r'https?://(?:www\.)?youtube\.com/watch\?v=[\w-]+', content)
            records.append({'grade': f'{grade} клас', 'subject': subject, 'date': f'{year}-{month.zfill(2)}-{day.zfill(2)}', 'topic': topic, 'content': content, 'videoUrl': videos[0] if videos else '', 'sourceUrl': url})
        print(f'{number}/{len(urls)} {url}', file=sys.stderr)
    output.write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'Exported {len(records)} records from {len(urls)} pages to {output}')

if __name__ == '__main__': main()
