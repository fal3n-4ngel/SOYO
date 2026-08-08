<h1 align="center"> SOYO — Stream On Your Own </h1> 
<h1 align="center">

  <div>
    <a href="https://github.com/fal3n-4ngel/SOYO/issues">
        <img src="https://img.shields.io/github/issues/fal3n-4ngel/SOYO?color=fab387&labelColor=303446&style=for-the-badge">
    </a>
    <a href="https://github.com/fal3n-4ngel/SOYO/stargazers">
        <img src="https://img.shields.io/github/stars/fal3n-4ngel/SOYO?color=ca9ee6&labelColor=303446&style=for-the-badge">
    </a>
    <a href="https://github.com/fal3n-4ngel/SOYO">
        <img src="https://img.shields.io/github/repo-size/fal3n-4ngel/SOYO?color=ea999c&labelColor=303446&style=for-the-badge">
    </a>
    <a href="https://github.com/fal3n-4ngel/SOYO/blob/main/LICENSE">
        <img src="https://img.shields.io/static/v1.svg?style=for-the-badge&label=License&message=MIT&logoColor=ca9ee6&colorA=313244&colorB=cba6f7"/>
    </a>
  </div>
</h1>

## What is SOYO?
SOYO is a privacy-first, zero-cloud media server built with Next.js. It streams your local media library (movies, series, anime) to any device on your home Wi-Fi network without requiring cloud uploads, user accounts, or external tracking.

---

## ⚡ Features & Capabilities

- **🧲 Online Torrent & Magnet Streaming**: Paste any `magnet:?xt=urn:btih:...` link or torrent hash to stream video content on-the-fly over HTTP without pre-downloading files to disk. Includes live peer count tracking, file selection, and HTTP Range-based seeking.
- **👤 Local User Accounts & Custom PFPs**: Create, switch, and manage local profiles with preset emoji avatars or custom uploaded profile pictures. Watch history and Continue Watching targets are isolated per profile.
- **🏷️ Intelligent Title Recognition & Quality Mapping**: Automatically parses scene release filenames (e.g. `[CC] Back to the Future 1985 1080p BrRip x264 YIFY` $\rightarrow$ **Back to the Future**). Displays badges for **Year**, **Resolution** (`1080P`, `720P`, `4K`), **Source** (`BluRay`, `BRRip`, `WEB-DL`), and **Codec**.
- **🔥 Curated Media Rails**: Includes **Trending Now**, **Most Watched**, and **Recently Added** carousels with configurable settings toggles under `/config`.
- **🎨 Telescope-Inspired Design & Physics**: Scandinavian minimalist aesthetic featuring GPU-accelerated 3D magnetic parallax (`translate3d`) and fluid sine-wave floating collages.
- **🌐 Network Discovery & QR Panel**: Automatic mDNS broadcasting (`http://soyo.local:3000`), one-click universal LAN IP copy button, and constant QR code scanning for mobile devices.
- **⚡ Ultrafast Streaming Engine**: Instant playback start (`-analyzeduration 1000000 -probesize 1000000`), zero-freeze timestamp reconstruction (`-avoid_negative_ts make_zero`), and embedded subtitle WebVTT memory caching (`vttCache`).

---

### Screenshots

<div align="center">
  <img src="https://github.com/user-attachments/assets/8784693b-1431-46cd-8b0e-d98147396aa4" alt="Laptop view" width="400"/>
  <img src="https://github.com/user-attachments/assets/1d6fa291-4c01-4f1c-969a-7ad48e23afd7" alt="Mobile view" width="400" />
</div>

---

## 🚀 Quick Start (Node.js)

### 1. Clone the Repository:
```bash
git clone https://github.com/fal3n-4ngel/SOYO.git
cd SOYO
```

### 2. Install Dependencies:
```bash
npm install
```

### 3. Install FFmpeg:
Playback of non-browser formats (MKV, HEVC, AC3) and subtitle extraction require `ffmpeg` and `ffprobe` on your `PATH`:
```bash
winget install Gyan.FFmpeg      # Windows
brew install ffmpeg             # macOS
sudo apt install ffmpeg         # Linux
```

### 4. Run Development Server:
```bash
npm run dev
```

Open `http://localhost:3000` or `http://soyo.local:3000` from any device on your Wi-Fi network.

### 5. Run Production Server:
```bash
npm run build
npm run start
```

---

## 🐳 Run using Docker

```bash
docker pull fal3n4ngel/soyo:latest

# Run Docker container mounting local media drives
docker run -d --restart=unless-stopped -p 3000:3000 --volume=F:\:/Movies --volume=G:\:/Anime --name soyo fal3n4ngel/soyo:latest
```

> **Note:** Use `--network=host` if you want `soyo.local` mDNS discovery to work across your local network bridge.

---

## ⚙️ Configuration & Settings

Open **Settings (`/config`)** in your browser to:
- Add or modify scanned media directories.
- Configure PIN lock protection for private folders.
- Enable or disable **Trending**, **Most Watched**, and **Recently Added** media rails.
- Adjust playback quality, transcoding rules, and frame extraction position.

---

## 🔒 Security & Privacy

- **100% Local**: No telemetry, no external tracking, no cloud dependencies.
- **PIN Protection**: Secure private folders or categories directly from the settings menu.

---

## 🤝 Contributors

<table>
<tr>
    <td align="center">
        <a href="https://github.com/fal3n-4ngel">
            <img src="https://avatars.githubusercontent.com/u/79042374?v=4" width="100" alt="fal3n-4ngel"/>
            <br />
            <sub><b>Adithya Krishnan</b></sub>
        </a>
    </td>
</tr>
</table>

## 📜 License
This project is open-source and available under the [MIT License](LICENSE).

Interested in improving SOYO? Contributions are welcome! Open issues, submit pull requests, or share ideas on [GitHub](https://github.com/fal3n-4ngel/SOYO). 🌟
