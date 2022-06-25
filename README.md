# Slideshow

## Overview
This app was created for Noc kostelů Polná 2022

## Features
- 5 types of slide (image, video, iframe, text, cooldown)
- Administration
- Resource monitor
- Statistics
- Notifications
- Multiple cooldown lists
- Dark / light theme

## Dependences
- NODE.js
- NPM
- MongoDB

### Install dependences
Debian based
```markdown
sudo apt install nodejs npm
```
Arch based
```markdown
yay -S nodejs npm
```

Install MongoDB server from official website, or use cloud database like MongoDB atlas.

## Instalation

### 1) Install packages over npm

In cloned repository directory run:
```markdown
npm install
```

### 2) Change server port
Default port is 3000, you can change port in config/default.json

### 3) Create directory for content
Create directory "content" in public folder

### 4) Setup database
Setup database and collection. Described in /docs

## Run
In cloned repository directory run:
```markdown
node server.js
```

### Tip 
Install pm2, if you want run node app as daemon
<a href="https://pm2.keymetrics.io">pm2 website</a>