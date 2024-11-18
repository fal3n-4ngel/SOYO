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
### Screenshots

<img src="https://github.com/user-attachments/assets/8784693b-1431-46cd-8b0e-d98147396aa4" alt="Laptop view" width="500"/>
<img src="https://github.com/user-attachments/assets/1d6fa291-4c01-4f1c-969a-7ad48e23afd7" alt="Mobile view" width="500" />
<img src="https://github.com/user-attachments/assets/71ded133-e511-4163-880a-6ba4ee883d36" alt="Mobile view" width="500" />
<img src="https://github.com/user-attachments/assets/295fdda8-6a8b-4a76-b819-a387ca6beb20" alt="Laptop view" width="500"/>

  
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
Create .env.local
```env
MOVIE_DIR=F:/
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

## Troubleshooting
Create or edit .env.local
```env
MOVIE_DIR=F:/ <- your movie directory here
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
