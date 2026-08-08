# Soyo - Stream On Your Own
## What is Soyo?
Soyo is a Next.js website designed to display video files stored on a local drive (default: F:/). The website is accessible throughout the local network, providing a convenient way to browse and view videos without needing a central server.<br/>Wanted to watch animes on phone but low on storage , so proceeded to spend hours in this

## Technical Details
```
Framework: Next.js
Styling: Tailwind CSS
```

## Features
- Displays all video files from the specified local drive.
- Accessible across devices on the same local network.
- User-friendly interface for easy navigation and viewing.
- Fetches anime thumbnails from AniList API to display cover images for videos (if available).
- Fallback to local thumbnails if no external thumbnail is found.
- Ability to fetch movie/poster images from IMDb using OMDb API for non-anime videos.

### Screenshots


  <img src="https://github.com/user-attachments/assets/8784693b-1431-46cd-8b0e-d98147396aa4" alt="Laptop view" width="400"/>
  <img src="https://github.com/user-attachments/assets/1d6fa291-4c01-4f1c-969a-7ad48e23afd7" alt="Mobile view" width="400" />
  <img src="https://github.com/user-attachments/assets/834900fc-00ad-43fb-9892-fa55fc1d6e6e" alt="Mobile view" width="400" />
  <img src="https://github.com/user-attachments/assets/2c9a0ad8-aa4e-4063-a0a8-7f14f5a3d727" alt="Laptop view" width="400"/>

  

## Run using Docker

### DockerHub Image

```bash
docker pull fal3n4ngel/soyo
```

 <h3>Prerequisites</h3>

  <ul>
    <li>Docker Desktop installed</li>
    <li>Sufficient permissions to run Docker</li>
    <li>Access to local video directories</li>
  </ul>

<details>
  <summary><strong>Custom Building</strong></summary>

<p><strong>Install Docker Desktop:</strong></p>
<ul>
  <li><strong>Windows/Mac:</strong> Download from Docker's official website</li>
  <li><strong>Linux:</strong> Use package manager or follow the official Docker CE installation guides</li>
</ul>

<p><strong>Build Docker Image</strong></p>
<pre>
<code>
docker build -t soyo .  
docker build -t soyo:v1.0 . # build with specific tag
</code>
</pre>

</details>


Run Docker Container
  ```bash
# Basic run 
docker run -d -p 3000:3000 --volume=F:/:/Movies --volume=G:/:/Anime --name soyo fal3n4ngel/soyo:latest

# Run with auto-restart policy
docker run -d --restart=unless-stopped -p 3000:3000 --volume=F:\:/Movies --volume=G:\:/Anime --name soyo fal3n4ngel/soyo:latest

  ```

> Use `--network=host` instead of `-p` if you want `soyo.local` discovery to work
> from other devices — mDNS cannot cross Docker's bridge network.

Then open **Settings → Library** in the app and add `/Movies` and `/Anime` as
media folders.
### Access the Website: 

  Open your browser and navigate to 
  ```bash
  http://{ip}:<port> 
  ```


## Run Using Node.js

### Clone the Repository:
```bash

git clone https://github.com/fal3n-4ngel/soyo.git
cd soyo
```
### Install Dependencies:
```bash

npm install

```
### Install ffmpeg

Thumbnails, subtitle extraction and playback of non-MP4 files all need `ffmpeg`
and `ffprobe` on your `PATH`.

```bash
winget install Gyan.FFmpeg      # Windows
brew install ffmpeg             # macOS
sudo apt install ffmpeg         # Debian/Ubuntu
```

### Run the Development Server:
```bash
npm run dev
```

### Run the Production Server:
```bash
npm run build
npm run start
```

Both bind to `0.0.0.0:3000`, so the server is reachable from every device on
your network. On startup it prints the exact addresses to use.

### Add your media

Open the app, go to **Settings → Library**, and pick a folder. Soyo indexes it
recursively. There is no `config.json` to edit — everything lives in `db.json`,
managed from the UI. An existing `config.json` is migrated automatically on
first run.

### Access from other devices

```bash
http://<your-lan-ip>:3000   # works everywhere, incl. Android
http://soyo.local:3000      # macOS, iOS, Windows (mDNS)
```

The home page shows both, plus a **QR code** you can scan with a phone.

<details>
<summary><b>A device on my Wi-Fi can't connect</b></summary>

Work down this list — the first two cover almost every case.

1. **Windows Firewall** blocks inbound connections to Node by default. From an
   elevated PowerShell in the project folder:
   ```bash
   npm run allow-firewall
   ```
2. **Your Wi-Fi is set to "Public"**, which blocks all LAN traffic regardless of
   firewall rules. Switch it to Private:
   ```bash
   Set-NetConnectionProfile -Name "<your network>" -NetworkCategory Private
   ```
3. **Android and Chrome don't resolve `.local` names.** Use the LAN IP or the QR
   code instead of `soyo.local`.
4. **Both devices must be on the same network** — guest Wi-Fi and "client
   isolation" on the router will block it.

**Settings → Network** shows every detected address, which one is primary,
whether the server is actually bound to your LAN, and why it might not be.
</details>





## Troubleshooting

### 1. Volume Mounting Issues
- Symptoms
  + Videos not displaying
  + Incorrect directory access
  + Permission-related errors

- Troubleshooting Steps
  ```node
  # verify the external / needed drives are mounted
  # restart the wsl ( within docker desktop )
  ```

# Contributors

<table>
<tr>
    <td align="center">
        <a href="https://github.com/fal3n-4ngel">
            <img src="https://avatars.githubusercontent.com/u/79042374?v=4" width="100;" alt="Jes-ny"/>
            <br />
            <sub><b>Adithya Krishnan</b></sub>
        </a>
    </td>
   </tr>
</table>

## License
This project is open-source and available under the MIT License.


Interested in improving Soyo? I welcome contributions! Feel free to open issues, submit pull requests, or share your ideas on GitHub. Together, we can make this project even better. 🌟
