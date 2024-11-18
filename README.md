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

<img src="https://github.com/user-attachments/assets/67afa1ea-5d6c-479a-b04e-6c11e9f16e22" alt="Laptop view" width="800"/>


<p>
  <img src="https://github.com/user-attachments/assets/1db3e3a2-7f1f-47d1-8b98-4ecb53001377" alt="Mobile view" width="20%" align="center"/>
  <img src="https://github.com/user-attachments/assets/fd5eb887-87dc-4b41-aca4-76c74cee7c52" alt="Mobile view" width="75%" align="center"/>
</p>




  
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

Open your browser and navigate to http://{ip}:3000 (if dev) http://{ip}:8311(if prod)  or to view the website.

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
