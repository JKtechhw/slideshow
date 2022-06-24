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
- NPM
- NODE.js
- MONGODB

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

### 1) Create directory for uploaded content
```markdown
mkdir public/content
```

### 2) Create directory for uploaded content

In cloned repository directory run:
```markdown
npm install
```
Create .env file in cloned repository directory and specify CONNECTION_STRING for MongoDB and SECRET_KEY for sessions

## Run
In cloned repository directory run:
```markdown
node server.js
```


## Demo
<a href="http://slideshow.jktech.dev">Demo<a>