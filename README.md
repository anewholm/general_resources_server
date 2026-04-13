# General Resources Server

![Human made content](human-made-content.png "Human made content")
[![Security Scan](https://github.com/anewholm/general_resources_server/actions/workflows/semgrep.yml/badge.svg)](https://github.com/anewholm/general_resources_server/actions/workflows/semgrep.yml)

A lightweight Apache/PHP companion server to [General Server](https://github.com/anewholm/generalserver). Its sole purpose is to serve binary and static assets (images, fonts, third-party JS/CSS libraries) that General Server does not serve directly because it is XML-only.

## Why a separate server?

General Server processes everything as XML — HTML, Javascript, CSS, and XSL are all valid XML text nodes and are served directly from GS. However, binary files (PNG, JPEG, fonts, zip archives) cannot be represented as XML nodes. This server fills that gap by serving the `resources/` directory tree over HTTP.

## Structure

```
resources/
  shared/
    images/       ← icons, logos used across GS websites
    favicon.ico
  <project>/      ← per-project static assets
```

The index page at `/` auto-generates a directory listing of the `resources/` tree.

## Prerequisites

- Apache 2 with `mod_php`
- PHP 8.1+

## Installation

1. Clone into your web root or a vhost directory:
   ```bash
   git clone https://github.com/anewholm/general_resources_server /var/www/general-resources-server
   ```

2. Configure an Apache vhost pointing to this directory, or use the `acorn-setup-hostname` script:
   ```bash
   cd /var/www/general-resources-server
   sudo [scripts install dir]/acorn-setup-hostname
   ```

3. Drop static assets under `resources/` — they will be immediately available at `http://general-resources-server.laptop/resources/...`.

## Related

- [generalserver](https://github.com/anewholm/generalserver) — the XML/XSLT server this companion serves assets for

## License

MIT
