<h1 align="center"> SOYO - Stream On Your Own </h1> 
<h1 align="center">

  <br>
  <div>
    <a href="https://github.com/fal3n-4ngel/soyo/issues">
        <img src="https://img.shields.io/github/issues/fal3n-4ngel/soyo?color=fab387&labelColor=303446&style=for-the-badge">
    </a>
    <a href="https://github.com/fal3n-4ngel/soyo/stargazers">
        <img src="https://img.shields.io/github/stars/fal3n-4ngel/soyo?color=ca9ee6&labelColor=303446&style=for-the-badge">
    </a>
    <a href="https://github.com/fal3n-4ngel/soyo">
        <img src="https://img.shields.io/github/repo-size/fal3n-4ngel/soyo?color=ea999c&labelColor=303446&style=for-the-badge">
    </a>
    <a href="https://github.com/fal3n-4ngel/soyo/LICENSE">
        <img src="https://img.shields.io/static/v1.svg?style=for-the-badge&label=License&message=MIT&logoColor=ca9ee6&colorA=313244&colorB=cba6f7"/>
    </a>
    <br>
    </div>

   </h1>

## What is SOYO?
SOYO is a Next.js web application designed to display and stream video files stored on local drives across your local network. It allows you to browse, search, and watch your media collection from any device without requiring a central cloud server.<br/>Wanted to watch animes on phone but low on storage , so proceeded to spend hours in this

## Technical Details
```
Framework: Next.js
Styling: Tailwind CSS
```

## Features
- Displays video files from configured local media directories across all devices on the local network.
- Automatic zero-configuration Docker volume discovery for mounted media folders.
- Live online torrent and magnet streaming via WebTorrent with HTTP range-request support.
- In-app verified torrent search engine with seeds/leeches counts, resolution tags, and 1-click magnet streaming.
- Local user profiles with custom avatar uploads and per-profile watch progress tracking.
- Intelligent scene filename parsing for clean movie titles, release year, resolution (1080p, 720p, 4K), and source badges.
- Curated media rails for Trending, Most Watched, and Recently Added titles with settings toggles.
- Fetches anime thumbnails from AniList API and movie posters from OMDb API with local thumbnail fallbacks.
- Hardware-accelerated 3D magnetic parallax UI with customizable theme accents.

### Screenshots

  <img src="https://github.com/user-attachments/assets/38f9e8ab-84d0-47f4-8c3c-407554401e9b" alt="Laptop view" width="400"/>
  <img src="https://github.com/user-attachments/assets/5aed4b6a-0706-4e84-bdcd-b0851717af74" alt="Mobile view" width="400" />
  <img src="https://github.com/user-attachments/assets/fe1bfb52-26b4-44f9-bd9a-51248a82df33" alt="Mobile view" width="400" />
  <img src="https://github.com/user-attachments/assets/46a754a7-e119-4d4a-b68a-86a7b80c0003" alt="Laptop view" width="400"/>

  

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
### Access the Website: 

  Open your browser and navigate to 
  ```bash
  http://{ip}:3000
  ```


## Run Using Node.js

### Clone the Repository:
```bash

git clone https://github.com/fal3n-4ngel/SOYO.git
cd SOYO
```
### Install Dependencies:
```bash

npm install

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

### Access the Website: 

Open your browser and navigate to 
```bash
http://{ip}:3000   # if Development Server
``` 
```bash 
http://{ip}:3000   # if Production Server
```
 to view the website.





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


Interested in improving Soyo? I welcome contributions! Feel free to open issues, submit pull requests, or share your ideas on GitHub. Together, we can make this project even better.
