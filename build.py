"""Bundle src/ into a single self-contained index.html (works offline, GitHub Pages ready)."""
from pathlib import Path
root = Path(__file__).parent
s = root / "src"
css, body, eng, ui = [(s / f).read_text() for f in ("style.css", "body.html", "engine.js", "ui.js")]
html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Smart Traffic Signal Optimization using Game Theory</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700&family=Barlow+Semi+Condensed:wght@600;700&display=swap" rel="stylesheet">
<style>
{css}
</style>
</head>
<body>
{body}
<script>
{eng}
</script>
<script>
{ui}
</script>
</body>
</html>
"""
(root / "index.html").write_text(html)
print("index.html written,", len(html) // 1024, "KB")
