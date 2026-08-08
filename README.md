# SOYO — Stream On Your Own

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub](https://img.shields.io/badge/GitHub-fal3n--4ngel%2FSOYO-181717?logo=github)](https://github.com/fal3n-4ngel/SOYO)

Soyo is a privacy-first, zero-cloud media server built with Next.js. It streams your local media library (movies, series, anime) to any device on your home Wi-Fi network without requiring cloud uploads, user accounts, or external tracking.

---

## ⚡ Recent Updates & Features

- **🎨 Telescope-Inspired Design & Physics**: Featuring a modern Scandinavian minimalist design with GPU-accelerated 3D parallax floating collages (`translate3d`) and fluid sine-wave physics.
- **⚡ Ultrafast Video Streaming & Seeking Engine**:
  - Instant playback start (`-analyzeduration 1000000 -probesize 1000000`).
  - Monotonic timestamp reconstruction (`-avoid_negative_ts make_zero`) eliminating playback freezes on seek.
  - Automatic delivery selection: Direct byte streaming, remuxing (`-c copy`), or quality-tuned H.264 transcoding.
- **💬 Embedded Subtitle Extraction & Memory Caching**:
  - Automatically lists sidecars (`.vtt`, `.srt`, `.ass`) and embedded text tracks.
  - In-memory VTT caching (`vttCache`) for instantaneous subtitle loading.
- **🌐 Network Discovery & QR Panel**:
  - Automatic mDNS broadcasting (`http://soyo.local:3000`).
  - One-click copy for universal LAN IP addresses and permanent QR code scanning for phones.
- **⚙️ Config Dashboard (`/config`)**:
  - Manage network interfaces, library scan paths, transcode qualities, and PIN lock protection.

---

### Screenshots

<div align="center">
  <img src="https://github.com/user-attachments/assets/8784693b-1431-46cd-8b0e-d98147396aa4" alt="Laptop view" width="400"/>
  <img src="https://github.com/user-attachments/assets/1d6fa291-4c01-4f1c-969a-7ad48e23afd7" alt="Mobile view" width="400" />
</div>

---

## 🚀 Quick Start (Node.js)

### 1. Clone the Repository
```bash
git clone https://github.com/fal3n-4ngel/SOYO.git
cd SOYO
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Install FFmpeg
Playback of non-browser formats (MKV, HEVC, AC3) and subtitle extraction require `ffmpeg` and `ffprobe`:
```bash
winget install Gyan.FFmpeg      # Windows
brew install ffmpeg             # macOS
sudo apt install ffmpeg         # Linux
```

### 4. Run Development Server
```bash
npm run dev
```

Open `http://localhost:3000` or `http://soyo.local:3000`.

---

## 🐳 Run using Docker

```bash
docker pull fal3n4ngel/soyo:latest

# Run container mounting local drives
docker run -d --restart=unless-stopped -p 3000:3000 --volume=F:\:/Movies --volume=G:\:/Anime --name soyo fal3n4ngel/soyo:latest
```

> **Note:** Use `--network=host` if you want `soyo.local` mDNS discovery across your local network bridge.

---

## 🔒 Security & Privacy

- **100% Local**: No telemetry, no external trackings, no account creation.
- **PIN Protection**: Lock private folders or categories directly from the settings menu.

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

For support or issues, visit [https://github.com/fal3n-4ngel/SOYO](https://github.com/fal3n-4ngel/SOYO).
