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

  
## Instructions to Run the Project
Clone the Repository:
```bash

git clone https://github.com/fal3n-4ngel/soyo.git
cd soyo
```
Install Dependencies:
```bash

npm install

```
Create or edit config.json
```json
{
  "movieDir": "F:/",
  "thumbnailCache": false,
  "lastAccessedMovie": null
}
```

## Run the Development Server:
```bash
npm run dev
```

## Run the Production Server:
```bash
npm run build
npm run start
```

## Access the Website: 

Open your browser and navigate to 
```bash
http://{ip}:3000   # if Development Server
``` 
```bash 
http://{ip}:8311   # if Production Server
```
 to view the website.


## Docker Support
### Prerequisites
+ Docker Desktop installed
+ Sufficient permissions to run Docker
+ Access to local video directories

### Docker Installation
Install Docker Desktop:
+ Windows/Mac: Download from Docker's official website
+ Linux: Use package manager or official Docker CE installation guides


### Build Docker Image
```
docker build -t soyo .

# Build with specific version tag
docker build -t soyo:v1.0 .
````

Run Docker Container
  ```bash
# Basic run (default F:/ drive)
docker run -d -p 3000:8311 -v F:/:/media --name soyo soyo:latest

# Custom volume mapping
docker run -d -p <port>:8311 -v /path/to/your/videos:/media --name soyo soyo:latest

# Run with auto-restart policy
docker run -d --restart=unless-stopped -p 3000:8311 -v F:/:/media --name soyo soyo:latest

  ```
### Access the Website: 

  Open your browser and navigate to 
  ```bash
  http://{ip}:<port> 
  ``` 


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
